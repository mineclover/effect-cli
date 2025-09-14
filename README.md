# Effect CLI Application Framework

> 📚 **Full Documentation**: [docs/INDEX.md](docs/INDEX.md)

A production-ready framework for building type-safe, scalable command-line applications using Effect.js and @effect/cli.

## 🚀 Quick Start

### Installation & Setup

```bash
# Install dependencies
pnpm install

# Run tests to verify setup
pnpm test

# Build the project
pnpm build
```

### Basic Usage

```bash
# Show available commands
pnpm dev --help

# Try the greet command
pnpm dev greet "Your Name"

# Queue management
pnpm dev queue add "sample task" --type computation
pnpm dev queue-status

# Simple queue operations
pnpm dev simple-queue "background task"

# List files (example command)
pnpm dev list ./
```

## 🎯 Project Structure

### Core Framework (`src/`)
```
src/
├── commands/           # 🎯 Main CLI Commands
│   ├── GreetCommand.ts     # Basic greeting example
│   ├── QueueCommand.ts     # Advanced queue management
│   ├── QueueStatusCommand.ts
│   └── SimpleQueueCommand.ts
├── examples/           # 📚 CLI Pattern Examples
│   ├── ListCommand.ts      # File operations example
│   ├── SampleCommand.ts    # Comprehensive patterns
│   └── config.ts          # Example configuration
├── services/           # 🔧 Core Services
│   ├── Queue/              # Task queue management system
│   ├── UserExperience/     # UX enhancement services
│   ├── FileSystem.ts       # File system interface
│   └── FileSystemLive.ts   # File system implementation
├── Cli.ts             # Main CLI configuration
└── bin.ts             # CLI entry point
```

### Development Guides (`docs/testing/`)
```
docs/testing/
├── TDD_GUIDELINES.md       # Test-driven development guide
├── TEST_CONVENTIONS.md     # Testing standards and patterns
└── TESTING_REFERENCE.md    # Complete testing reference
```

## ✨ Core Features

- **🔒 Type-Safe CLI**: Fully typed arguments, options, and command handlers
- **⚡ Effect.js Integration**: Error handling, dependency injection, and composability
- **📦 Queue Management**: Production-ready task queue system with monitoring
- **🧪 TDD Framework**: Comprehensive testing infrastructure and guidelines
- **🎨 Auto-formatting**: Integrated ESLint and Prettier
- **🏗️ Service Pattern**: Effect service layers and dependency injection

## 📖 Documentation

### Development Guides
- **[🛠️ CLI Development Guide](docs/CLI_DEVELOPMENT.md)** - How to add new CLI commands
- **[🧪 Testing Guide](docs/TESTING_GUIDE.md)** - Testing setup and best practices
- **[📋 Test Conventions](docs/testing/TEST_CONVENTIONS.md)** - Detailed testing standards
- **[🏗️ TDD Guidelines](docs/testing/TDD_GUIDELINES.md)** - Test-driven development approach

### Queue System (Core Feature)
- **[🚀 Quick Start Guide](docs/queue-system/README.md)** - Get started with the queue system
- **[📘 Complete User Guide](docs/EFFECT_CLI_QUEUE_SYSTEM.md)** - Comprehensive documentation
- **[🔧 API Reference](docs/QUEUE_SYSTEM_API.md)** - Technical API documentation
- **[💡 Examples](docs/queue-system/examples.md)** - Code examples and patterns

### Technical References
- **[📚 Testing Reference](docs/testing/TESTING_REFERENCE.md)** - Complete testing guide
- **[🎯 Effect Patterns](docs/api/EFFECT_PATTERNS.md)** - Effect.js patterns and usage

## 🔧 Development

### Adding New Commands

1. **Create Command File**: Create new command in `src/commands/`
2. **Register Command**: Add to `src/commands/index.ts` and `src/Cli.ts`
3. **Write Tests**: Add tests in `test/commands/`
4. **Validate**: Run `pnpm run check` and `pnpm test`

See [CLI Development Guide](docs/CLI_DEVELOPMENT.md) for detailed instructions.

### Example Commands

Try these example commands to explore the patterns:

```bash
# List files in current directory
pnpm dev list ./

# Try the comprehensive sample command
pnpm dev sample package.json ./ "ts"

# Sample with verbose output and JSON format
pnpm dev sample --verbose --format json package.json ./ "config"

# See all available commands
pnpm dev --help
```

The `sample` command demonstrates advanced CLI patterns including:
- Multiple argument types and validation
- Output formatting (text, JSON, table)
- File system operations with Effect.js
- Error handling and user experience

### Development Commands

```bash
# Run in development mode
pnpm dev [command] [args]

# Run tests
pnpm test

# Type check
pnpm check

# Format code
pnpm format

# Build for production
pnpm build
```

### Adding Your Own Commands

Create a new command in `src/commands/`:

```typescript
// src/commands/MyCommand.ts
import * as Command from "@effect/cli/Command"
import * as Args from "@effect/cli/Args"
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"

const nameArg = Args.text("name").pipe(
  Args.withDescription("Your name")
)

export const myCommand = Command.make("greet", { name: nameArg }).pipe(
  Command.withDescription("Greet someone"),
  Command.withHandler(({ name }) =>
    Effect.gen(function* () {
      yield* Console.log(`Hello, ${name}!`)
    })
  )
)
```

Register it in `src/commands/index.ts`:

```typescript
import { myCommand } from "./MyCommand.js"

export const productionCommands = [
  myCommand,
]
```

### Managing Examples

Examples can be toggled via `src/examples/config.ts`:

```typescript
export const ENABLE_EXAMPLES = false // Disable all examples
export const ExampleConfig = {
  LIST_COMMAND: true,
  SAMPLE_COMMAND: false, // Disable specific command
  // ...other examples
}
```

📖 **더 자세한 내용**: [Configuration > Examples](docs/configuration/EXAMPLES.md)

