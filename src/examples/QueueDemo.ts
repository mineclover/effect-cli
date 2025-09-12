/**
 * Queue System Demonstration
 *
 * Shows basic usage of the Effect CLI Queue System with Phase 1 implementation.
 * Demonstrates file operations, monitoring, and queue management.
 *
 * @version 1.0.0
 * @created 2025-01-12
 */

import * as Console from "effect/Console"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import {
  getQueueStatus,
  initializeQueueSystem,
  queueComputationTask,
  queueFileOperation,
  QueueSystem,
  shutdownQueueSystem
} from "../services/Queue/index.js"

// ============================================================================
// DEMO OPERATIONS
// ============================================================================

/**
 * Simulate a file read operation
 */
const simulateFileRead = (filePath: string) =>
  Effect.gen(function*() {
    yield* Effect.log(`Reading file: ${filePath}`)

    // Simulate file reading delay
    yield* Effect.sleep(Duration.millis(Math.random() * 1000 + 500))

    const content = `Content of ${filePath} - ${new Date().toISOString()}`

    yield* Effect.log(`File read completed: ${filePath}`)

    return content
  })

/**
 * Simulate a computation task
 */
const simulateComputation = (taskName: string, complexity: number) =>
  Effect.gen(function*() {
    yield* Effect.log(`Starting computation: ${taskName}`)

    // Simulate computation delay based on complexity
    yield* Effect.sleep(Duration.millis(complexity * 100))

    const result = Math.random() * complexity

    yield* Effect.log(`Computation completed: ${taskName} = ${result}`)

    return result
  })

// ============================================================================
// DEMO PROGRAM
// ============================================================================

const runQueueDemo = Effect.gen(function*() {
  yield* Console.log("🚀 Effect CLI Queue System Demo")
  yield* Console.log("=====================================")

  // Initialize the queue system
  yield* Console.log("1. Initializing Queue System...")
  const sessionId = yield* initializeQueueSystem()
  yield* Console.log(`   Session ID: ${sessionId}`)

  // Add some file operations to the queue
  yield* Console.log("\n2. Adding File Operations to Queue...")

  const fileTask1 = yield* queueFileOperation(
    simulateFileRead("config.json"),
    {
      type: "file-read",
      filePath: "config.json",
      priority: 1 // High priority
    }
  )
  yield* Console.log(`   Queued file task 1: ${fileTask1}`)

  const fileTask2 = yield* queueFileOperation(
    simulateFileRead("README.md"),
    {
      type: "file-read",
      filePath: "README.md",
      priority: 5 // Normal priority
    }
  )
  yield* Console.log(`   Queued file task 2: ${fileTask2}`)

  const fileTask3 = yield* queueFileOperation(
    simulateFileRead("package.json"),
    {
      type: "file-read",
      filePath: "package.json",
      priority: 3 // Higher priority
    }
  )
  yield* Console.log(`   Queued file task 3: ${fileTask3}`)

  // Add some computation tasks
  yield* Console.log("\n3. Adding Computation Tasks to Queue...")

  const compTask1 = yield* queueComputationTask(
    simulateComputation("Calculate PI", 10),
    {
      priority: 2,
      isMemoryIntensive: false
    }
  )
  yield* Console.log(`   Queued computation task 1: ${compTask1}`)

  const compTask2 = yield* queueComputationTask(
    simulateComputation("Matrix multiplication", 20),
    {
      priority: 4,
      isMemoryIntensive: true
    }
  )
  yield* Console.log(`   Queued computation task 2: ${compTask2}`)

  // Check initial queue status
  yield* Console.log("\n4. Initial Queue Status:")
  const initialStatus = yield* getQueueStatus()
  yield* Console.log(`   Total Pending: ${initialStatus.queue.totalPending}`)
  yield* Console.log(`   Total Running: ${initialStatus.queue.totalRunning}`)
  yield* Console.log(`   Filesystem Queue: ${initialStatus.queue.queues.filesystem.size}`)
  yield* Console.log(`   Computation Queue: ${initialStatus.queue.queues.computation.size}`)
  yield* Console.log(`   Memory-Intensive Queue: ${initialStatus.queue.queues["memory-intensive"].size}`)

  // Wait a bit for tasks to process
  yield* Console.log("\n5. Waiting for tasks to process...")
  yield* Effect.sleep(Duration.seconds(3))

  // Check status after processing
  yield* Console.log("\n6. Queue Status After Processing:")
  const afterStatus = yield* getQueueStatus()
  yield* Console.log(`   Total Tasks: ${afterStatus.metrics.totalTasks}`)
  yield* Console.log(`   Completed Tasks: ${afterStatus.metrics.completedTasks}`)
  yield* Console.log(`   Failed Tasks: ${afterStatus.metrics.failedTasks}`)
  yield* Console.log(`   Success Rate: ${(afterStatus.metrics.successRate * 100).toFixed(1)}%`)
  yield* Console.log(`   Avg Processing Time: ${afterStatus.metrics.averageProcessingTime.toFixed(2)}ms`)

  // Wait a bit more for remaining tasks
  if (afterStatus.queue.totalPending > 0 || afterStatus.queue.totalRunning > 0) {
    yield* Console.log(
      `\n7. Waiting for remaining tasks (${afterStatus.queue.totalPending} pending, ${afterStatus.queue.totalRunning} running)...`
    )
    yield* Effect.sleep(Duration.seconds(4))

    const finalStatus = yield* getQueueStatus()
    yield* Console.log(
      `   Final - Completed: ${finalStatus.metrics.completedTasks}, Failed: ${finalStatus.metrics.failedTasks}`
    )
  }

  // Export metrics
  yield* Console.log("\n8. Exporting Queue Metrics...")
  const metricsJson = yield* QueueSystem.exportMetrics("json")
  yield* Console.log("   Metrics (JSON):")
  yield* Console.log(`   ${metricsJson.substring(0, 200)}...`)

  // Shutdown queue system
  yield* Console.log("\n9. Shutting down Queue System...")
  yield* shutdownQueueSystem()

  yield* Console.log("\n✅ Queue System Demo Completed!")
})

// ============================================================================
// MAIN PROGRAM
// ============================================================================

const program = runQueueDemo.pipe(
  Effect.provide(QueueSystem.BasicLayer),
  Effect.catchAll((error) =>
    Effect.gen(function*() {
      yield* Console.log(`❌ Demo failed with error: ${error}`)
      if (error instanceof Error) {
        yield* Console.log(`   Error details: ${error.message}`)
        if (error.stack) {
          yield* Console.log(`   Stack trace: ${error.stack}`)
        }
      }
    })
  )
)

// Export for CLI usage
export { program as QueueDemo }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  Effect.runPromise(program)
    .then(() => {
      console.log("Demo execution completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Demo execution failed:", error)
      process.exit(1)
    })
}
