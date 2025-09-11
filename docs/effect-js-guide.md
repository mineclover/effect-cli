# Effect.js Guide

## 문서 구조 및 관리 방식

Effect.js 관련 문서는 **Notion 데이터베이스**에서 메인으로 관리됩니다:
- **Notion DB**: https://www.notion.so/graph-mcp/26b48583746080afb3add6b97e6b6c5e
- **관리 내용**: 메서드별 상세 사용법, 타입 안전 패턴, 실제 코드 예제
- **조회 방법**: `context mcp`를 통한 Context7 라이브러리 문서 검색도 병행

본 마크다운 문서는 **Notion MCP 도구 사용 가이드**와 **문서화 워크플로우**를 다룹니다.

## 문서화 표준 및 Notion MCP 연동 가이드라인

Effect.js 메서드 및 개념에 대한 상세 사용법은 Notion 데이터베이스에 다음 표준에 따라 문서화됩니다. Claude Code의 Notion MCP 도구를 사용한 실제 워크플로우와 문제 해결 방법을 포함합니다.

## 데이터베이스 구조 이해

### 데이터베이스 정보
- **데이터베이스 ID**: `26b48583746080afb3add6b97e6b6c5e`
- **데이터 소스 ID**: `26b48583-7460-8042-96e5-000b7b41e4a4` (페이지 생성 시 사용)
- **URL**: https://www.notion.so/26b48583746080afb3add6b97e6b6c5e

### 데이터베이스 스키마 구조
- `name` (title): 메서드/개념의 이름
- `namespace` (text): 속한 네임스페이스 (예: Effect, @effect/cli)
- `import` (text): import 구문 (예: effect/Effect)
- `description` (text): 메서드/개념에 대한 설명
- `type` (select): 메서드 타입 분류
- `상위 항목` (relation): 상위 개념/메서드와의 관계
- `하위 항목` (relation): 하위 예제/관련 항목들
- `use` (relation): 이 메서드를 사용하는 다른 메서드들
- `be used` (relation): 이 메서드가 사용하는 다른 메서드들

## MCP 도구 사용 워크플로우

### 1. 메서드/개념 페이지 생성 (상위 페이지)

**목적**: 각 Effect.js 메서드 또는 핵심 개념을 설명하는 메인 페이지입니다.

**Claude Code MCP 도구 사용법**:
```json
{
  "tool": "mcp__notion__notion-create-pages",
  "parameters": {
    "parent": {"data_source_id": "26b48583-7460-8042-96e5-000b7b41e4a4"},
    "pages": [{
      "content": "```typescript\nimport * as Effect from \"effect/Effect\";\n\n// 타입 안전한 Effect.gen 패턴\nconst operation = Effect.gen(function* () {\n  const fs = yield* FileSystem;\n  const content = yield* fs.readFile(\"config.json\");\n  return JSON.parse(content);\n});\n```\n\n## 타입 안전성 보장\n\n- **자동 타입 추론**: `yield*` 표현식의 결과 타입이 자동으로 추론됩니다\n- **서비스 의존성**: 서비스 태그를 통한 의존성 주입 시 타입 안전성 보장",
      "properties": {
        "name": "Effect.gen",
        "namespace": "Effect",
        "import": "effect/Effect",
        "description": "async/await처럼 순차적인 Effect를 작성하기 위한 제너레이터 스타일의 함수입니다. 완전한 타입 안전성과 함께 비동기 작업을 동기 코드처럼 작성할 수 있습니다."
      }
    }]
  }
}
```

**주요 속성 설정**:
- `name`: 메서드/개념의 정확한 이름
- `namespace`: 속한 네임스페이스 (Effect, @effect/cli, effect 등)  
- `import`: import 구문 (effect/Effect, @effect/cli/Command 등)
- `description`: 메서드의 목적과 타입 안전성 특징을 포함한 상세 설명
- `type`: 메서드 타입 분류 (함수, 생성자, 유틸리티 등)

### 2. 코드 예제 페이지 생성 (하위 페이지) 및 상위 페이지 연결

**목적**: 특정 메서드/개념의 실제 사용 예시 코드를 담는 페이지입니다.

**Claude Code MCP 도구 사용법**:
```json
{
  "tool": "mcp__notion__notion-create-pages", 
  "parameters": {
    "parent": {"data_source_id": "26b48583-7460-8042-96e5-000b7b41e4a4"},
    "pages": [{
      "content": "```typescript\n// From: src/commands/ListCommand.ts\n\nCommand.withHandler(({ all, long, path }) =>\n  Effect.gen(function*() {\n    const fs = yield* FileSystem;\n    yield* Effect.log(`Listing directory: ${path}`);\n\n    const files = yield* fs.listDirectory(path);\n\n    const filteredFiles = all\n      ? files\n      : Array.filter(files, (file) => !file.name.startsWith(\".\"));\n\n    if (long) {\n      yield* Console.log(\"Type Size     Name\");\n      yield* Console.log(\"---- -------- ----\");\n    }\n\n    yield* Effect.forEach(filteredFiles, (file) => \n      Console.log(formatFileInfo(file, long))\n    );\n  })\n)\n```\n\n이 예제는 다음과 같은 타입 안전성 특징을 보여줍니다:\n- CLI 핸들러 파라미터의 타입이 자동 추론됨 \n- FileSystem 서비스의 타입이 yield* 시점에 추론됨\n- Effect.forEach의 제네릭 타입이 배열 타입에서 추론됨",
      "properties": {
        "name": "파일 목록 조회 및 로깅",
        "상위 항목": "https://www.notion.so/26b4858374608115970ec8aa6c3462d9"
      }
    }]
  }
}
```

**상위 페이지 연결 중요 사항**:
- **속성 이름**: `상위 항목` (데이터베이스 스키마에 정의된 relation 속성)
- **값 형식**: **상위 페이지의 전체 Notion URL 문자열**을 직접 입력
- **주의사항**: Notion API의 일반적인 `relation: [{ id: pageId }]` 형식이 아님
- **URL 형식**: `https://www.notion.so/[page-id]` (데시는 제거된 32자 ID)

