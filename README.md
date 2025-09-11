# Effect CLI Application Template

This template provides a solid foundation for building scalable and maintainable command-line applications with Effect. 

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

