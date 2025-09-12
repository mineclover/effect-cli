/**
 * User Experience Enhancer
 * 
 * Advanced user experience enhancements for the Effect CLI with queue integration.
 * Provides intelligent progress tracking, contextual help, and adaptive feedback
 * based on user behavior patterns and system performance.
 * 
 * Phase 3.4: User Experience Enhancement
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"

import type { QueueMetrics, QueueStatus } from "../Queue/types.js"
import { InternalQueue } from "../Queue/index.js"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User experience enhancer service interface
 * 
 * Provides intelligent feedback, progress tracking, and contextual assistance
 * to improve user interaction with the CLI and queue system.
 */
export interface UserExperienceEnhancer {
  // Progress Tracking
  readonly startProgress: (operation: string, estimatedDuration?: Duration.Duration) => Effect.Effect<ProgressTracker>
  readonly trackLongRunningOperation: <A, E>(
    operation: Effect.Effect<A, E>, 
    description: string,
    options?: ProgressOptions
  ) => Effect.Effect<A, E>
  
  // Contextual Help
  readonly showSystemStatus: () => Effect.Effect<void>
  readonly suggestOptimizations: () => Effect.Effect<string[]>
  readonly explainQueueBehavior: (operation: string) => Effect.Effect<string>
  
  // Adaptive Feedback
  readonly provideSmartFeedback: (context: FeedbackContext) => Effect.Effect<void>
  readonly detectUserPatterns: () => Effect.Effect<UserPattern[]>
  readonly adaptInterfaceForUser: (patterns: UserPattern[]) => Effect.Effect<void>
}

export const UserExperienceEnhancer = Context.GenericTag<UserExperienceEnhancer>("@app/UserExperienceEnhancer")

/**
 * Progress tracking interface
 */
export interface ProgressTracker {
  readonly update: (progress: number, message?: string) => Effect.Effect<void>
  readonly complete: (message?: string) => Effect.Effect<void>
  readonly fail: (error: string) => Effect.Effect<void>
  readonly addStep: (step: string) => Effect.Effect<void>
}

/**
 * Progress configuration options
 */
export interface ProgressOptions {
  readonly showEta?: boolean
  readonly showSteps?: boolean
  readonly showQueuePosition?: boolean
  readonly updateInterval?: Duration.Duration
  readonly style?: ProgressStyle
}

export type ProgressStyle = "bar" | "spinner" | "dots" | "minimal"

/**
 * Feedback context for smart assistance
 */
export interface FeedbackContext {
  readonly operation: string
  readonly duration: Duration.Duration
  readonly queueMetrics?: QueueMetrics
  readonly errorCount?: number
  readonly userExperienceLevel?: UserLevel
}

export type UserLevel = "beginner" | "intermediate" | "advanced"

/**
 * User behavior patterns
 */
export interface UserPattern {
  readonly type: PatternType
  readonly frequency: number
  readonly context: string
  readonly timestamp: Date
}

export type PatternType = 
  | "frequent_queue_checks"
  | "prefers_detailed_output"
  | "uses_advanced_features"
  | "needs_help_prompts"
  | "performance_focused"

// ============================================================================
// PROGRESS TRACKING IMPLEMENTATION
// ============================================================================

/**
 * Advanced progress tracker with adaptive feedback
 */
class LiveProgressTracker implements ProgressTracker {
  private currentProgress = 0
  private steps: string[] = []
  private startTime = Date.now()
  
  constructor(
    private operation: string,
    private estimatedDuration?: Duration.Duration,
    private options: ProgressOptions = {}
  ) {}

