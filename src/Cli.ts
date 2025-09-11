import * as Command from "@effect/cli/Command"
import * as Console from "effect/Console"

// ============================================
// EXAMPLE COMMANDS (Remove this section for production)
// ============================================
// To exclude examples, comment out the import line below:
import { advancedCommand, catCommand, findCommand, listCommand, sampleCommand } from "./examples/index.js"

// ============================================
// YOUR COMMANDS
// ============================================
// Import your actual commands here:
// import { myCommand } from "./commands/MyCommand.js"

// ============================================
// CLI CONFIGURATION
// ============================================
// Create main command following Effect CLI pattern
const mainCommand = Command.make(
  "file-explorer",
  {},
  () => Console.log("Effect File Explorer CLI - use --help to see available commands")
)

// Add subcommands using the official Effect CLI pattern
const command = mainCommand.pipe(
  Command.withSubcommands([
    // Example commands (remove these for production):
    listCommand,
    catCommand,
    findCommand,
    sampleCommand,
    advancedCommand
    // Add your commands here:
    // myCommand,
  ])
)

export const run = Command.run(command, {
  name: "Effect File Explorer CLI",
  version: "1.0.0"
})
