/**
 * Example commands for Effect CLI
 *
 * These are sample implementations demonstrating various patterns.
 * To use these examples in your CLI:
 *
 * 1. Import them in your Cli.ts:
 *    import { exampleCommands } from "./examples/index.js"
 *
 * 2. Add to your command:
 *    Command.withSubcommands([...exampleCommands, ...yourCommands])
 *
 * To remove examples, simply don't import them.
 */

import { catCommand } from "./CatCommand.js"
import { findCommand } from "./FindCommand.js"
import { listCommand } from "./ListCommand.js"
import { advancedCommand, sampleCommand } from "./SampleCommand.js"

// Export as array for easy inclusion/exclusion
export const exampleCommands = [
  listCommand,
  catCommand,
  findCommand,
  sampleCommand,
  advancedCommand
]

// Export individually for selective use
export { advancedCommand, catCommand, findCommand, listCommand, sampleCommand }
