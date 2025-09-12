/**
 * Basic Integration Test Suite
 * 
 * Simple integration tests that verify basic coordination between services
 */

import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"

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

// Create composed layers properly
const PerformanceLayer = Layer.mergeAll(BasicQueueSystemLayer, PerformanceProfilerLive)
const MemoryLayer = Layer.mergeAll(BasicQueueSystemLayer, MemoryOptimizerLive)
const CacheLayer = Layer.mergeAll(BasicQueueSystemLayer, AdvancedCacheLive)
const FullSystemLayer = Layer.mergeAll(
  StabilityQueueSystemLayer,
  PerformanceProfilerLive,
  MemoryOptimizerLive,
  AdvancedCacheLive
)

describe("Basic Integration Tests", () => {
  describe("Queue System Foundation", () => {
    it("should work with basic queue system", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        expect(typeof sessionId).toBe("string")
        
        // Test queue operations work
        const taskId = yield* queueComputationTask(
          Effect.succeed("test result"),
          { priority: 1 }
        )
        
        expect(typeof taskId).toBe("string")
        
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
        expect(status.queue).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(BasicQueueSystemLayer)))
    })
    
    it("should work with stability features", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        
        const health = yield* checkQueueHealth()
        expect(health).toBeDefined()
        expect(typeof health.healthy).toBe("boolean")
        
        // Test system health with StabilityMonitor
        const systemHealth = yield* QueueSystem.getSystemHealth()
        expect(systemHealth).toBeDefined()
        expect(typeof systemHealth.isHealthy).toBe("boolean")
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(StabilityQueueSystemLayer)))
    })
  })
  
  describe("Performance Integration", () => {
    it("should work with performance profiling", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const profiler = yield* PerformanceProfiler
        
        // Simple profiling test
        const session = yield* profiler.startProfiling("basic-test", "computation", "computation")
        yield* Effect.sleep(Duration.millis(50))
        const metrics = yield* profiler.endProfiling(session, true)
        
        expect(metrics.duration).toBeGreaterThan(40)
        expect(metrics.success).toBe(true)
        
        // Verify queue system still works
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(PerformanceLayer)))
    })
  })
  
  describe("Memory Integration", () => {
    it("should work with memory optimization", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const memoryOpt = yield* MemoryOptimizer
        
        expect(memoryOpt).toBeDefined()
        
        // Test memory-intensive operation
        const taskId = yield* queueComputationTask(
          Effect.succeed("memory task completed"),
          { isMemoryIntensive: true }
        )
        
        expect(typeof taskId).toBe("string")
        
        const health = yield* checkQueueHealth()
        expect(typeof health.healthy).toBe("boolean")
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(MemoryLayer)))
    })
  })
  
  describe("Cache Integration", () => {
    it("should work with advanced caching", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const cache = yield* AdvancedCache
        
        expect(cache).toBeDefined()
        
        // Test cacheable operations
        const fileTask = yield* queueFileOperation(
          Effect.succeed("cached file data"),
          { type: "file-read", priority: 1 }
        )
        
        expect(typeof fileTask).toBe("string")
        
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CacheLayer)))
    })
  })
  
  describe("Complete System Integration", () => {
    it("should coordinate all Phase 4 services", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        
        // Verify all services are available
        const profiler = yield* PerformanceProfiler
        const memoryOpt = yield* MemoryOptimizer
        const cache = yield* AdvancedCache
        
        expect(profiler).toBeDefined()
        expect(memoryOpt).toBeDefined()
        expect(cache).toBeDefined()
        
        // Test coordinated operation
        const session = yield* profiler.startProfiling("integration-test", "computation", "computation")
        
        // Queue different types of operations
        const tasks = []
        
        tasks.push(yield* queueFileOperation(
          Effect.succeed("file processed"),
          { type: "file-read", priority: 1 }
        ))
        
        tasks.push(yield* queueComputationTask(
          Effect.succeed("computation done"),
          { priority: 1 }
        ))
        
        expect(tasks).toHaveLength(2)
        
        yield* Effect.sleep(Duration.millis(100))
        
        const metrics = yield* profiler.endProfiling(session, true)
        expect(metrics.success).toBe(true)
        
        // System should remain healthy
        const health = yield* checkQueueHealth()
        expect(typeof health.healthy).toBe("boolean")
        
        const systemHealth = yield* QueueSystem.getSystemHealth()
        expect(systemHealth.isHealthy).toBeTruthy()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(FullSystemLayer)))
    })
  })
  
  describe("Queue Operations Integration", () => {
    it("should handle different operation types", async () => {
      const test = Effect.gen(function*() {
        const sessionId = yield* QueueSystem.initialize()
        const profiler = yield* PerformanceProfiler
        
        // Test each resource group
        const operations = []
        
        // Filesystem
        const fsSession = yield* profiler.startProfiling("fs-op", "file-read", "filesystem")
        operations.push(yield* queueFileOperation(
          Effect.succeed("file data"),
          { type: "file-read", priority: 1 }
        ))
        yield* Effect.sleep(Duration.millis(20))
        yield* profiler.endProfiling(fsSession, true)
        
        // Network
        const netSession = yield* profiler.startProfiling("net-op", "network-request", "network")
        operations.push(yield* queueNetworkOperation(
          Effect.succeed("network data"),
          { priority: 1 }
        ))
        yield* Effect.sleep(Duration.millis(20))
        yield* profiler.endProfiling(netSession, true)
        
        // Computation
        const compSession = yield* profiler.startProfiling("comp-op", "computation", "computation")
        operations.push(yield* queueComputationTask(
          Effect.succeed("computation result"),
          { priority: 1 }
        ))
        yield* Effect.sleep(Duration.millis(20))
        yield* profiler.endProfiling(compSession, true)
        
        // Memory-intensive
        const memSession = yield* profiler.startProfiling("mem-op", "data-processing", "memory-intensive")
        operations.push(yield* queueComputationTask(
          Effect.succeed("memory operation result"),
          { isMemoryIntensive: true, priority: 1 }
        ))
        yield* Effect.sleep(Duration.millis(20))
        yield* profiler.endProfiling(memSession, true)
        
        expect(operations).toHaveLength(4)
        
        // Check resource utilization
        const utilization = yield* profiler.getResourceUtilization()
        expect(Array.isArray(utilization)).toBe(true)
        expect(utilization.length).toBe(4) // All 4 resource groups
        
        const status = yield* getQueueStatus()
        expect(status).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(FullSystemLayer)))
    })
  })
})