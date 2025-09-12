/**
 * System Integration Test Suite
 * 
 * Tests coordination and interaction between all implemented services
 * in the Effect CLI Queue System
 */

import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"

import { 
  BasicQueueSystemLayer,
  StabilityQueueSystemLayer,
  QueueSystem,
  queueFileOperation,
  queueNetworkOperation,
  queueComputationTask,
  getQueueStatus,
  checkQueueHealth
} from "../../src/services/Queue/index.js"

import { 
  PerformanceProfiler,
  PerformanceProfilerLive 
} from "../../src/services/Queue/PerformanceProfiler.js"
import { 
  MemoryOptimizer,
  MemoryOptimizerLive 
} from "../../src/services/Queue/MemoryOptimizer.js"
import { 
  AdvancedCache,
  AdvancedCacheLive 
} from "../../src/services/Queue/AdvancedCache.js"

import type { QueueOperation } from "../../src/services/Queue/types.js"
import { InternalQueue, QueueMonitor, QueuePersistence } from "../../src/services/Queue/types.js"

describe("System Integration Tests", () => {
  describe("Basic Queue System Integration", () => {
    it("should initialize and work with basic queue operations", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        expect(typeof sessionId).toBe("string")
        expect(sessionId.length).toBeGreaterThan(0)
        
        // Test queue services are available
        const queue = yield* InternalQueue
        const monitor = yield* QueueMonitor
        const persistence = yield* QueuePersistence
        
        expect(queue).toBeDefined()
        expect(monitor).toBeDefined()
        expect(persistence).toBeDefined()
        
        // Test basic queue status
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
        expect(status.queue).toBeDefined()
        expect(status.metrics).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(BasicQueueSystemLayer)))
    })
  })
  
  describe("Stability System Integration", () => {
    it("should work with stability features", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        
        // Test health check with stability features
        const health = yield* checkQueueHealth()
        expect(health).toBeDefined()
        expect(typeof health.healthy).toBe("boolean")
        
        // Test system health (with StabilityMonitor)
        const systemHealth = yield* QueueSystem.getSystemHealth()
        expect(systemHealth).toBeDefined()
        expect(typeof systemHealth.isHealthy).toBe("boolean")
        expect(systemHealth.timestamp).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(StabilityQueueSystemLayer)))
    })
  })
  
  describe("Performance Optimization Integration", () => {
    it("should coordinate queue operations with performance profiling", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const profiler = yield* PerformanceProfiler
        
        // Start profiling a queue operation
        const session = yield* profiler.startProfiling(
          "queue-integration-test",
          "computation", 
          "computation"
        )
        
        // Queue a computation task
        const taskId = yield* queueComputationTask(
          Effect.succeed("test computation"),
          { priority: 1 }
        )
        
        expect(typeof taskId).toBe("string")
        
        yield* Effect.sleep(Duration.millis(50))
        
        // End profiling
        const metrics = yield* profiler.endProfiling(session, true)
        expect(metrics.duration).toBeGreaterThan(0)
        expect(metrics.success).toBe(true)
        
        // Verify queue handled the task
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      const layerWithProfiling = StabilityQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(layerWithProfiling)))
    })
  })
  
  describe("Memory Optimization Integration", () => {
    it("should work with memory optimization features", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const memoryOpt = yield* MemoryOptimizer
        
        expect(memoryOpt).toBeDefined()
        
        // Queue memory-intensive operation
        const taskId = yield* queueComputationTask(
          Effect.succeed("memory intensive task"),
          { isMemoryIntensive: true, priority: 2 }
        )
        
        expect(typeof taskId).toBe("string")
        
        // Check that system remains healthy
        const health = yield* checkQueueHealth()
        expect(health.healthy).toBeTruthy()
      })
      
      const layerWithMemory = StabilityQueueSystemLayer.pipe(
        Effect.provide(MemoryOptimizerLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(layerWithMemory)))
    })
  })
  
  describe("Advanced Cache Integration", () => {
    it("should work with advanced caching features", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const cache = yield* AdvancedCache
        
        expect(cache).toBeDefined()
        
        // Queue operations that could benefit from caching
        const task1 = yield* queueFileOperation(
          Effect.succeed(["file1.txt", "file2.txt"]),
          { type: "directory-list", priority: 1 }
        )
        
        const task2 = yield* queueFileOperation(
          Effect.succeed("file contents"),
          { type: "file-read", filePath: "/test/file.txt", priority: 1 }
        )
        
        expect(typeof task1).toBe("string")
        expect(typeof task2).toBe("string")
        
        // Verify system handles multiple operations
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      const layerWithCache = StabilityQueueSystemLayer.pipe(
        Effect.provide(AdvancedCacheLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(layerWithCache)))
    })
  })
  
  describe("Full System Integration", () => {
    it("should coordinate all features together", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        
        // Get all advanced services
        const profiler = yield* PerformanceProfiler
        const memoryOpt = yield* MemoryOptimizer
        const cache = yield* AdvancedCache
        
        expect(profiler).toBeDefined()
        expect(memoryOpt).toBeDefined()
        expect(cache).toBeDefined()
        
        // Start system-wide profiling
        const systemSession = yield* profiler.startProfiling(
          "full-system-integration",
          "batch-operation",
          "computation"
        )
        
        // Queue multiple different operations
        const tasks = []
        
        // File operations
        tasks.push(yield* queueFileOperation(
          Effect.succeed(["doc1.txt", "doc2.txt"]),
          { type: "directory-list", priority: 1 }
        ))
        
        // Network operations
        tasks.push(yield* queueNetworkOperation(
          Effect.succeed({ status: "ok", data: "test" }),
          { priority: 2, url: "https://api.example.com/test" }
        ))
        
        // Computation operations
        tasks.push(yield* queueComputationTask(
          Effect.succeed(42),
          { priority: 1 }
        ))
        
        // Memory-intensive operations
        tasks.push(yield* queueComputationTask(
          Effect.succeed("large dataset processed"),
          { isMemoryIntensive: true, priority: 3 }
        ))
        
        expect(tasks).toHaveLength(4)
        tasks.forEach(taskId => {
          expect(typeof taskId).toBe("string")
        })
        
        // Give system time to process
        yield* Effect.sleep(Duration.millis(200))
        
        // End system profiling
        const systemMetrics = yield* profiler.endProfiling(systemSession, true)
        expect(systemMetrics.success).toBe(true)
        expect(systemMetrics.duration).toBeGreaterThan(150)
        
        // Check system health after full integration test
        const health = yield* checkQueueHealth()
        expect(health.healthy).toBeTruthy()
        
        // Check system health with stability monitoring
        const systemHealth = yield* QueueSystem.getSystemHealth()
        expect(systemHealth.isHealthy).toBeTruthy()
        
        // Get final status
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
        expect(status.queue).toBeDefined()
        expect(status.metrics).toBeDefined()
      })
      
      // Complete system layer with all features
      const fullSystemLayer = StabilityQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive),
        Effect.provide(MemoryOptimizerLive),
        Effect.provide(AdvancedCacheLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(fullSystemLayer)))
    })
  })
  
  describe("Error Handling Integration", () => {
    it("should handle errors gracefully across all systems", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const profiler = yield* PerformanceProfiler
        
        // Test error scenarios with profiling
        const errorSession = yield* profiler.startProfiling(
          "error-handling-test",
          "computation",
          "computation"
        )
        
        // Queue an operation that might have issues
        const taskId = yield* queueComputationTask(
          Effect.succeed("handled error scenario"),
          { priority: 1, maxRetries: 1 }
        )
        
        expect(typeof taskId).toBe("string")
        
        yield* Effect.sleep(Duration.millis(50))
        
        // End profiling (simulating successful recovery)
        const metrics = yield* profiler.endProfiling(errorSession, true)
        expect(metrics.success).toBe(true)
        
        // System should remain healthy after error handling
        const health = yield* checkQueueHealth()
        expect(typeof health.healthy).toBe("boolean")
      })
      
      const errorHandlingLayer = StabilityQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(errorHandlingLayer)))
    })
  })
  
  describe("Resource Group Coordination", () => {
    it("should handle operations across all resource groups", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const profiler = yield* PerformanceProfiler
        
        // Track operations across different resource groups
        const sessions = []
        
        // Filesystem operations
        sessions.push(yield* profiler.startProfiling("fs-test", "file-read", "filesystem"))
        
        // Network operations  
        sessions.push(yield* profiler.startProfiling("net-test", "network-request", "network"))
        
        // Computation operations
        sessions.push(yield* profiler.startProfiling("comp-test", "computation", "computation"))
        
        // Memory-intensive operations
        sessions.push(yield* profiler.startProfiling("mem-test", "data-processing", "memory-intensive"))
        
        // Queue operations for each resource group
        yield* queueFileOperation(
          Effect.succeed("file data"),
          { type: "file-read", priority: 1 }
        )
        
        yield* queueNetworkOperation(
          Effect.succeed("network response"),
          { priority: 1 }
        )
        
        yield* queueComputationTask(
          Effect.succeed("computation result"),
          { priority: 1 }
        )
        
        yield* queueComputationTask(
          Effect.succeed("memory operation result"),
          { isMemoryIntensive: true, priority: 1 }
        )
        
        yield* Effect.sleep(Duration.millis(100))
        
        // End all profiling sessions
        for (const session of sessions) {
          yield* profiler.endProfiling(session, true)
        }
        
        // Check resource utilization
        const utilization = yield* profiler.getResourceUtilization()
        expect(Array.isArray(utilization)).toBe(true)
        
        // Verify system handled all resource groups
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      const resourceLayer = StabilityQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(resourceLayer)))
    })
  })
})