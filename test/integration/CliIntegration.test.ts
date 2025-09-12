/**
 * CLI Integration Tests
 * 
 * Comprehensive end-to-end tests for Phase 3 CLI integration.
 * Tests queue system integration, transparent adapters, user experience
 * enhancements, and overall system reliability.
 * 
 * Phase 3.5: E2E Testing
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"
import * as TestContext from "@effect/vitest"

// System under test
import { EnhancedProductionCliLayer } from "../../src/layers/index.js"
import { TransparentQueueAdapter } from "../../src/services/Queue/TransparentQueueAdapter.js"
import { UserExperienceEnhancer } from "../../src/services/UserExperience/index.js"
import { InternalQueue } from "../../src/services/Queue/index.js"

// Test utilities
import { createTestLayer, mockFileSystem, MockFileInfo } from "../utils/testHelpers.js"

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Phase 3: CLI Integration E2E Tests", () => {
  let testLayer: Layer.Layer<never>
  
  beforeEach(() => {
    testLayer = createTestLayer()
  })
  
  afterEach(() => {
    // Cleanup after each test
  })

  // ==========================================================================
  // QUEUE SYSTEM INTEGRATION TESTS
  // ==========================================================================

  describe("Queue System Integration", () => {
    it("should initialize queue system with all components", () =>
      Effect.gen(function* () {
        const queue = yield* InternalQueue
        const metrics = yield* queue.getMetrics()
        
        // Verify queue system is initialized and healthy
        expect(metrics.isHealthy).toBe(true)
        expect(metrics.activeTasks).toBe(0)
        expect(metrics.pendingTasks).toBe(0)
        expect(metrics.completedTasks).toBeGreaterThanOrEqual(0)
        
        // Verify resource groups are configured
        expect(Object.keys(metrics.resourceGroupUtilization)).toContain("filesystem")
        expect(Object.keys(metrics.resourceGroupUtilization)).toContain("network")
        expect(Object.keys(metrics.resourceGroupUtilization)).toContain("computation")
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should handle concurrent operations across resource groups", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        const queuedNet = adapter.wrapNetworkOperations()
        
        // Start multiple operations concurrently
        const fileOp = queuedFs.listDirectory("/test")
        const networkOp = queuedNet.fetchData("https://example.com/api")
        
        // Both should complete successfully
        const results = yield* Effect.all([fileOp, networkOp], { concurrency: 2 })
        
        expect(results).toHaveLength(2)
        expect(results[0]).toBeInstanceOf(Array) // File list
        expect(typeof results[1]).toBe("string") // Network response
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should maintain queue stability under load", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // Create many concurrent operations
        const operations = Array.from({ length: 20 }, (_, i) =>
          queuedFs.readFile(`/test/file${i}.txt`)
        )
        
        const startTime = Date.now()
        const results = yield* Effect.all(operations, { concurrency: 5 })
        const endTime = Date.now()
        
        // All operations should complete
        expect(results).toHaveLength(20)
        
        // Should complete within reasonable time (with queuing)
        expect(endTime - startTime).toBeLessThan(10000) // 10 seconds max
        
        // Queue should remain healthy
        const queue = yield* InternalQueue
        const metrics = yield* queue.getMetrics()
        expect(metrics.isHealthy).toBe(true)
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // TRANSPARENT ADAPTER INTEGRATION TESTS
  // ==========================================================================

  describe("Transparent Queue Adapter", () => {
    it("should provide transparent file system operations", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // Test directory listing
        const files = yield* queuedFs.listDirectory("/test")
        expect(files).toBeInstanceOf(Array)
        expect(files.length).toBeGreaterThan(0)
        
        // Test file reading
        const content = yield* queuedFs.readFile("/test/example.txt")
        expect(typeof content).toBe("string")
        expect(content.length).toBeGreaterThan(0)
        
        // Test file writing
        yield* queuedFs.writeFile("/test/output.txt", "Test content")
        const writtenContent = yield* queuedFs.readFile("/test/output.txt")
        expect(writtenContent).toBe("Test content")
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should handle errors gracefully with proper context", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // Attempt to read non-existent file
        const result = yield* Effect.either(
          queuedFs.readFile("/nonexistent/file.txt")
        )
        
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left.message).toContain("not found")
          expect(result.left._tag).toBe("FileSystemError")
        }
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should automatically determine appropriate resource groups", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        
        // Test resource group detection
        const fsGroup = adapter.determineResourceGroup("file-read", 100)
        expect(fsGroup).toBe("filesystem")
        
        const netGroup = adapter.determineResourceGroup("http-fetch", 2000)
        expect(netGroup).toBe("network")
        
        const compGroup = adapter.determineResourceGroup("process-data", 8000)
        expect(compGroup).toBe("memory-intensive")
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // USER EXPERIENCE INTEGRATION TESTS
  // ==========================================================================

  describe("User Experience Enhancements", () => {
    it("should provide system status information", () =>
      Effect.gen(function* () {
        const ux = yield* UserExperienceEnhancer
        
        // Should not throw when showing status
        yield* ux.showSystemStatus()
        
        // Should provide optimization suggestions
        const suggestions = yield* ux.suggestOptimizations()
        expect(suggestions).toBeInstanceOf(Array)
        expect(suggestions.length).toBeGreaterThan(0)
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should create and manage progress trackers", () =>
      Effect.gen(function* () {
        const ux = yield* UserExperienceEnhancer
        
        // Create progress tracker
        const tracker = yield* ux.startProgress("Test Operation", Duration.seconds(1))
        
        // Update progress
        yield* tracker.update(50, "Halfway through")
        yield* tracker.addStep("Processing data")
        yield* tracker.update(100, "Almost done")
        yield* tracker.complete("Operation completed successfully")
        
        // Should complete without errors
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should track long-running operations with progress", () =>
      Effect.gen(function* () {
        const ux = yield* UserExperienceEnhancer
        
        const longOperation = Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(100))
          return "Long operation result"
        })
        
        const result = yield* ux.trackLongRunningOperation(
          longOperation,
          "Test Long Operation",
          { style: "spinner", showEta: true }
        )
        
        expect(result).toBe("Long operation result")
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should provide contextual explanations", () =>
      Effect.gen(function* () {
        const ux = yield* UserExperienceEnhancer
        
        const explanation = yield* ux.explainQueueBehavior("file-read")
        expect(typeof explanation).toBe("string")
        expect(explanation.length).toBeGreaterThan(50)
        expect(explanation.toLowerCase()).toContain("queue")
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // LAYER COMPOSITION INTEGRATION TESTS
  // ==========================================================================

  describe("Layer Composition", () => {
    it("should properly compose all Phase 3 layers", () =>
      Effect.gen(function* () {
        // All services should be available
        const queue = yield* InternalQueue
        const adapter = yield* TransparentQueueAdapter
        const ux = yield* UserExperienceEnhancer
        
        // Services should be properly initialized
        expect(queue).toBeDefined()
        expect(adapter).toBeDefined()
        expect(ux).toBeDefined()
        
        // Services should be interconnected
        const metrics = yield* queue.getMetrics()
        expect(metrics.isHealthy).toBe(true)
      }).pipe(
        Effect.provide(EnhancedProductionCliLayer),
        TestContext.it
      )
    )

    it("should handle service dependencies correctly", () =>
      Effect.gen(function* () {
        // TransparentQueueAdapter should depend on InternalQueue
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // This operation should go through the queue
        const startTime = Date.now()
        const files = yield* queuedFs.listDirectory("/test")
        const endTime = Date.now()
        
        expect(files).toBeInstanceOf(Array)
        
        // Verify the queue was used (there should be some processing time)
        expect(endTime - startTime).toBeGreaterThan(0)
        
        // UserExperienceEnhancer should also depend on queue
        const ux = yield* UserExperienceEnhancer
        yield* ux.showSystemStatus() // Should not throw
      }).pipe(
        Effect.provide(EnhancedProductionCliLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // ERROR HANDLING AND RECOVERY TESTS
  // ==========================================================================

  describe("Error Handling and Recovery", () => {
    it("should handle queue system failures gracefully", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // Attempt operations that might fail
        const results = yield* Effect.all([
          Effect.either(queuedFs.readFile("/nonexistent.txt")),
          Effect.either(queuedFs.listDirectory("/invalid/path")),
          queuedFs.readFile("/test/example.txt") // This should succeed
        ])
        
        // First two should be errors, third should succeed
        expect(results[0]._tag).toBe("Left")
        expect(results[1]._tag).toBe("Left")
        expect(typeof results[2]).toBe("string")
        
        // Queue should remain healthy despite errors
        const queue = yield* InternalQueue
        const metrics = yield* queue.getMetrics()
        expect(metrics.isHealthy).toBe(true)
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should provide meaningful error context", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        const result = yield* Effect.either(
          queuedFs.readFile("/nonexistent/deeply/nested/file.txt")
        )
        
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("FileSystemError")
          expect(result.left.path).toBe("/nonexistent/deeply/nested/file.txt")
        }
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // PERFORMANCE AND SCALABILITY TESTS
  // ==========================================================================

  describe("Performance and Scalability", () => {
    it("should handle high-frequency operations efficiently", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        const startTime = Date.now()
        
        // Perform many quick operations
        const operations = Array.from({ length: 50 }, (_, i) =>
          queuedFs.listDirectory(`/test/dir${i % 5}`)
        )
        
        yield* Effect.all(operations, { concurrency: 10 })
        
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        // Should complete within reasonable time
        expect(totalTime).toBeLessThan(5000) // 5 seconds max
        
        // Average time per operation should be reasonable
        const avgTime = totalTime / 50
        expect(avgTime).toBeLessThan(100) // 100ms per operation max
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )

    it("should maintain consistent performance under sustained load", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const queuedFs = adapter.wrapFileSystem()
        
        // Run sustained operations
        const rounds = 3
        const operationsPerRound = 20
        const roundTimes: number[] = []
        
        for (let round = 0; round < rounds; round++) {
          const startTime = Date.now()
          
          const operations = Array.from({ length: operationsPerRound }, (_, i) =>
            queuedFs.readFile(`/test/file${i % 10}.txt`)
          )
          
          yield* Effect.all(operations, { concurrency: 5 })
          
          const endTime = Date.now()
          roundTimes.push(endTime - startTime)
          
          // Brief pause between rounds
          yield* Effect.sleep(Duration.millis(100))
        }
        
        // Performance should not degrade significantly across rounds
        const firstRoundTime = roundTimes[0]
        const lastRoundTime = roundTimes[rounds - 1]
        
        // Last round should not be more than 50% slower than first
        expect(lastRoundTime).toBeLessThan(firstRoundTime * 1.5)
      }).pipe(
        Effect.provide(testLayer),
        TestContext.it
      )
    )
  })

  // ==========================================================================
  // INTEGRATION COMPLETENESS TESTS
  // ==========================================================================

  describe("Phase 3 Integration Completeness", () => {
    it("should have all Phase 3 components integrated", () =>
      Effect.gen(function* () {
        // Phase 3.1: Queue Command (tested via queue operations)
        const queue = yield* InternalQueue
        expect(queue).toBeDefined()
        
        // Phase 3.2: Transparent Queue Adapter
        const adapter = yield* TransparentQueueAdapter
        expect(adapter).toBeDefined()
        expect(typeof adapter.wrapFileSystem).toBe("function")
        expect(typeof adapter.wrapNetworkOperations).toBe("function")
        expect(typeof adapter.wrapComputationOperations).toBe("function")
        
        // Phase 3.3: CLI Layer Integration (tested via layer composition)
        // Already verified by the fact that we can access all services
        
        // Phase 3.4: User Experience Enhancement
        const ux = yield* UserExperienceEnhancer
        expect(ux).toBeDefined()
        expect(typeof ux.startProgress).toBe("function")
        expect(typeof ux.showSystemStatus).toBe("function")
        expect(typeof ux.suggestOptimizations).toBe("function")
        
        // Integration test: All components should work together
        const queuedFs = adapter.wrapFileSystem()
        const files = yield* queuedFs.listDirectory("/test")
        
        const tracker = yield* ux.startProgress("Integration Test")
        yield* tracker.update(100)
        yield* tracker.complete("All Phase 3 components working together")
        
        expect(files).toBeInstanceOf(Array)
      }).pipe(
        Effect.provide(EnhancedProductionCliLayer),
        TestContext.it
      )
    )

    it("should demonstrate complete transparent integration", () =>
      Effect.gen(function* () {
        const adapter = yield* TransparentQueueAdapter
        const ux = yield* UserExperienceEnhancer
        
        // User should not see any difference between queued and direct operations
        const queuedFs = adapter.wrapFileSystem()
        
        // Start progress tracking
        const result = yield* ux.trackLongRunningOperation(
          Effect.gen(function* () {
            const files = yield* queuedFs.listDirectory("/test")
            const content = yield* queuedFs.readFile("/test/example.txt")
            yield* queuedFs.writeFile("/test/integration-test.txt", "Integration test successful")
            return { files, content }
          }),
          "Complete integration test",
          { style: "bar", showSteps: true }
        )
        
        expect(result.files).toBeInstanceOf(Array)
        expect(typeof result.content).toBe("string")
        
        // Verify the write operation worked
        const writtenContent = yield* queuedFs.readFile("/test/integration-test.txt")
        expect(writtenContent).toBe("Integration test successful")
        
        // System should provide helpful feedback
        const suggestions = yield* ux.suggestOptimizations()
        expect(suggestions.length).toBeGreaterThan(0)
      }).pipe(
        Effect.provide(EnhancedProductionCliLayer),
        TestContext.it
      )
    )
  })
})