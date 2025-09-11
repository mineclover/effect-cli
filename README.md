# Effect CLI Application Template

A comprehensive template for building type-safe, scalable command-line applications using Effect.js and @effect/cli.

## Features

- **Type-Safe CLI**: Fully typed arguments, options, and command handlers
- **Effect.js Integration**: Leverages Effect for error handling, dependency injection, and composability  
- **Modular Architecture**: Clean separation between production and example commands
- **Configurable Examples**: Easy-to-toggle sample commands for learning and development
- **Auto-formatting**: Integrated ESLint and Prettier with save-on-format
- **Service Pattern**: Demonstrates Effect service layers and dependency injection 

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

# Read a file  
pnpm dev cat package.json

# Search for TypeScript files
pnpm dev find ./ "*.ts"

# See all available commands
pnpm dev --help
```

### 3. Add Your Own Commands

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

For detailed example management, see [EXAMPLES.md](./EXAMPLES.md).

## Effect.js Patterns

This template demonstrates key Effect.js patterns:

- **Effect.gen**: Generator-style async/await syntax
- **Service Pattern**: Dependency injection with Context.GenericTag
- **Error Handling**: Type-safe error management
- **CLI Integration**: Type-safe command-line interfaces

For detailed Effect.js documentation, see the [Effect.js guide](./docs/effect-js-guide.md).

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

