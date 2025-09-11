# Effect CLI 문서

Effect 프레임워크를 사용한 파일 탐색 CLI 도구입니다.

## 현재 구현된 기능

### 명령어 목록

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `ls` | 디렉토리 목록 조회 | `ls [-l] [-a] [path]` |
| `cat` | 파일 내용 읽기 | `cat [-n] [-E] [-T] <file>` |
| `find` | 파일 검색 | `find [--type f\|d] [--max-depth N] [-c] [path] <pattern>` |

### 사용 예시

```bash
# 기본 디렉토리 목록
node dist/bin.cjs ls

# 상세 정보와 함께 목록
node dist/bin.cjs ls -l

# 파일 내용 읽기
node dist/bin.cjs cat package.json

# 줄 번호와 함께 파일 읽기
node dist/bin.cjs cat -n src/Cli.ts

# 파일 검색
node dist/bin.cjs find src "Command"

# 최대 깊이 제한으로 파일만 검색
node dist/bin.cjs find --type f --max-depth 2 . "ts"
```

## 프로젝트 구조

```
src/
├── commands/              # 개별 명령어 구현
│   ├── ListCommand.ts     # ls 명령어
│   ├── CatCommand.ts      # cat 명령어
│   └── FindCommand.ts     # find 명령어
├── FileSystem.ts          # 파일시스템 공통 유틸리티
├── Cli.ts                # 메인 CLI 구성
└── bin.ts                # 실행 진입점 + DevTools 설정

.vscode/
├── settings.json         # Effect 개발 최적화 설정
├── tasks.json           # 빌드/테스트 작업
├── launch.json          # 디버깅 설정
└── effect.code-snippets # Effect 코드 스니펫

docs/
├── CLI_CONVENTIONS.md    # CLI 확장 컨벤션
└── COMMAND_STRUCTURE.md  # 명령어 구조 가이드
```

## 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- pnpm
- Effect VS Code Extension

### 개발 명령어

```bash
# 빌드
pnpm build

# 타입 체크
pnpm check

# 린트
pnpm lint

# 테스트
pnpm test

# 개발 실행 (tsx)
pnpm tsx src/bin.ts
```

### VS Code 설정

1. Effect VS Code Extension 설치 (`effectful-tech.effect-vscode`)
2. Effect DevTools 패널에서 "Start the server" 클릭
3. CLI 실행 시 실시간 트레이싱 정보 확인

## 핵심 기술

### Effect 프레임워크 활용

- **Effect.gen()**: 비동기 작업의 generator 기반 처리
- **Effect.pipe()**: 함수형 파이프라인
- **Effect.withSpan()**: 트레이싱 정보 추가
- **Effect.log()**: 구조화된 로깅
- **Effect.catchAll()**: 포괄적 에러 처리

### @effect/cli 사용

- **Command.make()**: 명령어 정의
- **Args**: 위치 인수 처리
- **Options**: 플래그 옵션 처리
- **Option 타입**: Optional 값 안전하게 처리

### @effect/platform 활용

- **FileSystem**: 파일시스템 접근
- **Path**: 경로 조작
- **Order**: 타입 안전한 정렬

## 확장 가이드

새로운 명령어를 추가하려면:

1. `src/commands/NewCommand.ts` 파일 생성
2. [CLI_CONVENTIONS.md](CLI_CONVENTIONS.md) 규칙 따르기
3. `src/Cli.ts`에 명령어 등록
4. 빌드 및 테스트

자세한 내용은 문서를 참고하세요:
- [CLI 확장 컨벤션](CLI_CONVENTIONS.md)
- [명령어 구조 가이드](COMMAND_STRUCTURE.md)