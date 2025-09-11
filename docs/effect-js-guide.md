# Effect.js Guide

To query information, use `context mcp`.

For more details, see the Effect Documentation at `websites/effect_website`.

Detailed, method-specific usage is being documented here: https://www.notion.so/graph-mcp/26b48583746080afb3add6b97e6b6c5e

## 문서화 표준 및 Notion 연동 가이드라인

Effect.js 메서드 및 개념에 대한 상세 사용법은 Notion 데이터베이스에 다음 표준에 따라 문서화됩니다. 특히 Notion API를 통한 페이지 생성 및 관계 설정 시 발생할 수 있는 문제와 해결책을 포함합니다.

### 1. 메서드/개념 페이지 생성 (상위 페이지)

*   **목적**: 각 Effect.js 메서드 또는 핵심 개념을 설명하는 메인 페이지입니다.
*   **생성 방법**: `notion_create_pages` 도구를 사용하여 데이터베이스(`26b48583746080afb3add6b97e6b6c5e`) 내에 페이지를 생성합니다.
*   **주요 속성 (`properties`)**:
    *   `name`: 메서드/개념의 이름 (예: `Effect.gen`)
    *   `namespace`: 속한 네임스페이스 (예: `Effect`)
    *   `import`: 해당 메서드를 가져오는 import 구문 (텍스트 타입 속성으로 직접 입력)
    *   `description`: 메서드/개념에 대한 간략한 설명
*   **예시 (Effect.gen 페이지 생성)**:
    ```python
    print(default_api.notion_create_pages(pages = [{
        "content": "```typescript\nimport * as Effect from \"effect/Effect\";\n```",
        "properties": {
            "description": "async/await처럼 순차적인 Effect를 작성하기 위한 제너레이터 스타일의 함수입니다.",
            "name": "Effect.gen",
            "namespace": "Effect",
            "import": "effect/Effect" # import 속성이 텍스트 타입으로 추가되었음을 가정
        }
    }], parent = {"database_id": "26b48583-7460-80afb3add6b97e6b6c5e"}))
    ```

### 2. 코드 예제 페이지 생성 (하위 페이지) 및 상위 페이지 연결

*   **목적**: 특정 메서드/개념의 사용 예시 코드를 담는 페이지입니다.
*   **생성 방법**: `notion_create_pages` 도구를 사용하여 데이터베이스 내에 페이지를 생성합니다.
*   **상위 페이지 연결 (핵심)**:
    *   **사용 속성**: 데이터베이스 스키마에 정의된 `상위 항목` (Parent Item) 속성을 사용합니다.
    *   **값 형식**: `상위 항목` 속성에는 **상위 페이지의 전체 Notion URL 문자열**을 직접 입력해야 합니다. Notion API의 일반적인 `relation: [{ id: pageId }]` 형식이 아닌, 도구의 특정 유효성 검사를 통과하기 위한 방법입니다.
    *   **예시**: `https://www.notion.so/graph-mcp/Effect-gen-26b485837460811ba1f8ff0fc867eb6b`
*   **주요 속성 (`properties`)**:
    *   `name`: 예제의 기능을 요약하는 한 줄 제목 (예: `파일 목록 조회 및 로깅`)
    *   `상위 항목`: 상위 메서드/개념 페이지의 URL (위에서 설명한 형식)
*   **예시 (Effect.gen 예제 페이지 생성)**:
    ```python
    print(default_api.notion_create_pages(pages = [{
        "content": "```typescript\n// From: src/commands/ListCommand.ts\n\nCommand.withHandler(({ all, long, path }) =>\n  Effect.gen(function*(){
    const fs = yield* FileSystem;
    yield* Effect.log(`Listing directory: ${path}`);

    const files = yield* fs.listDirectory(path);

    const filteredFiles = all
      ? files
      : Array.filter(files, (file) => !file.name.startsWith("."));

    if (long) {
      yield* Console.log("Type Size     Name");
      yield* Console.log("---- -------- ----");
    }

    yield* Effect.forEach(filteredFiles, (file) => Console.log(formatFileInfo(file, long)));
  })
)
```",
        "properties": {
            "name": "파일 목록 조회 및 로깅",
            "상위 항목": "https://www.notion.so/graph-mcp/Effect-gen-26b485837460811ba1f8ff0fc867eb6b" # 상위 페이지의 URL 문자열
        }
    }], parent = {"database_id": "26b48583-7460-80afb3add6b97e6b6c5e"}))
    ```