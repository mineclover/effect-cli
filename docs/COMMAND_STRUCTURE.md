# 명령어 구조 가이드

Effect CLI의 명령어 구조와 패턴을 설명합니다.

## 기본 명령어 패턴

### 현재 구현된 명령어

1. **ls** - 디렉토리 목록 조회
2. **cat** - 파일 내용 읽기  
3. **find** - 파일 검색

## 명령어 구성 요소

### 1. Arguments (인수)

**필수 인수**
```typescript
const fileArg = Args.file({ name: "file" }).pipe(
  Args.withDescription("File to read")
)
```

**기본값이 있는 선택적 인수**
```typescript
const pathArg = Args.directory({ name: "path" }).pipe(
  Args.withDefault("."),
  Args.withDescription("Directory path")
)
```

### 2. Options (옵션)

**Boolean 옵션**
```typescript
const longOption = Options.boolean("long").pipe(
  Options.withAlias("l"),
  Options.withDescription("Use long listing format")
)
```

**Choice 옵션**
```typescript
const typeOption = Options.choice("type", ["f", "d"]).pipe(
  Options.withDescription("Filter by type: f=files, d=directories"),
  Options.optional
)
```

**Integer 옵션**
```typescript
const maxDepthOption = Options.integer("max-depth").pipe(
  Options.withDescription("Maximum search depth"),
  Options.optional
)
```

## 핸들러 구현 패턴

### 기본 구조

```typescript
Command.withHandler(({ arg1, option1, option2 }) =>
  Effect.gen(function* () {
    // 1. 시작 로그
    yield* Effect.log(`Command started with: ${arg1}`)
    
    // 2. Optional 처리
    if (Option.isSome(option2)) {
      const value = option2.value
      // 처리 로직
    }
    
    // 3. 핵심 로직 실행
    const result = yield* someOperation(arg1)
    
    // 4. 결과 출력
    yield* Console.log("Result output")
    
    // 5. 완료 로그
    yield* Effect.log("Command completed")
  }).pipe(
    Effect.withSpan("command-name", { 
      attributes: { arg: arg1 } 
    })
  )
)
```

## 명령어별 패턴 분석

### ls 명령어
- **인수**: `path` (기본값: ".")
- **옵션**: `--long/-l`, `--all/-a`
- **특징**: 파일 정렬, 아이콘 표시, 요약 정보

### cat 명령어  
- **인수**: `file` (필수)
- **옵션**: `--number/-n`, `--show-ends/-E`, `--show-tabs/-T`
- **특징**: 라인별 처리, 포맷팅 옵션

### find 명령어
- **인수**: `path` (기본값: "."), `pattern` (필수)
- **옵션**: `--type`, `--max-depth`, `--case-sensitive/-c`
- **특징**: 재귀 검색, 필터링, Optional 처리

## 공통 유틸리티 함수

### FileSystem.ts의 함수들

```typescript
// 디렉토리 목록 조회
listDirectory(dirPath: string): Effect<FileInfo[]>

// 파일 내용 읽기
readFileContent(filePath: string): Effect<string>

// 파일 검색
findFiles(searchPath: string, pattern: string): Effect<FileInfo[]>
```

### FileInfo 인터페이스

```typescript
interface FileInfo {
  readonly name: string
  readonly path: string  
  readonly isDirectory: boolean
  readonly size: bigint
}
```

## 에러 처리 패턴

### 파일시스템 에러
```typescript
const stat = yield* fs.stat(fullPath).pipe(
  Effect.catchAll(() => Effect.succeed(null))
)

if (!stat) continue
```

### 결과 없음 처리
```typescript
if (results.length === 0) {
  yield* Console.log("No results found")
  return
}
```

## 출력 포맷팅 패턴

### 아이콘 사용
```typescript
const icon = file.isDirectory ? "📁" : "📄"
const type = file.isDirectory ? "[DIR]" : "[FILE]"
```

### 테이블 형태
```typescript
if (long) {
  yield* Console.log("Type Size     Name")
  yield* Console.log("---- -------- ----")
}
```

### 요약 정보
```typescript
yield* Console.log(`\nTotal: ${fileCount} files, ${dirCount} directories`)
```

## 명령어 등록 패턴

### src/Cli.ts
```typescript
const command = Command.make("file-explorer").pipe(
  Command.withSubcommands([
    listCommand,
    catCommand, 
    findCommand
  ])
)

export const run = Command.run(command, {
  name: "Effect File Explorer CLI",
  version: "1.0.0"
})
```