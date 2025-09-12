/**
 * Simple Queue Command - Basic queue system demonstration
 * 
 * Test command to verify queue system integration without complex dependencies
 */

import * as Command from "@effect/cli/Command"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Duration from "effect/Duration"
import { 
  BasicQueueSystemLayer, 
  queueComputationTask,
  getQueueStatus,
  initializeQueueSystem
} from "../services/Queue/index.js"

export const simpleQueueCommand = Command.make(
  "queue-demo",
  {},
  () =>
    Effect.gen(function*() {
      yield* Console.log("🚀 Queue System Demo")
      
      // Initialize queue system
      const sessionId = yield* initializeQueueSystem()
      yield* Console.log(`📋 Session ID: ${sessionId}`)
      
      // Add some demo tasks
      yield* Console.log("📝 Adding computation tasks to queue...")
      
      const task1 = queueComputationTask(
        Effect.gen(function*() {
          yield* Effect.sleep(Duration.millis(100))
          yield* Effect.log("Task 1 completed")
          return "Result 1"
        }),
        { priority: 1 }
      )
      
      const task2 = queueComputationTask(
        Effect.gen(function*() {
          yield* Effect.sleep(Duration.millis(200))
          yield* Effect.log("Task 2 completed")
          return "Result 2"
        }),
        { priority: 2 }
      )
      
      const taskId1 = yield* task1
      const taskId2 = yield* task2
      
      yield* Console.log(`✅ Added tasks: ${taskId1}, ${taskId2}`)
      
      // Show queue status
      yield* Console.log("📊 Queue Status:")
      const status = yield* getQueueStatus()
      yield* Console.log(`  - Queue size: ${JSON.stringify(status.queue.queueSizes)}`)
      yield* Console.log(`  - Processing fibers: ${status.queue.processingFibers.length}`)
      
      // Wait a moment for tasks to process
      yield* Effect.sleep(Duration.millis(500))
      
      // Show final status
      const finalStatus = yield* getQueueStatus()
      yield* Console.log("📈 Final Queue Status:")
      yield* Console.log(`  - Queue size: ${JSON.stringify(finalStatus.queue.queueSizes)}`)
      yield* Console.log(`  - Processing fibers: ${finalStatus.queue.processingFibers.length}`)
      
      yield* Console.log("✨ Queue demo completed!")
    })
    .pipe(
      Effect.provide(BasicQueueSystemLayer)
    )
)