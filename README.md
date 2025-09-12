# Effect CLI Application Template

> 📚 **Full Documentation**: [docs/INDEX.md](docs/INDEX.md)

A comprehensive template for building type-safe, scalable command-line applications using Effect.js and @effect/cli.

## 📖 Documentation

### Queue System Documentation
- **[🚀 Quick Start Guide](docs/queue-system/README.md)** - Get started with the queue system
- **[📘 Complete User Guide](docs/EFFECT_CLI_QUEUE_SYSTEM.md)** - Comprehensive documentation
- **[🔧 API Reference](docs/QUEUE_SYSTEM_API.md)** - Technical API documentation
- **[💡 Examples](docs/queue-system/examples.md)** - Code examples and patterns
- **[🏗️ Architecture](docs/development/queue-plan/README.md)** - System design and implementation

### General Documentation
- **[📚 Main Index](docs/INDEX.md)** - Complete documentation index
- **[⚙️ Configuration](docs/configuration/EXAMPLES.md)** - Configuration guide
- **[🎯 Effect Patterns](docs/api/EFFECT_PATTERNS.md)** - Effect.js patterns and usage

## ✨ Key Features

- **🔒 Type-Safe CLI**: Fully typed arguments, options, and command handlers
- **⚡ Effect.js Integration**: Error handling, dependency injection, and composability  
- **📦 Modular Architecture**: Clean separation between production and example commands
- **🎛️ Configurable Examples**: Easy-to-toggle sample commands for learning
- **🎨 Auto-formatting**: Integrated ESLint and Prettier
- **🏗️ Service Pattern**: Effect service layers and dependency injection
- **⚡ Queue System**: Built-in task queue management with persistence and monitoring 

## Running Code

