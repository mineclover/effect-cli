/**
 * Production Commands
 *
 * Import your actual production commands here.
 * These commands will be included in the final CLI application.
 */

// Import your production commands here:
import { greetCommand } from "./GreetCommand.js"
// import { deployCommand } from "./DeployCommand.js"

/**
 * Production commands array
 * Add your actual commands to this array
 */
export const productionCommands = [
  // Add your production commands here:
  greetCommand,
  // deployCommand,
]

/**
 * Individual command exports
 * Export your commands individually for selective use
 */
export { greetCommand }

/**
 * Usage in Cli.ts:
 *
 * import { productionCommands } from "./commands/index.js"
 * import { exampleCommands } from "./examples/index.js"  // Optional
 *
 * Command.withSubcommands([
 *   ...productionCommands,
 *   ...exampleCommands,  // Remove this line for production
 * ])
 */
