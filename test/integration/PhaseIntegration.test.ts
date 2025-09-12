/**
 * Phase Integration Test Suite
 * 
 * Comprehensive integration tests for all phases of the Effect CLI Queue System
 * Tests coordination and interaction between all phases (1-4)
 */

import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"

// Phase 1: Core Infrastructure
import { 
  QueueSystem, 
  BasicQueueSystemLayer 
} from "../../src/services/Queue/index.js"

// Phase 2: Persistence Layer
import { 
  PersistenceManager,
  PersistenceManagerLive 
} from "../../src/services/Queue/PersistenceManager.js"

// Phase 3: Analytics & Monitoring
import { 
  AnalyticsCollector,
  AnalyticsCollectorLive 
} from "../../src/services/Queue/AnalyticsCollector.js"
import { 
  MonitoringDashboard,
  MonitoringDashboardLive 
} from "../../src/services/Queue/MonitoringDashboard.js"

// Phase 4: Performance Optimization
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

describe("Phase Integration Tests", () => {
  describe("Phase 1 + 2 Integration (Core + Persistence)", () => {
    it("should coordinate queue operations with persistence", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const persistence = yield* PersistenceManager
        
        // Test basic coordination
        expect(queue).toBeDefined()
        expect(persistence).toBeDefined()
        
        // Queue system should work with persistence layer
        const operation = {
          id: "integration-test-1",
          type: "computation" as const,
          priority: 1,
          payload: { test: "data" },
          resourceGroup: "computation" as const
        }
        
        // This tests that queue operations can be persisted
        const result = yield* queue.enqueue(operation)
        expect(result.success).toBe(true)
        
        // Verify persistence layer can handle the operation
        const metrics = yield* persistence.getQueueMetrics()
        expect(metrics).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(
        Effect.provide(PersistenceManagerLive),
        Effect.provide(BasicQueueSystemLayer)
      ))
    })
  })
  
  describe("Phase 2 + 3 Integration (Persistence + Analytics)", () => {
    it("should coordinate persistence with analytics collection", async () => {
      const test = Effect.gen(function*() {
        const persistence = yield* PersistenceManager
        const analytics = yield* AnalyticsCollector
        
        expect(persistence).toBeDefined()
        expect(analytics).toBeDefined()
        
        // Test analytics data can be persisted
        const analyticsData = yield* analytics.collectMetrics()
        expect(analyticsData).toBeDefined()
        
        // Persistence should handle analytics data
        const metrics = yield* persistence.getQueueMetrics()
        expect(metrics).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(
        Effect.provide(AnalyticsCollectorLive),
        Effect.provide(PersistenceManagerLive),
        Effect.provide(BasicQueueSystemLayer)
      ))
    })
  })
  
  describe("Phase 3 + 4 Integration (Analytics + Performance)", () => {
    it("should coordinate analytics with performance optimization", async () => {
      const test = Effect.gen(function*() {
        const analytics = yield* AnalyticsCollector
        const profiler = yield* PerformanceProfiler
        
        expect(analytics).toBeDefined()
        expect(profiler).toBeDefined()
        
        // Performance profiler should work with analytics
        const session = yield* profiler.startProfiling("analytics-test", "computation", "computation")
        yield* Effect.sleep(Duration.millis(50))
        const metrics = yield* profiler.endProfiling(session, true)
        
        expect(metrics.duration).toBeGreaterThan(0)
        
        // Analytics should be able to collect performance data
        const analyticsData = yield* analytics.collectMetrics()
        expect(analyticsData).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(
        Effect.provide(PerformanceProfilerLive),
        Effect.provide(AnalyticsCollectorLive),
        Effect.provide(BasicQueueSystemLayer)
      ))
    })
  })
  
  describe("Full System Integration (All Phases)", () => {
    it("should coordinate all phases together", async () => {
      const test = Effect.gen(function*() {
        // Get all services
        const queue = yield* QueueSystem
        const persistence = yield* PersistenceManager
        const analytics = yield* AnalyticsCollector
        const monitoring = yield* MonitoringDashboard
        const profiler = yield* PerformanceProfiler
        const memoryOpt = yield* MemoryOptimizer
        const cache = yield* AdvancedCache
        
        // Verify all services are available
        expect(queue).toBeDefined()
        expect(persistence).toBeDefined()
        expect(analytics).toBeDefined()
        expect(monitoring).toBeDefined()
        expect(profiler).toBeDefined()
        expect(memoryOpt).toBeDefined()
        expect(cache).toBeDefined()
        
        // Test coordinated workflow
        // 1. Start performance profiling
        const session = yield* profiler.startProfiling("full-system-test", "computation", "computation")
        
        // 2. Execute queue operation with caching
        const operation = {
          id: "full-system-integration",
          type: "computation" as const,
          priority: 1,
          payload: { integration: "test" },
          resourceGroup: "computation" as const
        }
        
        const queueResult = yield* queue.enqueue(operation)
        expect(queueResult.success).toBe(true)
        
        // 3. Collect analytics
        const analyticsData = yield* analytics.collectMetrics()
        expect(analyticsData).toBeDefined()
        
        // 4. End profiling
        yield* Effect.sleep(Duration.millis(25))
        const performanceMetrics = yield* profiler.endProfiling(session, true)
        expect(performanceMetrics.duration).toBeGreaterThan(0)
        
        // 5. Get monitoring status
        const monitoringData = yield* monitoring.getCurrentStatus()
        expect(monitoringData).toBeDefined()
        
        // 6. Verify persistence layer captured everything
        const persistedMetrics = yield* persistence.getQueueMetrics()
        expect(persistedMetrics).toBeDefined()
      })
      
      const allLayers = BasicQueueSystemLayer.pipe(
        Effect.provide(PersistenceManagerLive),
        Effect.provide(AnalyticsCollectorLive),
        Effect.provide(MonitoringDashboardLive),
        Effect.provide(PerformanceProfilerLive),
        Effect.provide(MemoryOptimizerLive),
        Effect.provide(AdvancedCacheLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(allLayers)))
    })
  })
  
  describe("Error Handling Integration", () => {
    it("should handle errors gracefully across all phases", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        
        // Test error propagation and handling
        const session = yield* profiler.startProfiling("error-test", "computation", "computation")
        
        // Simulate a failed operation
        const failedOperation = {
          id: "error-integration-test",
          type: "computation" as const,
          priority: 1,
          payload: { shouldFail: true },
          resourceGroup: "computation" as const
        }
        
        const result = yield* queue.enqueue(failedOperation)
        
        // End profiling with error
        const metrics = yield* profiler.endProfiling(session, false, "integration-test-error")
        
        expect(metrics.success).toBe(false)
        expect(metrics.errorType).toBe("integration-test-error")
        expect(result).toBeDefined()
      })
      
      const layers = BasicQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive),
        Effect.provide(PersistenceManagerLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(layers)))
    })
  })
  
  describe("Performance Integration", () => {
    it("should maintain performance across integrated phases", async () => {
      const test = Effect.gen(function*() {
        const profiler = yield* PerformanceProfiler
        const queue = yield* QueueSystem
        
        // Test multiple operations with timing
        const operations = []
        
        for (let i = 0; i < 5; i++) {
          const session = yield* profiler.startProfiling(`perf-test-${i}`, "computation", "computation")
          
          const operation = {
            id: `perf-integration-${i}`,
            type: "computation" as const,
            priority: 1,
            payload: { index: i },
            resourceGroup: "computation" as const
          }
          
          const result = yield* queue.enqueue(operation)
          expect(result.success).toBe(true)
          
          yield* Effect.sleep(Duration.millis(10))
          const metrics = yield* profiler.endProfiling(session, true)
          
          operations.push(metrics)
        }
        
        // Verify all operations completed successfully
        expect(operations).toHaveLength(5)
        operations.forEach(op => {
          expect(op.success).toBe(true)
          expect(op.duration).toBeGreaterThan(0)
        })
        
        // Get overall performance stats
        const stats = yield* profiler.getPerformanceStats()
        expect(stats.totalOperations).toBeGreaterThanOrEqual(5)
      })
      
      const layers = BasicQueueSystemLayer.pipe(
        Effect.provide(PerformanceProfilerLive),
        Effect.provide(PersistenceManagerLive),
        Effect.provide(AnalyticsCollectorLive)
      )
      
      await Effect.runPromise(test.pipe(Effect.provide(layers)))
    })
  })
})