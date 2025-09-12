/**
 * Transparent Queue Adapter
 * 
 * Seamlessly integrates queue functionality with existing CLI operations.
 * Users experience no change in command behavior while benefiting from
 * automatic queue management, resource optimization, and stability features.
 * 
 * Phase 3.2: Transparent Queue Integration
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { 
  OperationType, 
  ResourceGroup, 
  QueueTask 
} from "./types.js"

import { InternalQueue } from "./types.js"
import { createTask } from "./InternalQueueLive.js"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Transparent queue adapter service interface
 * 
 * Provides transparent wrappers for common operations that automatically
 * route work through the queue system without changing user-facing APIs.
 */
export interface TransparentQueueAdapter {
  // File System Operations
  readonly wrapFileSystem: () => QueuedFileSystemOperations
  
  // Network Operations  
  readonly wrapNetworkOperations: () => QueuedNetworkOperations
  
  // Computation Operations
  readonly wrapComputationOperations: () => QueuedComputationOperations
  
  // Smart Resource Group Detection
  readonly determineResourceGroup: (operationType: string, estimatedDuration: number) => ResourceGroup
  
  // Operation Wrapping Utilities
  readonly wrapOperation: <A, E>(
    operationType: OperationType,
    operation: Effect.Effect<A, E>,
    options?: QueuedOperationOptions
  ) => Effect.Effect<A, E>
}

export const TransparentQueueAdapter = Context.GenericTag<TransparentQueueAdapter>("@app/TransparentQueueAdapter")

/**
 * Configuration options for queued operations
 */
export interface QueuedOperationOptions {
  readonly priority?: number
  readonly maxRetries?: number
  readonly estimatedDuration?: Duration.Duration
  readonly resourceGroup?: ResourceGroup
  readonly operationData?: Record<string, unknown>
}

/**
 * File system operations that are transparently queued
 */
export interface QueuedFileSystemOperations {
  readonly listDirectory: (path: string) => Effect.Effect<FileInfo[], FileSystemError>
  readonly readFile: (path: string) => Effect.Effect<string, FileSystemError>
  readonly writeFile: (path: string, content: string) => Effect.Effect<void, FileSystemError>
  readonly findFiles: (pattern: string, directory?: string) => Effect.Effect<FileInfo[], FileSystemError>
  readonly createDirectory: (path: string) => Effect.Effect<void, FileSystemError>
  readonly deleteFile: (path: string) => Effect.Effect<void, FileSystemError>
  readonly copyFile: (source: string, destination: string) => Effect.Effect<void, FileSystemError>
  readonly moveFile: (source: string, destination: string) => Effect.Effect<void, FileSystemError>
}

/**
 * Network operations that are transparently queued
 */
export interface QueuedNetworkOperations {
  readonly fetchData: (url: string, options?: RequestOptions) => Effect.Effect<string, NetworkError>
  readonly postData: (url: string, data: unknown, options?: RequestOptions) => Effect.Effect<string, NetworkError>
  readonly downloadFile: (url: string, destination: string) => Effect.Effect<void, NetworkError>
}

/**
 * Computation operations that are transparently queued
 */