### CLI 모듈화 및 서브커맨드 등록 패턴

**타입 안전한 CLI 구조**:
```json
{
  "tool": "mcp__notion__notion-create-pages",
  "parameters": {
    "parent": {"data_source_id": "26b48583-7460-8042-96e5-000b7b41e4a4"},
    "pages": [{
      "content": "```typescript\n// From: src/Cli.ts - 서브커맨드 등록 패턴\n\n// 메인 커맨드 생성\nconst mainCommand = Command.make(\"file-explorer\", {}, () =>\n  Console.log(\"Effect File Explorer CLI - use --help to see available commands\")\n);\n\n// 활성화된 커맨드들을 하나의 배열로 결합\nconst getActiveCommands = () => {\n  const commands = [...productionCommands]\n  \n  if (ENABLE_EXAMPLES) {\n    commands.push(...exampleCommands)\n  }\n  \n  return commands\n}\n\n// 공식 패턴: Command.withSubcommands 사용\nconst createFinalCommand = () => {\n  const activeCommands = getActiveCommands()\n  \n  // 커맨드가 없는 경우 처리\n  if (activeCommands.length === 0) {\n    return mainCommand.pipe(\n      Command.withDescription(\"No commands available\")\n    )\n  }\n  \n  // 서브커맨드 등록\n  return mainCommand.pipe(\n    Command.withSubcommands(activeCommands)\n  )\n}\n\nconst command = createFinalCommand()\n\n// 커맨드 실행\nexport const run = Command.run(command, {\n  name: \"Effect File Explorer\",\n  version: \"1.0.0\"\n})\n```\n\n## 타입 안전한 모듈화 특징\n\n- **동적 커맨드 구성**: 설정에 따라 런타임에 커맨드 배열 결정\n- **빈 커맨드 처리**: Effect CLI의 빈 서브커맨드 버그 회피\n- **타입 안전성**: 모든 커맨드가 동일한 Command 타입 유지\n- **설정 기반 제어**: 프로덕션/개발 환경별 커맨드 선택",
      "properties": {
        "name": "CLI 모듈화 및 동적 서브커맨드 등록",
        "상위 항목": "https://www.notion.so/26b48583746081828a39f552f1eea3f8"
      }
    }]
  }
}
```

## 고급 MCP 도구 활용

### 3. 기존 페이지 검색 및 조회

**데이터베이스 전체 조회**:
```json
{
  "tool": "mcp__notion__fetch",
  "parameters": {
    "id": "26b48583746080afb3add6b97e6b6c5e"
  }
}
```

**특정 페이지 내용 조회**:
```json
{
  "tool": "mcp__notion__fetch", 
  "parameters": {
    "id": "[page-id-or-url]"
  }
}
```

**검색 기능**:
```json
{
  "tool": "mcp__notion__search",
  "parameters": {
    "query": "Effect.gen 타입 안전",
    "data_source_url": "collection://26b48583-7460-8042-96e5-000b7b41e4a4"
  }
}
```

### 4. 페이지 업데이트 및 관계 설정

**페이지 내용 업데이트**:
```json
{
  "tool": "mcp__notion__notion-update-page",
  "parameters": {
    "data": {
      "page_id": "[page-id]",
      "command": "update_properties",
      "properties": {
        "description": "업데이트된 설명",
        "type": "함수"
      }
    }
  }
}
```

**페이지 내용 교체**:
```json
{
  "tool": "mcp__notion__notion-update-page",
  "parameters": {
    "data": {
      "page_id": "[page-id]",
      "command": "replace_content",
      "new_str": "새로운 마크다운 콘텐츠"
    }
  }
}
```

## 타입 안전성 문서화 패턴

### Effect.js 핵심 타입 안전 패턴들

1. **Effect.gen 제너레이터 패턴**
   - `yield*` 표현식의 자동 타입 추론
   - 서비스 의존성 주입 시 타입 안전성
   - 에러 타입의 자동 전파

2. **CLI Command 타입 안전성** 
   - `Command.make`의 인수 타입 자동 추론
   - Args와 Options 타입의 핸들러 전달
   - 서브커맨드 등록 시 타입 검증

3. **서비스 패턴 타입 안전성**
   - `Context.GenericTag`를 통한 타입 안전한 의존성 주입
   - Layer 시스템에서의 타입 검증
   - 서비스 인터페이스와 구현체 분리

4. **브랜드 타입과 데이터 검증**
   - `Brand.nominal`과 `Brand.refined`를 통한 런타임 안전성
   - `Data.TaggedError`를 통한 명시적 에러 타입
   - 구조적 등가성과 타입 안전성

### 문서화 시 반드시 포함할 내용

1. **타입 시그니처**: 메서드의 정확한 TypeScript 타입
2. **제네릭 추론**: 어떤 타입이 자동으로 추론되는지 설명  
3. **에러 타입**: 발생 가능한 에러들의 명시적 타입
4. **의존성 타입**: 필요한 서비스나 컨텍스트의 타입
5. **실사용 예제**: 프로젝트의 실제 코드에서 발췌한 예제

## 에러 처리 및 문제 해결

### 일반적인 에러 케이스

1. **잘못된 데이터 소스 ID**
   - 증상: "Invalid parent" 에러
   - 해결: `data_source_id` 사용, `database_id` 아님

2. **관계 설정 실패**
   - 증상: 상위 항목 연결이 되지 않음
   - 해결: 전체 Notion URL 사용, 페이지 ID만 사용하지 말것

3. **속성 이름 불일치**
   - 증상: 속성이 설정되지 않음
   - 해결: 데이터베이스 스키마에 정의된 정확한 속성 이름 사용

4. **권한 문제**
   - 증상: "Insufficient permissions" 에러  
   - 해결: Notion 워크스페이스에서 데이터베이스 접근 권한 확인

### 디버깅 방법

1. **데이터베이스 구조 확인**: `mcp__notion__fetch`로 스키마 조회
2. **기존 페이지 참조**: 올바른 속성 설정 방법 확인
3. **단계적 생성**: 복잡한 관계 설정 전에 단순 페이지부터 테스트
4. **로그 확인**: MCP 도구 응답에서 생성된 페이지 URL 확인

## 문서 관리 원칙

### 역할 분담
- **Notion 데이터베이스**: Effect.js 기술 문서의 **메인 저장소**
  - 메서드별 상세 사용법과 타입 시그니처
  - 실제 프로젝트에서 발췌한 코드 예제
  - 타입 안전성 패턴과 모범 사례
  - 관련 메서드들 간의 관계 및 참조

- **로컬 마크다운**: 문서화 **프로세스 가이드**
  - Notion MCP 도구 사용법
  - 문서화 워크플로우와 표준
  - 에러 해결 및 디버깅 방법

### 업데이트 워크플로우

1. **Effect.js 메서드 학습/사용** → Notion에 메서드 페이지 생성
2. **실제 코드 작성** → Notion에 코드 예제 페이지 추가  
3. **문서화 프로세스 개선** → 로컬 가이드 파일 수정
4. **도구 사용 중 문제 발견** → 로컬 가이드에 해결책 추가

### 검색 및 참조 방법

- **Context7 MCP**: `context mcp`로 공식 Effect 문서 검색
- **Notion 검색**: Notion 내에서 프로젝트 특화 패턴 검색
- **로컬 가이드**: MCP 도구 사용법 및 문제 해결 참조

이렇게 하면 **기술 문서는 Notion의 강력한 데이터베이스 기능을**, **프로세스 가이드는 버전 관리가 용이한 마크다운을** 활용할 수 있습니다.