This template leverages [tsx](https://tsx.is) to allow execution of TypeScript files via NodeJS as if they were written in plain JavaScript.

To execute a file with `tsx`:

```sh
pnpm tsx ./path/to/the/file.ts
```

## Operations

**Building**

To build the package:

```sh
pnpm build
```

**Testing**

To test the package:

```sh
pnpm test
```

**Code Formatting**

To format the code:

```sh
# Format all files
pnpm format

# Format with watch mode (auto-format on file changes)
pnpm format:watch
```

## Code Formatting Setup

이 프로젝트는 저장 시 자동 포맷팅이 설정되어 있습니다:

### VSCode 설정
- `"editor.formatOnSave": true` - 저장 시 자동 포맷
- `"source.fixAll.eslint": "always"` - ESLint 자동 수정
- `"source.organizeImports": "always"` - import 자동 정리

### 수동 포맷팅
```sh
# 전체 프로젝트 포맷
pnpm format

# 파일 변경 감지하여 자동 포맷 (개발 중 유용)
pnpm format:watch
```

VSCode에서 파일을 저장하면 자동으로 ESLint 규칙에 따라 포맷팅됩니다.

## Project Structure

```
src/
├── commands/           # Production commands
│   └── index.ts       # Production command registry
├── examples/          # Example/demo commands  
│   ├── config.ts      # Example command configuration
│   ├── index.ts       # Example command registry
│   ├── ListCommand.ts # File listing example
│   ├── CatCommand.ts  # File reading example
│   ├── FindCommand.ts # File searching example
│   └── SampleCommand.ts # Comprehensive patterns
├── services/          # Effect services
│   ├── FileSystem.ts  # FileSystem service interface
│   └── FileSystemLive.ts # FileSystem implementation
├── Cli.ts            # Main CLI configuration
└── bin.ts            # CLI entry point
```

## Quick Start

### 1. Install Dependencies
```sh
pnpm install
```

### 2. Try Example Commands
```sh
# List files in current directory
pnpm dev list ./

# List with detailed information
pnpm dev list --long ./

# Try the comprehensive sample command
pnpm dev sample package.json ./ "ts"

# Sample with verbose output and JSON format
pnpm dev sample --verbose --format json package.json ./ "config"

# Sample with table format and limit results
pnpm dev sample --format table --limit 5 package.json ./ "md"

# See all available commands
pnpm dev --help

# Check specific command help
pnpm dev sample --help

# Try the Queue System Demo
pnpm tsx src/examples/QueueDemo.ts

# Check Queue Status
pnpm tsx src/examples/QueueStatusCommand.ts
```

### 3. Sample Command Examples

The `sample` command demonstrates various CLI patterns:

**Basic Usage:**
```sh
pnpm dev sample <file> <path> <pattern>
```

**Advanced Options:**
```sh
# Verbose mode with JSON output
pnpm dev sample --verbose --format json package.json ./ "config"

# Table format with result limit
pnpm dev sample --format table --limit 3 README.md src/ "Command"

# Default text format
pnpm dev sample package.json ./ "ts"
```

**Sample Command Features:**
- **Arguments**: File to read, directory to search, search pattern
- **Output Formats**: `text` (default), `json`, `table`
- **Options**: `--verbose`, `--limit`, `--format`
- **File Analysis**: Shows file content preview and line count
- **Directory Search**: Finds files/folders matching the pattern
- **Flexible Output**: Multiple format options for different use cases

### 4. Queue System Usage

The template includes a comprehensive queue system for managing background tasks:

```typescript
import { 
  QueueSystem,
  queueFileOperation,
  queueComputationTask,
  initializeQueueSystem,
  getQueueStatus 
} from "./services/Queue/index.js"

// Initialize queue system
const sessionId = yield* initializeQueueSystem()

// Queue file operations
const taskId = yield* queueFileOperation(
  Effect.gen(function* () {
    // Your file operation here
    return yield* readFile("data.txt")
  }),
  {
    type: "file-read",
    filePath: "data.txt",
    priority: 1 // High priority
  }
)

// Queue computations
yield* queueComputationTask(
  Effect.gen(function* () {
    // Your computation here
    return complexCalculation(data)
  }),
  {
    priority: 5,
    isMemoryIntensive: true
  }
)

// Monitor queue status
const status = yield* getQueueStatus()
console.log(`Pending: ${status.queue.totalPending}`)
```

### 5. Add Your Own Commands

Learn from the comprehensive sample command pattern first:
- 📄 **[SimpleSampleCommand.ts](src/examples/SimpleSampleCommand.ts)** - Complete example with all patterns
- 📄 **[SimpleListCommand.ts](src/examples/SimpleListCommand.ts)** - Basic file system usage

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

## Managing Examples

### Disable All Examples

Edit `src/examples/config.ts`:

```typescript
export const ENABLE_EXAMPLES = false
```

### Disable Specific Examples

```typescript
export const ExampleConfig = {
  LIST_COMMAND: true,
  CAT_COMMAND: false,    // Disable cat command
  FIND_COMMAND: true,
  SAMPLE_COMMAND: false, // Disable sample command
  ADVANCED_COMMAND: true,
}
```

### Auto-disable in Production

```typescript
// Uncomment this line in config.ts
export const ENABLE_EXAMPLES = process.env.NODE_ENV !== 'production'
```

📖 **자세한 내용**: [Configuration > Examples](docs/configuration/EXAMPLES.md)

## 🏗️ Effect.js Patterns

주요 패턴들 (자세한 설명은 문서 참조):

- **Effect.gen**: Generator 스타일 비동기 처리
- **Service Pattern**: Context.GenericTag를 통한 의존성 주입  
- **Error Handling**: 타입 안전한 에러 관리
- **CLI Integration**: 타입 안전한 명령행 인터페이스

📖 **자세한 내용**: [API > Effect Patterns](docs/api/EFFECT_PATTERNS.md)

## Development

### Running in Development
```sh
# Run with hot reload
pnpm dev [command] [args]

# Example: List files with verbose output  
pnpm dev list --all --long ./src
```

### Building for Production
```sh
# Build the project
pnpm build

# Run built version
node dist/bin.js [command] [args]
```

### Testing
```sh
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

