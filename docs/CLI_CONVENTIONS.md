# CLI 확장 컨벤션

Effect CLI 프로젝트의 명령어 확장을 위한 일관된 규칙과 구조입니다.

## 프로젝트 구조

```
src/
├── commands/           # 개별 명령어 구현
│   ├── ListCommand.ts
│   ├── CatCommand.ts
│   └── FindCommand.ts
├── FileSystem.ts       # 공통 파일시스템 유틸리티
├── Cli.ts             # 메인 CLI 설정
└── bin.ts             # 실행 진입점 (DevTools 포함)
```

## 명령어 구현 규칙

### 파일 구조

**명령어 파일명**: `{CommandName}Command.ts`
- PascalCase 사용
- 예: `ListCommand.ts`, `FindCommand.ts`

### 필수 임포트

```typescript
import * as Command from "@effect/cli/Command"
import * as Args from "@effect/cli/Args"
import * as Options from "@effect/cli/Options"
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
```

### 명령어 구조 템플릿

```typescript
// 1. 인수 정의
const requiredArg = Args.text({ name: "argName" }).pipe(
  Args.withDescription("설명")
)

const optionalArg = Args.text({ name: "argName" }).pipe(
  Args.withDefault("기본값"),
  Args.withDescription("설명")
)

// 2. 옵션 정의
const booleanOption = Options.boolean("옵션명").pipe(
  Options.withAlias("단축키"),
  Options.withDescription("설명")
)

const choiceOption = Options.choice("type", ["값1", "값2"]).pipe(
  Options.withDescription("설명"),
  Options.optional  // Optional 옵션의 경우
)

// 3. 명령어 정의
export const commandName = Command.make("command-name", {
  arg1: requiredArg,
  option1: booleanOption
}).pipe(
  Command.withDescription("명령어 설명"),
  Command.withHandler(({ arg1, option1 }) =>
    Effect.gen(function* () {
      yield* Effect.log(`명령어 시작: ${arg1}`)
      
      // 명령어 로직 구현
      
      yield* Effect.log("명령어 완료")
    }).pipe(
      Effect.withSpan("command-span", { 
        attributes: { commandName: "명령어명" } 
      })
    )
  )
)
```

## 옵션 타입 처리

### Optional 옵션 사용법

```typescript
// Option 타입 처리
if (Option.isSome(optionalValue)) {
  const value = optionalValue.value
  // value 사용
}

// 필수 import
import * as Option from "effect/Option"
```

## 로깅 및 트레이싱

### Effect.log 사용

```typescript
yield* Effect.log("작업 시작")
yield* Effect.log(`변수값: ${variable}`)
```

### Span 추가 (DevTools용)

```typescript
Effect.withSpan("operation-name", { 
  attributes: { 
    key: "value",
    command: "명령어명"
  } 
})
```

## 에러 처리

### 파일 시스템 에러 처리

```typescript
const result = yield* fs.readFile(path).pipe(
  Effect.catchAll((error) => {
    yield* Effect.log(`파일 읽기 실패: ${path}`)
    return Effect.succeed(null)
  })
)
```

## 출력 포맷팅

### Console.log 사용

```typescript
yield* Console.log("사용자에게 표시될 내용")
yield* Console.log(`변수 포함: ${variable}`)
```

### 아이콘 사용

```typescript
const fileIcon = file.isDirectory ? "📁" : "📄"
yield* Console.log(`${fileIcon} ${file.name}`)
```

## 메인 CLI 등록

### src/Cli.ts 수정

```typescript
import { newCommand } from "./commands/NewCommand.js"

const command = Command.make("file-explorer").pipe(
  Command.withSubcommands([
    listCommand, 
    catCommand, 
    findCommand,
    newCommand  // 새 명령어 추가
  ])
)
```

## 타입 정의

### 공통 인터페이스 (src/FileSystem.ts)

```typescript
export interface FileInfo {
  readonly name: string
  readonly path: string
  readonly isDirectory: boolean
  readonly size: bigint
}
```

## 빌드 및 테스트

### 개발 시 확인사항

1. 타입 체크: `pnpm check`
2. 빌드: `pnpm build`
3. 테스트: `node dist/bin.cjs command-name --help`

### DevTools 활용

- VS Code에서 Effect DevTools 패널 사용
- 실행 시 트레이싱 정보 확인
- 성능 메트릭 모니터링