# CLI Development Guide

## Overview

이 문서는 Effect CLI 프로젝트에서 새로운 CLI 커맨드를 추가하는 방법과 테스트 구성에 대해 설명합니다.

## CLI Command 구조

### 기본 커맨드 구조

```typescript
import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Effect from "effect/Effect"

// 1. 인자 정의
const nameArg = Args.text({ name: "name" }).pipe(
  Args.withDescription("The name to greet")
)

// 2. 커맨드 생성
export const myCommand = Command.make("my-command", { name: nameArg }).pipe(
  Command.withDescription("My command description"),
  Command.withHandler(({ name }) =>
    Effect.gen(function*() {
      // 커맨드 로직 구현
      yield* Effect.log(`Hello, ${name}!`)
    })
  )
)
```

### 현재 구현된 커맨드들

- **GreetCommand**: 기본 템플릿 커맨드
- **QueueCommand**: 큐 관리 커맨드 (add, remove, list, clear)
- **QueueStatusCommand**: 큐 상태 조회
- **SimpleQueueCommand**: 간단한 큐 작업 추가

## 새 커맨드 추가하기

### 1. 커맨드 파일 생성

`src/commands/`에 새로운 TypeScript 파일을 생성합니다:

```typescript
// src/commands/MyNewCommand.ts
import { log } from "effect/Console"
import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as Effect from "effect/Effect"

// 옵션 정의 (선택사항)
const verboseOption = Options.boolean("verbose").pipe(
  Options.withAlias("v"),
  Options.withDescription("Enable verbose output")
)

// 인자 정의
const targetArg = Args.text({ name: "target" }).pipe(
  Args.withDescription("Target to process")
)

export const myNewCommand = Command.make(
  "my-new-command",
  { target: targetArg },
  { verbose: verboseOption }
).pipe(
  Command.withDescription("Description of my new command"),
  Command.withHandler(({ target }, { verbose }) =>
    Effect.gen(function*() {
      if (verbose) {
        yield* log(`Processing target: ${target}`)
      }

      // 비즈니스 로직 구현
      const result = yield* performOperation(target)

      yield* log(`Result: ${result}`)
    })
  )
)

const performOperation = (target: string): Effect.Effect<string> =>
  Effect.succeed(`Processed: ${target}`)
```

### 2. 커맨드 등록

`src/commands/index.ts`에서 새 커맨드를 등록합니다:

```typescript
// 새 커맨드 import
import { myNewCommand } from "./MyNewCommand.js"

// mainCommands 배열에 추가
export const mainCommands = [
  greetCommand,
  queueCommand,
  queueStatusCommand,
  simpleQueueCommand,
  myNewCommand  // 추가
]

// 개별 export에도 추가
export {
  greetCommand,
  queueCommand,
  queueStatusCommand,
  simpleQueueCommand,
  myNewCommand  // 추가
}
```

### 3. CLI에 추가

`src/Cli.ts`에서 새 커맨드를 CLI에 등록합니다:

```typescript
// 커맨드 import
import {
  greetCommand,
  queueCommand,
  queueStatusCommand,
  simpleQueueCommand,
  myNewCommand  // 추가
} from "./commands/index.js"

// 서브커맨드에 추가
const command = mainCommand.pipe(
  Command.withSubcommands([
    greetCommand,
    queueCommand,
    queueStatusCommand,
    simpleQueueCommand,
    myNewCommand  // 추가
  ])
)
```

## 커맨드 개발 패턴

### 1. Effect 패턴 사용

```typescript
// Effect.gen을 사용한 비동기 처리
Effect.gen(function*() {
  const result = yield* someAsyncOperation()
  yield* log(`Result: ${result}`)
})
```

### 2. 서비스 의존성 주입

```typescript
import { QueueService } from "../services/Queue/index.js"

export const queueCommand = Command.make("queue").pipe(
  Command.withHandler(() =>
    Effect.gen(function*() {
      const queueService = yield* QueueService
      const status = yield* queueService.getStatus()
      // ...
    })
  )
)
```

### 3. 에러 핸들링

```typescript
Effect.gen(function*() {
  const result = yield* riskyOperation().pipe(
    Effect.catchAll((error) =>
      Effect.gen(function*() {
        yield* log(`Error: ${error.message}`)
        return "default-value"
      })
    )
  )
})
```

## 테스트 작성하기

### 테스트 파일 위치

테스트 파일은 `test/commands/` 디렉토리에 생성합니다:

```
test/
├── commands/
│   ├── MyNewCommand.test.ts
│   └── GreetCommand.test.ts
├── utils/
│   └── effectTestUtils.ts
└── ...
```

### 테스트 구조 예시

```typescript
// test/commands/MyNewCommand.test.ts
import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { myNewCommand } from "../../src/commands/MyNewCommand.js"
import { runTestEffect } from "../utils/effectTestUtils.js"

describe("MyNewCommand", () => {
  it("should process target correctly", async () => {
    const result = await runTestEffect(
      Effect.gen(function*() {
        // 커맨드 실행
        const output = yield* Effect.sync(() => {
          // 커맨드 로직 테스트
          return "expected-output"
        })

        expect(output).toBe("expected-output")
      })
    )
  })

  it("should handle errors gracefully", async () => {
    await runTestEffect(
      Effect.gen(function*() {
        // 에러 케이스 테스트
        const result = yield* Effect.tryPromise(() =>
          Promise.reject(new Error("Test error"))
        ).pipe(
          Effect.catchAll(() => Effect.succeed("handled"))
        )

        expect(result).toBe("handled")
      })
    )
  })
})
```

## 빌드 및 실행

### 개발 중 테스트

```bash
# 타입 체크
npm run check

# 테스트 실행
npm test

# 빌드
npm run build

# CLI 실행
node dist/bin.cjs my-new-command "target-value" --verbose
```

### 디버깅

```bash
# 특정 테스트 파일만 실행
npm test -- MyNewCommand.test.ts

# 빌드 없이 TypeScript로 직접 실행 (개발용)
npx tsx src/bin.ts my-new-command "target-value"
```

## 모범 사례

1. **타입 안전성**: `any` 타입 사용 금지, 적절한 타입 정의
2. **Effect 패턴**: Effect.gen을 사용한 함수형 프로그래밍 패턴
3. **에러 핸들링**: Effect의 에러 처리 패턴 활용
4. **테스트 커버리지**: 모든 주요 기능에 대한 테스트 작성
5. **문서화**: 커맨드와 옵션에 대한 명확한 설명 제공

## 참고 자료

- [Effect CLI 문서](https://effect.website/docs/cli/introduction)
- [Effect 가이드](https://effect.website/docs/introduction)
- 기존 커맨드 구현체: `src/commands/` 디렉토리 참조