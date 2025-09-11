/**
 * Production Commands
 *
 * Import your actual production commands here.
 * These commands will be included in the final CLI application.
 */

// Import your production commands here:
// import { myCommand } from "./MyCommand.js"
// import { deployCommand } from "./DeployCommand.js"

/**
 * Production commands array
 * Add your actual commands to this array
 */
export const productionCommands = [
  // Add your production commands here:
  // myCommand,
  // deployCommand,
]

/**
 * Individual command exports
 * Export your commands individually for selective use
 */
// export { myCommand, deployCommand }

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