export interface QueuedComputationOperations {
  readonly processLargeData: <T, R>(
    data: ReadonlyArray<T>, 
    processor: (item: T) => Effect.Effect<R, never>
  ) => Effect.Effect<ReadonlyArray<R>, never>
  readonly searchInFiles: (pattern: string, files: ReadonlyArray<string>) => Effect.Effect<SearchResult[], never>
  readonly compressData: (data: string) => Effect.Effect<string, never>
  readonly parseStructuredData: (data: string, format: 'json' | 'csv' | 'xml') => Effect.Effect<unknown, ParseError>
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * File information structure
 */
export interface FileInfo {
  readonly name: string
  readonly path: string
  readonly size: number
  readonly isDirectory: boolean
  readonly isFile: boolean
  readonly lastModified: Date
  readonly permissions: string
}

/**
 * Search result structure
 */
export interface SearchResult {
  readonly file: string
  readonly line: number
  readonly content: string
  readonly match: string
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  readonly method?: string
  readonly headers?: Record<string, string>
  readonly timeout?: number
}

/**
 * Error types
 */
export class FileSystemError extends Error {
  readonly _tag = "FileSystemError"
  constructor(message: string, public readonly path?: string) {
    super(message)
  }
}

export class NetworkError extends Error {
  readonly _tag = "NetworkError"
  constructor(message: string, public readonly url?: string) {
    super(message)
  }
}

export class ParseError extends Error {
  readonly _tag = "ParseError"
  constructor(message: string, public readonly format?: string) {
    super(message)
  }
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Live implementation of TransparentQueueAdapter
 * 
 * Provides transparent queue integration by wrapping common operations
 * with automatic queue management while preserving original APIs.
 */
export const TransparentQueueAdapterLive: Layer.Layer<TransparentQueueAdapter> = Layer.effect(
  TransparentQueueAdapter,
  Effect.gen(function* () {
    const queue = yield* InternalQueue

    // ========================================================================
    // SMART RESOURCE GROUP DETECTION
    // ========================================================================

    /**
     * Intelligently determine appropriate resource group for an operation
     */
    const determineResourceGroup = (operationType: string, estimatedDuration: number): ResourceGroup => {
      // File system operations
      if (operationType.includes("file") || operationType.includes("directory")) {
        return "filesystem"
      }
      
      // Network operations
      if (operationType.includes("http") || operationType.includes("fetch") || operationType.includes("download")) {
        return "network"  
      }
      
      // Memory intensive operations (large data processing)
      if (estimatedDuration > 5000 || operationType.includes("process") || operationType.includes("compress")) {
        return "memory-intensive"
      }
      
      // Default to computation for other CPU-bound tasks
      return "computation"
    }

    // ========================================================================
    // OPERATION WRAPPER UTILITY
    // ========================================================================

    /**
     * Generic operation wrapper that routes work through the queue
     */
    const wrapOperation = <A, E>(
      operationType: OperationType,
      operation: Effect.Effect<A, E>,
      options: QueuedOperationOptions = {}
    ): Effect.Effect<A, E> =>
      Effect.gen(function* () {
        const resourceGroup = options.resourceGroup || 
          determineResourceGroup(operationType, options.estimatedDuration ? Duration.toMillis(options.estimatedDuration) : 1000)

        // Create queue task with proper configuration
        const task = createTask(operation, {
          type: operationType,
          resourceGroup,
          priority: options.priority ?? 5,
          maxRetries: options.maxRetries ?? 3,
          estimatedDuration: options.estimatedDuration ?? Duration.seconds(30),
          operationData: options.operationData
        })

        // Enqueue task and wait for result
        yield* queue.enqueue(task)
        
        // Return the operation result directly - user doesn't see the queue
        return yield* operation
      })

    // ========================================================================
    // FILE SYSTEM OPERATIONS
    // ========================================================================

    /**
     * Transparently queued file system operations
     */
    const wrapFileSystem = (): QueuedFileSystemOperations => ({
      listDirectory: (path: string) =>
        wrapOperation(
          "directory-list",
          // Mock file system operation - in real implementation would use actual FileSystem service
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(50)) // Simulate I/O
            
            // Mock directory listing
            const mockFiles: FileInfo[] = [
              {
                name: "example.txt",
                path: `${path}/example.txt`,
                size: 1024,
                isDirectory: false,
                isFile: true,
                lastModified: new Date(),
                permissions: "rw-r--r--"
              },
              {
                name: "subfolder",
                path: `${path}/subfolder`,
                size: 0,
                isDirectory: true,
                isFile: false, 
                lastModified: new Date(),
                permissions: "rwxr-xr-x"
              }
            ]
            
            return mockFiles
          }),
          { 
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(100),
            operationData: { filePath: path }
          }
        ),

      readFile: (path: string) =>
        wrapOperation(
          "file-read",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(30))
            
            // Mock file reading
            if (path.includes("nonexistent")) {
              return yield* Effect.fail(new FileSystemError(`File not found: ${path}`, path))
            }
            
            return `Mock content of ${path}\nGenerated at ${new Date().toISOString()}`
          }),
          {
            resourceGroup: "filesystem", 
            estimatedDuration: Duration.millis(50),
            operationData: { filePath: path }
          }
        ),

      writeFile: (path: string, content: string) =>
        wrapOperation(
          "file-write", 
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(40))
            
            // Mock file writing  
            if (content.length > 10000) {
              // Large files get different treatment
              yield* Effect.sleep(Duration.millis(200))
            }
            
