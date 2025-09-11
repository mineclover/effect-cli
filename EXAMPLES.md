# Example Commands Guide

This guide explains how to manage and use the example commands in this Effect CLI application.

## Directory Structure

```
src/
├── commands/           # Production commands
│   └── index.ts       # Production commands registry  
├── examples/          # Example/sample commands
│   ├── config.ts      # Example commands configuration
│   ├── index.ts       # Example commands registry
│   ├── ListCommand.ts # File listing example
│   ├── CatCommand.ts  # File reading example
│   ├── FindCommand.ts # File searching example
│   └── SampleCommand.ts # Advanced patterns example
└── Cli.ts             # Main CLI configuration
```

## Configuration Options

### Global Control

Edit `src/examples/config.ts` to control example commands:

```typescript
// Disable all examples
export const ENABLE_EXAMPLES = false;

// Or enable/disable individual examples
export const ExampleConfig = {
  LIST_COMMAND: true,    // Enable list command
  CAT_COMMAND: false,    // Disable cat command
  FIND_COMMAND: true,    // Enable find command
  SAMPLE_COMMAND: false, // Disable sample command
  ADVANCED_COMMAND: true, // Enable advanced command
} as const;
```

### Environment-Based Configuration

Uncomment this line in `config.ts` to auto-disable examples in production:

```typescript
export const ENABLE_EXAMPLES = process.env.NODE_ENV !== 'production';
```

## Usage Patterns

### 1. Use All Configured Examples

```typescript
import { exampleCommands } from "./examples/index.js"

Command.withSubcommands([
  ...productionCommands,
  ...exampleCommands,  // Respects configuration
])
```

### 2. Use Specific Examples Only

```typescript
import { listCommand, sampleCommand } from "./examples/index.js"

Command.withSubcommands([
  ...productionCommands,
  listCommand,   // Always included
  sampleCommand, // Always included
])
```

### 3. Production Build (No Examples)

Set `ENABLE_EXAMPLES = false` in config.ts, or:

```typescript
Command.withSubcommands([
  ...productionCommands,
  // No example imports
])
```

## Example Commands Overview

### ListCommand (`list`)
Demonstrates file system operations and formatting:
- Arguments: `path` (directory to list)
- Options: `--all` (show hidden), `--long` (detailed view)
- Pattern: Basic Effect.gen with service injection

### CatCommand (`cat`)
Shows file reading and error handling:
- Arguments: `file` (file to read)
- Options: `--lines` (limit output lines)
- Pattern: Error handling with Effect.tryPromise

### FindCommand (`find`)
Illustrates search operations:
- Arguments: `path` (search directory), `pattern` (search pattern)
- Options: `--case-sensitive`, `--type` (file/directory)
- Pattern: Complex filtering and array operations

### SampleCommand (`sample`)
Comprehensive example showing all patterns:
- Multiple arguments and options
- Advanced handler logic
- Effect tracing and logging
- Pattern: Complete CLI command structure

### AdvancedCommand (`advanced`)
Demonstrates advanced Effect patterns:
- Service composition
- Error recovery
- Concurrent operations
- Pattern: Complex Effect orchestration

## Development Workflow

### Adding New Examples

1. Create your example command file in `src/examples/`
2. Add it to the configuration in `src/examples/config.ts`
3. Export it from `src/examples/index.ts`
4. Update the `getEnabledCommands()` function

Example:

```typescript
// 1. Create MyExampleCommand.ts
export const myExampleCommand = Command.make("my-example", {...})

// 2. Add to config.ts
export const ExampleConfig = {
  // ... existing configs
  MY_EXAMPLE_COMMAND: true,
} as const;

// 3. Update index.ts
import { myExampleCommand } from "./MyExampleCommand.js"

const getEnabledCommands = () => {
  // ... existing logic
  if (ExampleConfig.MY_EXAMPLE_COMMAND) commands.push(myExampleCommand);
  return commands;
}
```

### Removing Examples for Production

Choose one of these approaches:

1. **Configuration approach**: Set `ENABLE_EXAMPLES = false`
2. **Environment approach**: Use `NODE_ENV !== 'production'`
3. **Build approach**: Remove example imports from `Cli.ts`
4. **Delete approach**: Delete the entire `examples/` directory

## Testing Examples

Test individual examples:

```bash
# Test list command
npm run dev list ./

# Test with options
npm run dev list --all --long ./src

# Test cat command
npm run dev cat package.json

# Test find command
npm run dev find ./ "*.ts"
```

## Best Practices

1. **Keep examples simple**: Focus on demonstrating specific patterns
2. **Document patterns**: Add comments explaining Effect.js concepts
3. **Use real scenarios**: Base examples on common use cases
4. **Maintain separation**: Keep examples completely separate from production code
5. **Test regularly**: Ensure examples work with latest Effect versions

## Troubleshooting

### Examples not showing up
- Check `ENABLE_EXAMPLES` is `true` in config.ts
- Verify individual command configs in `ExampleConfig`
- Ensure proper imports in index.ts

### Build errors with examples
- Check that all example files compile
- Verify Effect.js imports are correct
- Ensure service dependencies are properly provided

### Production deployment
- Set `ENABLE_EXAMPLES = false` before deployment
- Test that CLI works without examples
- Consider using environment-based configuration