  update = (progress: number, message?: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      this.currentProgress = Math.max(0, Math.min(100, progress))
      const elapsed = Date.now() - this.startTime
      
      // Build progress display
      let display = this.buildProgressDisplay(progress, elapsed, message)
      
      // Show queue position if requested and available
      if (this.options.showQueuePosition) {
        display += yield* this.addQueuePositionInfo()
      }
      
      // Update console with progress
      process.stdout.write(`\r${display}`)
    }).pipe(
      Effect.catchAll(() => Effect.void)
    )

  complete = (message?: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const elapsed = Date.now() - this.startTime
      const successMessage = message || `${this.operation} completed`
      
      process.stdout.write(`\r✅ ${successMessage} (${this.formatDuration(elapsed)})\n`)
      
      if (this.options.showSteps && this.steps.length > 0) {
        yield* Effect.log(`Completed steps: ${this.steps.join(' → ')}`)
      }
    })

  fail = (error: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const elapsed = Date.now() - this.startTime
      process.stdout.write(`\r❌ ${this.operation} failed: ${error} (${this.formatDuration(elapsed)})\n`)
    })

  addStep = (step: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      this.steps.push(step)
      if (this.options.showSteps) {
        yield* Effect.log(`Step: ${step}`)
      }
    })

  private buildProgressDisplay(progress: number, elapsed: number, message?: string): string {
    const style = this.options.style || "bar"
    let display = ""
    
    switch (style) {
      case "bar":
        const barLength = 20
        const filled = Math.floor((progress / 100) * barLength)
        const bar = "█".repeat(filled) + "░".repeat(barLength - filled)
        display = `🔄 [${bar}] ${progress.toFixed(1)}% ${this.operation}`
        break
        
      case "spinner":
        const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        const spinner = spinners[Math.floor(elapsed / 100) % spinners.length]
        display = `${spinner} ${progress.toFixed(1)}% ${this.operation}`
        break
        
      case "dots":
        const dotCount = Math.floor(elapsed / 500) % 4
        const dots = ".".repeat(dotCount) + " ".repeat(3 - dotCount)
        display = `🔄 ${progress.toFixed(1)}% ${this.operation}${dots}`
        break
        
      case "minimal":
        display = `${progress.toFixed(1)}% ${this.operation}`
        break
    }
    
    if (message) {
      display += ` - ${message}`
    }
    
    // Add ETA if available and requested
    if (this.options.showEta && this.estimatedDuration && progress > 0) {
      const totalMs = Duration.toMillis(this.estimatedDuration)
      const eta = ((totalMs / progress) * (100 - progress)) / 100
      display += ` (ETA: ${this.formatDuration(eta)})`
    }
    
    return display
  }

  private addQueuePositionInfo = (): Effect.Effect<string> =>
    Effect.gen(function* () {
      // In a real implementation, this would query the queue system
      // For now, return empty string
      return ""
    }).pipe(
      Effect.catchAll(() => Effect.succeed(""))
    )

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }
}

// ============================================================================
// USER EXPERIENCE ENHANCER IMPLEMENTATION
// ============================================================================

/**
 * Live implementation of UserExperienceEnhancer
 */
