// From: src/Cli.ts - 서브커맨드 등록 패턴
import * as Command from "@effect/cli/Command"
import * as Console from "effect/Console"

// Simple test command that uses platform FileSystem directly
import { simpleListCommand } from "./examples/SimpleListCommand.js"
import { simpleQueueCommand } from "./examples/SimpleQueueCommand.js"

// Example commands (configurable via examples/config.ts) - temporarily disabled
// import { advancedCommand, catCommand, findCommand, listCommand, sampleCommand } from "./examples/index.js"

// Queue-enhanced commands (Phase 3) - temporarily disabled for testing
// import { queueCommand } from "./examples/QueueCommand.js"
// import { enhancedListCommand } from "./examples/EnhancedListCommand.js"
// import { uxDemoCommand } from "./examples/UXDemoCommand.js"

// 메인 커맨드 생성
const mainCommand = Command.make(
  "file-explorer",
  {},
  () => Console.log("Effect File Explorer CLI - use --help to see available commands")
)

// 공식 패턴: Command.withSubcommands 사용
// Phase 3: Queue-enhanced CLI with transparent integration
// Add simple test commands to verify FileSystem and Queue integration
const command = mainCommand.pipe(
  Command.withSubcommands([
    simpleListCommand,
    simpleQueueCommand
  ])
)

// 커맨드 실행 - 올바른 Command.run 사용법
export const run = Command.run(command, {
  name: "Effect File Explorer",
  version: "1.0.0"
})
