# Effect CLI Development Guide

Complete guide for developing and extending the Effect CLI application with intelligent performance optimization.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm package manager
- TypeScript knowledge
- Basic understanding of Effect.js

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd effect-cli

# Install dependencies
pnpm install

# Verify setup
pnpm test
pnpm check
pnpm build
```

### Development Workflow

```bash
# Development with intelligent layer loading (optimized)
pnpm dev greet "Test"         # Fast execution, minimal logging
pnpm dev queue status         # Full system initialization when needed

# Type checking
pnpm check

# Run tests
pnpm test

# Format code
pnpm format

# Lint code
pnpm lint

# Build for production (optimized bundle)
pnpm build
```

## Adding New Commands

### 1. Create Command File

Create a new command file in `src/commands/`:

```typescript
// src/commands/MyCommand.ts
import * as Command from "@effect/cli/Command"
import * as Args from "@effect/cli/Args"
import * as Options from "@effect/cli/Options"
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"

// Define arguments
const nameArg = Args.text("name").pipe(
  Args.withDescription("Name to greet")
)

// Define options
const verboseOption = Options.boolean("verbose").pipe(
  Options.withAlias("v"),
  Options.withDescription("Enable verbose output")
)

// Create command
export const myCommand = Command.make("my-command", {
  name: nameArg,
  verbose: verboseOption
}).pipe(
  Command.withDescription("My custom command"),
  Command.withHandler(({ name, verbose }) =>
    Effect.gen(function* () {
      if (verbose) {
        yield* Console.log(`Processing command for: ${name}`)
      }
      yield* Console.log(`Hello, ${name}!`)
    })
  )
)
```

### 2. Register Command

Add your command to the CLI configuration:

```typescript
// src/Cli.ts
import { myCommand } from "./commands/MyCommand.js"

export const cli = Command.make("effect-cli", {}, {
  // ... existing commands
  myCommand,
}).pipe(
  // ... rest of configuration
)
```

### 3. Add Tests

Create tests for your command:

```typescript
// test/commands/MyCommand.test.ts
import { describe, expect, it } from "vitest"
import { Effect, TestContext } from "effect"
import { myCommand } from "../../src/commands/MyCommand.js"

describe("MyCommand", () => {
  it("should greet with name", () =>
    Effect.gen(function* () {
      const result = yield* myCommand.handler({
        name: "World",
        verbose: false
      })
      // Add assertions
    }).pipe(Effect.provide(TestContext.TestContext))
  )
})
```

## Project Architecture

### Core Structure

```
src/
├── commands/              # CLI command implementations
│   ├── GreetCommand.ts       # Basic greeting (optimized execution)
│   ├── QueueCommand.ts       # Queue management (full system)
│   └── QueueStatusCommand.ts # Queue monitoring (full system)
├── services/              # Business logic services
│   ├── Queue/                # Queue system (conditional loading)
│   ├── UserExperience/       # UX enhancements
│   ├── FileSystem.ts         # File operations interface
│   └── FileSystemLive.ts     # File operations implementation
├── examples/              # Example commands (toggleable)
│   ├── ListCommand.ts        # File listing example
│   ├── SampleCommand.ts      # Comprehensive example
│   └── config.ts            # Example configuration
├── Cli.ts                # Main CLI configuration (clean routing)
└── bin.ts                # Application entry point (intelligent layer loading)
```

### Service Layer Pattern

The CLI uses Effect's service layer pattern for dependency injection:

```typescript
// Define service interface
export interface MyService {
  readonly doSomething: (input: string) => Effect.Effect<string, MyError>
}

// Create service tag
export const MyService = Context.GenericTag<MyService>("MyService")

// Implement service
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    return {
      doSomething: (input: string) =>
        Effect.gen(function* () {
          // Implementation
          return `Processed: ${input}`
        })
    }
  })
)

// Use in command
export const myCommand = Command.make("my-command", { input: Args.text("input") }).pipe(
  Command.withHandler(({ input }) =>
    Effect.gen(function* () {
      const service = yield* MyService
      const result = yield* service.doSomething(input)
      yield* Console.log(result)
    })
  )
)
```

## Queue System Integration

### Using the Queue System

The CLI includes a sophisticated queue system for task management:

```typescript
import { InternalQueue } from "../services/Queue/index.js"

export const queueCommand = Command.make("queue-demo", {}).pipe(
  Command.withHandler(() =>
    Effect.gen(function* () {
      const queue = yield* InternalQueue

      // Add task to queue
      yield* queue.enqueue({
        id: "task-1",
        name: "Sample Task",
        resourceGroup: "computation",
        priority: 1,
        task: Effect.succeed("Task completed")
      })

      // Process tasks
      yield* queue.processNext("computation")
    })
  )
)
```

### Queue Resource Groups

The queue system supports four resource groups:

1. **filesystem**: File I/O operations
2. **network**: Network requests
3. **computation**: CPU-intensive tasks
4. **memory-intensive**: High memory usage tasks

## Testing

### Test Structure

```
test/
├── commands/              # Command tests
├── services/              # Service tests
└── integration/           # Integration tests
```

### Writing Tests

Use Vitest with Effect's testing utilities:

```typescript
import { describe, expect, it } from "vitest"
import { Effect, TestContext } from "effect"

