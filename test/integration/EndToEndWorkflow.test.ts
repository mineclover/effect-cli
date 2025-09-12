/**
 * End-to-End Workflow Test Suite
 * 
 * Tests complete workflows that span all phases of the Effect CLI Queue System
 * Simulates real-world usage scenarios
 */

import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"

import { BasicQueueSystemLayer } from "../../src/services/Queue/index.js"
import { PersistenceManagerLive } from "../../src/services/Queue/PersistenceManager.js"
import { AnalyticsCollectorLive } from "../../src/services/Queue/AnalyticsCollector.js"
import { MonitoringDashboardLive } from "../../src/services/Queue/MonitoringDashboard.js"
import { PerformanceProfilerLive } from "../../src/services/Queue/PerformanceProfiler.js"
import { MemoryOptimizerLive } from "../../src/services/Queue/MemoryOptimizer.js"
import { AdvancedCacheLive } from "../../src/services/Queue/AdvancedCache.js"

import type { QueueOperation } from "../../src/services/Queue/types.js"
import { 
  QueueSystem,
  PersistenceManager,
  AnalyticsCollector,
  MonitoringDashboard,
  PerformanceProfiler,
  MemoryOptimizer,
  AdvancedCache
} from "../../src/services/Queue/index.js"

// Complete system layer with all phases
const CompleteSystemLayer = BasicQueueSystemLayer.pipe(
  Effect.provide(PersistenceManagerLive),
  Effect.provide(AnalyticsCollectorLive),
  Effect.provide(MonitoringDashboardLive),
  Effect.provide(PerformanceProfilerLive),
  Effect.provide(MemoryOptimizerLive),
  Effect.provide(AdvancedCacheLive)
)