export const UserExperienceEnhancerLive: Layer.Layer<UserExperienceEnhancer> = Layer.effect(
  UserExperienceEnhancer,
  Effect.gen(function* () {
    const queue = yield* InternalQueue
    
    // User behavior tracking (in-memory for this implementation)
    let userPatterns: UserPattern[] = []

    // ========================================================================
    // PROGRESS TRACKING
    // ========================================================================

    const startProgress = (operation: string, estimatedDuration?: Duration.Duration, options: ProgressOptions = {}): Effect.Effect<ProgressTracker> =>
      Effect.gen(function* () {
        const tracker = new LiveProgressTracker(operation, estimatedDuration, options)
        yield* Effect.log(`Starting progress tracking for: ${operation}`)
        return tracker
      })

    const trackLongRunningOperation = <A, E>(
      operation: Effect.Effect<A, E>,
      description: string,
      options: ProgressOptions = {}
    ): Effect.Effect<A, E> =>
      Effect.gen(function* () {
        const progress = yield* startProgress(description, undefined, options)
        
        yield* progress.addStep("Initializing")
        
        // Start the operation with periodic progress updates
        const result = yield* operation.pipe(
          Effect.race(
            // Progress update schedule
            Effect.gen(function* () {
              let currentProgress = 0
              yield* Effect.repeat(
                Effect.gen(function* () {
                  currentProgress = Math.min(90, currentProgress + 10)
                  yield* progress.update(currentProgress, "Processing...")
                }),
                Schedule.fixed(Duration.millis(options.updateInterval ? Duration.toMillis(options.updateInterval) : 500))
              )
            }).pipe(Effect.forever)
          ),
          Effect.tap(() => progress.complete(`${description} completed successfully`)),
          Effect.tapError((error) => progress.fail(`${description} failed: ${String(error)}`))
        )
        
        return result
      })

    // ========================================================================
    // CONTEXTUAL HELP
    // ========================================================================

    const showSystemStatus = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Effect.log("📊 System Status Dashboard")
        yield* Effect.log("=" * 50)
        
        // Queue system status
        const metrics = yield* queue.getMetrics()
        yield* Effect.log(`Queue Status: ${metrics.isHealthy ? "🟢 Healthy" : "🔴 Issues Detected"}`)
        yield* Effect.log(`Active Tasks: ${metrics.activeTasks}`)
        yield* Effect.log(`Pending Tasks: ${metrics.pendingTasks}`)
        yield* Effect.log(`Completed Tasks: ${metrics.completedTasks}`)
        yield* Effect.log(`Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`)
        yield* Effect.log(`Average Response Time: ${metrics.averageResponseTime}ms`)
        
        // Resource utilization
        yield* Effect.log(`\n🔧 Resource Utilization:`)
        yield* Effect.forEach(Object.entries(metrics.resourceGroupUtilization), ([group, utilization]) => {
          const status = utilization > 80 ? "🔴" : utilization > 60 ? "🟡" : "🟢"
          return Effect.log(`  ${group}: ${status} ${utilization.toFixed(1)}%`)
        })
        
        // Recent performance
        yield* Effect.log(`\n⚡ Recent Performance:`)
        yield* Effect.log(`  Last 10 operations: ${metrics.recentPerformance.slice(-10).map(p => `${p}ms`).join(", ")}`)
      })

    const suggestOptimizations = (): Effect.Effect<string[]> =>
      Effect.gen(function* () {
        const metrics = yield* queue.getMetrics()
        const suggestions: string[] = []
        
        // Analyze metrics and provide suggestions
        if (metrics.errorRate > 0.05) {
          suggestions.push("🔧 Consider reviewing failed operations with 'queue status --detailed'")
        }
        
        if (metrics.averageResponseTime > 1000) {
          suggestions.push("⚡ System performance is slow - consider using 'queue clear' to reset pending tasks")
        }
        
        Object.entries(metrics.resourceGroupUtilization).forEach(([group, utilization]) => {
          if (utilization > 80) {
            suggestions.push(`📈 High ${group} utilization (${utilization.toFixed(1)}%) - consider spacing out operations`)
          }
        })
        
        if (metrics.pendingTasks > 50) {
          suggestions.push("📋 Many pending tasks - queue processing may be backed up")
        }
        
        if (suggestions.length === 0) {
          suggestions.push("✅ System is performing well! No optimizations needed.")
        }
        
        return suggestions
      })

    const explainQueueBehavior = (operation: string): Effect.Effect<string> =>
      Effect.gen(function* () {
        const explanations: Record<string, string> = {
          "file-read": "File read operations are queued in the 'filesystem' resource group to prevent I/O conflicts and optimize disk access patterns.",
          "file-write": "File write operations use queue serialization to prevent data corruption and ensure atomic file modifications.",
          "network-request": "Network requests are managed by the queue system to respect rate limits and handle connection pooling efficiently.",
          "computation": "CPU-intensive operations are queued to prevent system overload and maintain responsive user interface.",
          "directory-list": "Directory listing operations are optimized through the queue system with intelligent caching and batch processing."
        }
        
        return explanations[operation] || 
          `The '${operation}' operation is automatically managed by the queue system for optimal resource utilization and error handling.`
      })

    // ========================================================================
    // ADAPTIVE FEEDBACK
    // ========================================================================

    const provideSmartFeedback = (context: FeedbackContext): Effect.Effect<void> =>
      Effect.gen(function* () {
        const duration = Duration.toMillis(context.duration)
        
        // Provide contextual feedback based on operation characteristics
        if (duration > 5000) {
          yield* Effect.log(`💡 The ${context.operation} operation took ${(duration / 1000).toFixed(1)}s. Consider using progress tracking for better visibility.`)
        }
        
        if (context.errorCount && context.errorCount > 0) {
          yield* Effect.log(`⚠️ Encountered ${context.errorCount} errors during ${context.operation}. Use 'queue status --detailed' to investigate.`)
        }
        
        if (context.queueMetrics && context.queueMetrics.pendingTasks > 10) {
          yield* Effect.log(`📋 Queue has ${context.queueMetrics.pendingTasks} pending tasks. Your operation may experience delays.`)
        }
        
        // Level-based feedback
        if (context.userExperienceLevel === "beginner") {
          yield* Effect.log(`💡 Tip: Use 'queue status' to monitor system performance and 'ls --help' to see all available options.`)
        }
      })

    const detectUserPatterns = (): Effect.Effect<UserPattern[]> =>
      Effect.gen(function* () {
        // In a real implementation, this would analyze user behavior over time
        // For now, return mock patterns
        return userPatterns
      })

    const adaptInterfaceForUser = (patterns: UserPattern[]): Effect.Effect<void> =>
      Effect.gen(function* () {
        // Analyze patterns and adapt interface
        const hasAdvancedUsage = patterns.some(p => p.type === "uses_advanced_features")
        const needsHelp = patterns.some(p => p.type === "needs_help_prompts")
        
        if (hasAdvancedUsage) {
          yield* Effect.log("🎯 Detected advanced user patterns - enabling detailed output by default")
        }
        
        if (needsHelp) {
          yield* Effect.log("💡 Providing additional guidance based on usage patterns")
        }
      })

    // ========================================================================
    // SERVICE IMPLEMENTATION
    // ========================================================================

    return UserExperienceEnhancer.of({
      startProgress,
      trackLongRunningOperation,
      showSystemStatus,
      suggestOptimizations,
      explainQueueBehavior,
      provideSmartFeedback,
      detectUserPatterns,
      adaptInterfaceForUser
    })
  })
)