describe("MyCommand", () => {
  it("should handle success case", () =>
    Effect.gen(function* () {
      // Test implementation
      const result = yield* myCommand.handler({ input: "test" })
      expect(result).toBe("expected")
    }).pipe(
      Effect.provide(TestContext.TestContext),
      Effect.runPromise
    )
  )

  it("should handle error case", () =>
    Effect.gen(function* () {
      // Test error scenarios
      const result = yield* Effect.either(
        myCommand.handler({ input: "invalid" })
      )
      expect(result._tag).toBe("Left")
    }).pipe(
      Effect.provide(TestContext.TestContext),
      Effect.runPromise
    )
  )
})
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test MyCommand.test.ts

# Run tests with coverage
pnpm coverage

# Watch mode for development
pnpm test --watch
```

## Build and Distribution

### Build Process

```bash
# Build TypeScript to CommonJS
pnpm build

# Check build output
ls -la dist/
```

The build process:
1. Compiles TypeScript to CommonJS (`dist/bin.cjs`)
2. Copies `package.json` with correct configuration
3. Copies SQL schema files for queue system

### Global Installation

```bash
# Build and install globally
pnpm build
cd dist
npm link

# Verify installation
effect-cli --help
```

### Distribution

```bash
# Prepare for publishing
pnpm changeset

# Version bump
pnpm changeset-version

# Publish
pnpm changeset-publish
```

## Configuration

### Example Commands

Control example command visibility:

```typescript
// src/examples/config.ts
export const ENABLE_EXAMPLES = true

export const ExampleConfig = {
  LIST_COMMAND: true,
  SAMPLE_COMMAND: true,
  // ... other examples
}
```

### Environment Variables

The CLI respects these environment variables:

- `LOG_LEVEL`: Set logging level (debug, info, warning, error)
- `QUEUE_DB_PATH`: Custom path for queue database
- `MAX_QUEUE_SIZE`: Maximum queue size

## Debugging

### Development Debugging

```bash
# Enable debug logging
effect-cli --log-level debug greet "Test"

# Use TypeScript directly
tsx src/bin.ts greet "Test"
```

### VS Code Integration

Use the included VS Code configuration:

1. Install Effect VS Code extension
2. Set breakpoints in TypeScript files
3. Run debugger with F5

### Queue System Debugging

```bash
# Monitor queue status
effect-cli queue status --watch

# Export queue metrics
effect-cli queue export --format json -o debug-metrics.json

# View detailed queue information
effect-cli queue status --detailed
```

## Performance Optimization

### Intelligent Layer Loading

The CLI implements intelligent layer loading for optimal performance:

```typescript
// bin.ts - Key optimization patterns
const needsQueueSystem = (argv: string[]) => {
  const commandKeywords = ['queue', 'queue-status', 'queue-demo']
  return commandKeywords.some(keyword => argv.includes(keyword))
}

// Simple layer for basic commands (greet, help)
const SimpleAppLayer = mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  NodePath.layer,
  LoggerLayer
)

// Full layer for queue commands
const FullAppLayer = mergeAll(
  AppLayer,
  BasicQueueSystemLayer,
  DevToolsLive
)

// Dynamic layer selection
const selectedLayer = needsQueueSystem(process.argv) ? FullAppLayer : SimpleAppLayer
```

### Code Splitting

Commands are automatically code-split. Heavy operations should be lazy-loaded:

```typescript
const heavyOperation = Effect.suspend(() => import("./heavy-module.js"))
```

### Memory Management

- Use streaming for large files
- Implement proper cleanup in Effect cleanup functions
- Monitor queue size and implement backpressure
- Conditional service initialization saves 40-60% startup time

### Bundle Analysis

```bash
# Analyze bundle size
npx tsup --analyze

# Check dependencies
pnpm why <package-name>

# Performance testing
effect-cli greet "Test"     # Should be fast, minimal output
effect-cli queue status     # Full initialization when needed
```

## Contributing

### Code Style

- Follow TypeScript strict mode
- Use Effect.js patterns consistently
- Write comprehensive tests
- Document public APIs with JSDoc

### Commit Messages

Use conventional commits:

```
feat: add new queue export command
fix: resolve memory leak in file processing
docs: update CLI usage guide
test: add integration tests for queue system
```

### Pull Requests

1. Create feature branch
2. Write tests
3. Update documentation
4. Ensure all checks pass
5. Request review

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Run `pnpm check` to identify issues
2. **Test Failures**: Check Effect service dependencies
3. **Build Issues**: Clear dist folder and rebuild
4. **Queue Database**: Delete queue database to reset state

### Getting Help

- Check documentation in `docs/` directory
- Review test files for usage examples
- Examine existing commands for patterns
- Use Effect.js documentation for framework questions