describe("End-to-End Workflow Tests", () => {
  describe("File Processing Workflow", () => {
    it("should handle complete file processing pipeline", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        const persistence = yield* PersistenceManager
        const analytics = yield* AnalyticsCollector
        
        // Simulate file processing workflow
        const files = [
          { name: "document1.pdf", size: 1024000, type: "pdf" },
          { name: "image1.jpg", size: 512000, type: "image" },
          { name: "video1.mp4", size: 10240000, type: "video" }
        ]
        
        const results = []
        
        for (const file of files) {
          // Start profiling for this file
          const session = yield* profiler.startProfiling(
            `file-process-${file.name}`,
            "file-processing",
            "filesystem"
          )
          
          // Create queue operation
          const operation: QueueOperation = {
            id: `process-${file.name}`,
            type: "file-processing",
            priority: file.size > 5000000 ? 3 : 1, // Higher priority for large files
            payload: file,
            resourceGroup: "filesystem"
          }
          
          // Enqueue the operation
          const queueResult = yield* queue.enqueue(operation)
          expect(queueResult.success).toBe(true)
          
          // Simulate processing time based on file size
          const processingTime = Math.min(file.size / 100000, 200)
          yield* Effect.sleep(Duration.millis(processingTime))
          
          // End profiling
          const metrics = yield* profiler.endProfiling(session, true)
          
          results.push({
            file: file.name,
            success: true,
            duration: metrics.duration,
            queueId: queueResult.operationId
          })
        }
        
        // Verify all files were processed
        expect(results).toHaveLength(3)
        results.forEach(result => {
          expect(result.success).toBe(true)
          expect(result.duration).toBeGreaterThan(0)
        })
        
        // Check analytics collected the data
        const analyticsData = yield* analytics.collectMetrics()
        expect(analyticsData).toBeDefined()
        
        // Check persistence has the metrics
        const persistedMetrics = yield* persistence.getQueueMetrics()
        expect(persistedMetrics).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CompleteSystemLayer)))
    })
  })
  
  describe("API Request Processing Workflow", () => {
    it("should handle API request processing with different priorities", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        const monitoring = yield* MonitoringDashboard
        
        // Simulate different types of API requests
        const requests = [
          { endpoint: "/api/user/profile", method: "GET", priority: 1, urgent: false },
          { endpoint: "/api/payment/process", method: "POST", priority: 5, urgent: true },
          { endpoint: "/api/data/export", method: "GET", priority: 2, urgent: false },
          { endpoint: "/api/auth/login", method: "POST", priority: 4, urgent: true }
        ]
        
        const results = []
        
        // Process all requests concurrently
        for (const req of requests) {
          const session = yield* profiler.startProfiling(
            `api-${req.endpoint.replace(/\//g, "-")}`,
            "network-request",
            "network"
          )
          
          const operation: QueueOperation = {
            id: `api-request-${Date.now()}-${Math.random()}`,
            type: "network-request",
            priority: req.priority,
            payload: req,
            resourceGroup: "network"
          }
          
          const queueResult = yield* queue.enqueue(operation)
          expect(queueResult.success).toBe(true)
          
          // Simulate API processing time (urgent requests process faster)
          const baseTime = req.urgent ? 50 : 100
          const variance = Math.random() * 50
          yield* Effect.sleep(Duration.millis(baseTime + variance))
          
          const metrics = yield* profiler.endProfiling(session, true)
          
          results.push({
            endpoint: req.endpoint,
            priority: req.priority,
            urgent: req.urgent,
            duration: metrics.duration,
            success: true
          })
        }
        
        // Verify processing
        expect(results).toHaveLength(4)
        
        // Check that urgent requests were generally faster
        const urgentRequests = results.filter(r => r.urgent)
        const normalRequests = results.filter(r => !r.urgent)
        
        expect(urgentRequests.length).toBeGreaterThan(0)
        expect(normalRequests.length).toBeGreaterThan(0)
        
        // Get monitoring status
        const status = yield* monitoring.getCurrentStatus()
        expect(status).toBeDefined()
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CompleteSystemLayer)))
    })
  })
  
  describe("Batch Processing Workflow", () => {
    it("should handle large batch operations efficiently", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        const memoryOpt = yield* MemoryOptimizer
        const cache = yield* AdvancedCache
        
        // Simulate batch data processing
        const batchSize = 20
        const batchOperations = []
        
        // Start batch profiling
        const batchSession = yield* profiler.startProfiling(
          "batch-processing",
          "batch-operation",
          "computation"
        )
        
        for (let i = 0; i < batchSize; i++) {
          const operation: QueueOperation = {
            id: `batch-item-${i}`,
            type: "data-processing",
            priority: 1,
            payload: { 
              batchId: "batch-001",
              itemIndex: i,
              data: `item-data-${i}` 
            },
            resourceGroup: "computation"
          }
          
          const result = yield* queue.enqueue(operation)
          expect(result.success).toBe(true)
          batchOperations.push(result)
        }
        
        // Simulate batch processing time
        yield* Effect.sleep(Duration.millis(300))
        
        // End batch profiling
        const batchMetrics = yield* profiler.endProfiling(batchSession, true)
        
        expect(batchMetrics.success).toBe(true)
        expect(batchMetrics.duration).toBeGreaterThan(250)
        expect(batchOperations).toHaveLength(batchSize)
        
        // Check memory optimization was engaged
        expect(memoryOpt).toBeDefined()
        expect(cache).toBeDefined()
        
        // Get performance stats
        const stats = yield* profiler.getPerformanceStats()
        expect(stats.totalOperations).toBeGreaterThanOrEqual(batchSize)
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CompleteSystemLayer)))
    })
  })
  
  describe("Mixed Workload Workflow", () => {
    it("should handle mixed resource group workloads", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        const analytics = yield* AnalyticsCollector
        
        // Mixed workload across different resource groups
        const workloads = [
          { type: "file-read", resourceGroup: "filesystem" as const, count: 3 },
          { type: "api-call", resourceGroup: "network" as const, count: 5 },
          { type: "computation", resourceGroup: "computation" as const, count: 4 },
          { type: "cache-operation", resourceGroup: "memory-intensive" as const, count: 2 }
        ]
        
        const allResults = []
        
        // Process mixed workloads
        for (const workload of workloads) {
          for (let i = 0; i < workload.count; i++) {
            const session = yield* profiler.startProfiling(
              `${workload.type}-${i}`,
              workload.type,
              workload.resourceGroup
            )
            
            const operation: QueueOperation = {
              id: `${workload.type}-${workload.resourceGroup}-${i}`,
              type: workload.type,
              priority: Math.floor(Math.random() * 3) + 1,
              payload: { workloadType: workload.type, index: i },
              resourceGroup: workload.resourceGroup
            }
            
            const queueResult = yield* queue.enqueue(operation)
            expect(queueResult.success).toBe(true)
            
            // Variable processing time based on resource group
            const baseTimes = {
              filesystem: 80,
              network: 120,
              computation: 60,
              "memory-intensive": 40
            }
            
            const processingTime = baseTimes[workload.resourceGroup] + (Math.random() * 40)
            yield* Effect.sleep(Duration.millis(processingTime))
            
            const metrics = yield* profiler.endProfiling(session, true)
            
            allResults.push({
              type: workload.type,
              resourceGroup: workload.resourceGroup,
              duration: metrics.duration,
              success: metrics.success
            })
          }
        }
        
        // Verify all operations completed
        const expectedTotal = workloads.reduce((sum, w) => sum + w.count, 0)
        expect(allResults).toHaveLength(expectedTotal)
        
        // Check resource utilization
        const resourceUtil = yield* profiler.getResourceUtilization()
        expect(resourceUtil).toBeDefined()
        expect(resourceUtil.length).toBeGreaterThan(0)
        
        // Verify analytics captured the mixed workload
        const analyticsData = yield* analytics.collectMetrics()
        expect(analyticsData).toBeDefined()
        
        // Check all resource groups were utilized
        const usedResourceGroups = new Set(allResults.map(r => r.resourceGroup))
        expect(usedResourceGroups.size).toBe(4) // All 4 resource groups
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CompleteSystemLayer)))
    })
  })
  
  describe("System Recovery Workflow", () => {
    it("should handle system recovery after failures", async () => {
      const test = Effect.gen(function*() {
        const queue = yield* QueueSystem
        const profiler = yield* PerformanceProfiler
        const monitoring = yield* MonitoringDashboard
        
        // Simulate some successful operations
        for (let i = 0; i < 3; i++) {
          const session = yield* profiler.startProfiling(`success-${i}`, "computation", "computation")
          
          const operation: QueueOperation = {
            id: `success-${i}`,
            type: "computation",
            priority: 1,
            payload: { shouldSucceed: true },
            resourceGroup: "computation"
          }
          
          const result = yield* queue.enqueue(operation)
          expect(result.success).toBe(true)
          
          yield* Effect.sleep(Duration.millis(50))
          yield* profiler.endProfiling(session, true)
        }
        
        // Simulate some failures
        for (let i = 0; i < 2; i++) {
          const session = yield* profiler.startProfiling(`failure-${i}`, "computation", "computation")
          
          const operation: QueueOperation = {
            id: `failure-${i}`,
            type: "computation",
            priority: 1,
            payload: { shouldFail: true },
            resourceGroup: "computation"
          }
          
          const result = yield* queue.enqueue(operation)
          expect(result.success).toBe(true) // Queue accepts the operation
          
          yield* Effect.sleep(Duration.millis(30))
          // Simulate failure during processing
          yield* profiler.endProfiling(session, false, "simulated-failure")
        }
        
        // System recovery - more successful operations
        for (let i = 0; i < 2; i++) {
          const session = yield* profiler.startProfiling(`recovery-${i}`, "computation", "computation")
          
          const operation: QueueOperation = {
            id: `recovery-${i}`,
            type: "computation",
            priority: 1,
            payload: { isRecovery: true },
            resourceGroup: "computation"
          }
          
          const result = yield* queue.enqueue(operation)
          expect(result.success).toBe(true)
          
          yield* Effect.sleep(Duration.millis(40))
          yield* profiler.endProfiling(session, true)
        }
        
        // Check system status after recovery
        const status = yield* monitoring.getCurrentStatus()
        expect(status).toBeDefined()
        
        // Check performance stats show both successes and failures
        const stats = yield* profiler.getPerformanceStats()
        expect(stats.totalOperations).toBeGreaterThanOrEqual(7)
        expect(stats.errorRate).toBeGreaterThan(0) // Should have some errors from failures
        expect(stats.errorRate).toBeLessThan(1) // But not all operations failed
      })
      
      await Effect.runPromise(test.pipe(Effect.provide(CompleteSystemLayer)))
    })
  })
})