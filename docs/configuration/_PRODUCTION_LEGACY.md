# Production Deployment Guide

## 🚀 Quick Production Setup

프로덕션 환경에서 example 커맨드를 제거하고 깔끔한 CLI를 배포하는 가이드입니다.

### ⚡ 가장 간단한 방법

**src/Cli.ts**에서 import 라인 하나만 제거:

```typescript
// From: src/Cli.ts - 서브커맨드 등록 패턴
import * as Command from "@effect/cli/Command"
import * as Console from "effect/Console"

// Example commands (configurable via examples/config.ts)
// import { advancedCommand, catCommand, findCommand, listCommand, sampleCommand } from "./examples/index.js"  // ← 이 라인 제거!

// 메인 커맨드 생성
const mainCommand = Command.make(
  "file-explorer",
  {},
  () => Console.log("Effect File Explorer CLI - use --help to see available commands")
)

// 공식 패턴: Command.withSubcommands 사용 - 빈 배열로 시작
const command = mainCommand.pipe(
  Command.withSubcommands([
    // 여기에 production 커맨드들 추가
    // listCommand,    // 제거됨
    // catCommand,     // 제거됨  
    // findCommand,    // 제거됨
    // sampleCommand,  // 제거됨
    // advancedCommand // 제거됨
  ])
)

// 커맨드 실행 - 올바른 Command.run 사용법
export const run = Command.run(command, {
  name: "Effect File Explorer",
  version: "1.0.0"
})
```

### ✅ 결과 확인

```bash
npm run build
node dist/bin.js --help
```

**결과**: 
```
Effect File Explorer 1.0.0

USAGE
$ file-explorer

# 서브커맨드 섹션이 사라짐!
```

## 📋 Production 배포 옵션들

### 옵션 1: Import 제거 (권장 🏆)

**장점**: 
- 가장 간단함 (1줄 수정)
- 빌드 시 example 코드 완전히 제외됨
- 번들 크기 최소화

**방법**: 위의 "가장 간단한 방법" 참조

### 옵션 2: Configuration 방법

**src/examples/config.ts** 수정:

```typescript
export const ENABLE_EXAMPLES = false  // true → false로 변경
```

**장점**: 
- 코드 변경 없이 설정으로 제어
- 개발/프로덕션 환경 분리 가능

**단점**: 
- Example 코드가 여전히 빌드에 포함됨

### 옵션 3: 환경변수 기반

**src/examples/config.ts**에서 주석 해제:

```typescript
// 이 라인의 주석 해제
export const ENABLE_EXAMPLES = process.env.NODE_ENV !== 'production';
```

**사용법**:
```bash
# 개발
npm run dev -- --help        # examples 보임

# 프로덕션 빌드  
NODE_ENV=production npm run build
node dist/bin.js --help       # examples 숨겨짐
```

### 옵션 4: 완전 제거

Examples 디렉토리 완전 삭제:

```bash
rm -rf src/examples/
rm EXAMPLES.md
```

**Cli.ts**도 정리:
```typescript
// import 라인도 완전 제거
const command = mainCommand.pipe(
  Command.withSubcommands([
    // 여기에 실제 커맨드들만
  ])
)
```

## 🏭 Production 커맨드 추가

### 1. 새 커맨드 생성

**src/commands/DeployCommand.ts** 생성:

```typescript
import * as Command from "@effect/cli/Command"
import * as Args from "@effect/cli/Args" 
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"

const targetArg = Args.choice("target", ["staging", "production"]).pipe(
  Args.withDescription("Deployment target")
)

export const deployCommand = Command.make("deploy", { target: targetArg }).pipe(
  Command.withDescription("Deploy application"),
  Command.withHandler(({ target }) =>
    Effect.gen(function* () {
      yield* Console.log(`Deploying to ${target}...`)
      // 실제 배포 로직
    })
  )
)
```

### 2. 커맨드 등록

**src/commands/index.ts** 업데이트:

```typescript
import { deployCommand } from "./DeployCommand.js"

export const productionCommands = [
  deployCommand,
  // 다른 production 커맨드들...
]
```

### 3. CLI에 통합

**src/Cli.ts**:

```typescript
// Example import 제거하고 production import 추가
import { productionCommands } from "./commands/index.js"

const command = mainCommand.pipe(
  Command.withSubcommands([
    ...productionCommands,  // 실제 커맨드들
  ])
)
```

## 📦 빌드 및 배포

### 빌드 확인

```bash
# 타입 체크
npm run check

# 빌드
npm run build

# 빌드된 CLI 테스트  
node dist/bin.js --help
node dist/bin.js deploy staging
```

### NPM 패키지 배포

**package.json** 업데이트:

```json
{
  "name": "my-cli-app",
  "bin": {
    "my-cli": "./dist/bin.js"  // CLI 이름 변경
  }
}
```

**배포**:
```bash
npm publish
```

**사용**:
```bash
npx my-cli --help
npx my-cli deploy production
```

## 🔍 검증 체크리스트

### ✅ Before 배포

- [ ] Example imports 제거됨
- [ ] Production 커맨드 추가됨  
- [ ] `npm run check` 통과
- [ ] `npm run build` 성공
- [ ] Built CLI 테스트 완료
- [ ] 번들 크기 확인 (examples 제외됨)

### ✅ After 배포

- [ ] `--help` 출력에 example 커맨드 없음
- [ ] Production 커맨드만 표시됨
- [ ] 모든 production 커맨드 정상 작동
- [ ] CLI 이름과 버전 정보 올바름

## 🚨 주의사항

1. **테스트 업데이트**: Example 커맨드 제거 시 관련 테스트도 정리
2. **문서 업데이트**: README.md에서 example 관련 내용 제거
3. **CI/CD**: 빌드 파이프라인에서 production 설정 확인
4. **버전 관리**: 프로덕션용 브랜치 별도 관리 고려

## 💡 베스트 프랙티스

1. **개발/프로덕션 분리**: 환경변수 기반 설정 사용
2. **점진적 제거**: 한 번에 모든 example 제거보다는 단계적 제거  
3. **백업 유지**: Example 코드를 별도 브랜치에 보관
4. **문서 보존**: EXAMPLES.md는 개발 참고용으로 유지

이 가이드를 따르면 깔끔한 프로덕션 CLI를 쉽게 만들 수 있습니다! 🎉