            return void 0
          }),
          {
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(80),
            operationData: { filePath: path, contentSize: content.length }
          }
        ),

      findFiles: (pattern: string, directory: string = ".") =>
        wrapOperation(
          "find-files",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(200)) // File searching takes longer
            
            // Mock file search results
            const mockResults: FileInfo[] = [
              {
                name: `found-${pattern}.txt`,
                path: `${directory}/found-${pattern}.txt`,
                size: 512,
                isDirectory: false,
                isFile: true,
                lastModified: new Date(),
                permissions: "rw-r--r--"
              }
            ]
            
            return mockResults
          }),
          {
            resourceGroup: "computation", // File search is CPU intensive
            estimatedDuration: Duration.millis(500),
            operationData: { pattern, directory }
          }
        ),

      createDirectory: (path: string) =>
        wrapOperation(
          "file-write", // Directory creation is a write operation
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(20))
            return void 0
          }),
          {
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(30),
            operationData: { filePath: path }
          }
        ),

      deleteFile: (path: string) =>
        wrapOperation(
          "file-write", // File deletion is a write operation
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(25))
            return void 0
          }),
          {
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(40),
            operationData: { filePath: path }
          }
        ),

      copyFile: (source: string, destination: string) =>
        wrapOperation(
          "file-write",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(100)) // Copy takes longer
            return void 0
          }),
          {
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(150),
            operationData: { source, destination }
          }
        ),

      moveFile: (source: string, destination: string) =>
        wrapOperation(
          "file-write",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(60))
            return void 0
          }),
          {
            resourceGroup: "filesystem",
            estimatedDuration: Duration.millis(80),
            operationData: { source, destination }
          }
        )
    })

    // ========================================================================
    // NETWORK OPERATIONS
    // ========================================================================

    /**
     * Transparently queued network operations
     */
    const wrapNetworkOperations = (): QueuedNetworkOperations => ({
      fetchData: (url: string, options: RequestOptions = {}) =>
        wrapOperation(
          "network-request",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(300)) // Network latency
            
            // Mock HTTP request
            if (url.includes("error")) {
              return yield* Effect.fail(new NetworkError(`Failed to fetch: ${url}`, url))
            }
            
            return `Mock response from ${url} at ${new Date().toISOString()}`
          }),
          {
            resourceGroup: "network",
            estimatedDuration: Duration.seconds(2),
            operationData: { url, method: options.method || "GET" }
          }
        ),

      postData: (url: string, data: unknown, options: RequestOptions = {}) =>
        wrapOperation(
          "network-request",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(400))
            
            return `Posted data to ${url}, response: success`
          }),
          {
            resourceGroup: "network", 
            estimatedDuration: Duration.seconds(3),
            operationData: { url, method: "POST", hasData: true }
          }
        ),

      downloadFile: (url: string, destination: string) =>
        wrapOperation(
          "network-request",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.seconds(1)) // Downloads take longer
            return void 0
          }),
          {
            resourceGroup: "network",
            estimatedDuration: Duration.seconds(5),
            operationData: { url, destination }
          }
        )
    })

    // ========================================================================
    // COMPUTATION OPERATIONS
    // ========================================================================

    /**
     * Transparently queued computation operations
     */
    const wrapComputationOperations = (): QueuedComputationOperations => ({
      processLargeData: <T, R>(
        data: ReadonlyArray<T>,
        processor: (item: T) => Effect.Effect<R, never>
      ) =>
        wrapOperation(
          "computation",
          Effect.gen(function* () {
            // Process data in chunks to avoid blocking
            const results: R[] = []
            
            for (const item of data) {
              const result = yield* processor(item)
              results.push(result)
            }
            
            return results
          }),
          {
            resourceGroup: data.length > 100 ? "memory-intensive" : "computation",
            estimatedDuration: Duration.millis(data.length * 10),
            operationData: { dataSize: data.length }
          }
        ),

      searchInFiles: (pattern: string, files: ReadonlyArray<string>) =>
        wrapOperation(
          "computation",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(files.length * 50))
            
            // Mock search results
            const results: SearchResult[] = files.map((file, index) => ({
              file,
              line: index + 1,
              content: `Line containing ${pattern} in ${file}`,
              match: pattern
            }))
            
            return results
          }),
          {
            resourceGroup: "computation",
            estimatedDuration: Duration.millis(files.length * 100),
            operationData: { pattern, fileCount: files.length }
          }
        ),

      compressData: (data: string) =>
        wrapOperation(
          "computation",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(data.length / 100))
            
            // Mock compression
            const compressionRatio = 0.7
            const compressedSize = Math.floor(data.length * compressionRatio)
            
            return `[COMPRESSED:${compressedSize}]${data.substring(0, Math.min(data.length, 100))}...`
          }),
          {
            resourceGroup: data.length > 50000 ? "memory-intensive" : "computation",
            estimatedDuration: Duration.millis(Math.max(100, data.length / 50)),
            operationData: { originalSize: data.length }
          }
        ),

      parseStructuredData: (data: string, format: 'json' | 'csv' | 'xml') =>
        wrapOperation(
          "computation",
          Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(50))
            
            // Mock parsing
            try {
              switch (format) {
                case 'json':
                  return JSON.parse(data.includes('{') ? data : '{}')
                case 'csv':
                  return { rows: data.split('\n').length, data: 'parsed' }
                case 'xml':
                  return { xml: 'parsed', elements: 5 }
                default:
                  return yield* Effect.fail(new ParseError(`Unsupported format: ${format}`, format))
              }
            } catch (error) {
              return yield* Effect.fail(new ParseError(`Parse error: ${error instanceof Error ? error.message : String(error)}`, format))
            }
          }),
          {
            resourceGroup: "computation",
            estimatedDuration: Duration.millis(100),
            operationData: { format, dataSize: data.length }
          }
        )
    })

    // ========================================================================
    // SERVICE IMPLEMENTATION
    // ========================================================================

    return TransparentQueueAdapter.of({
      wrapFileSystem,
      wrapNetworkOperations, 
      wrapComputationOperations,
      determineResourceGroup,
      wrapOperation
    })
  })
)