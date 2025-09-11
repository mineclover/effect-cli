# 📚 Documentation Index

Effect CLI 프로젝트의 모든 문서를 주제별로 정리한 중앙 인덱스입니다.

## 🚀 Quick Start

처음 시작하는 분들을 위한 필수 문서들:

| 문서 | 용도 | 대상 |
|------|------|------|
| [README.md](../README.md) | 프로젝트 소개 및 빠른 시작 | 모든 사용자 |
| [Getting Started](./guides/GETTING_STARTED.md) | 단계별 설치 및 첫 명령어 실행 | 초보자 |
| [Architecture](./architecture/OVERVIEW.md) | 프로젝트 구조 이해 | 개발자 |

## 📖 주제별 문서

### 🏗️ Architecture & Design
프로젝트의 구조와 설계 원칙

- [프로젝트 구조](./architecture/PROJECT_STRUCTURE.md) - 디렉토리 구조 및 파일 역할
- [CLI 아키텍처](./architecture/CLI_ARCHITECTURE.md) - Effect CLI 구조 및 패턴
- [서비스 패턴](./architecture/SERVICE_PATTERN.md) - Effect 서비스 레이어 설계

### ⚙️ Development
개발자를 위한 기술 가이드

- [명령어 개발 가이드](./development/COMMAND_DEVELOPMENT.md) - 새 명령어 추가 방법
- [타입 안전성](./development/TYPE_SAFETY.md) - Effect.js 타입 안전성 패턴
- [테스트 작성](./development/TESTING.md) - 명령어 테스트 방법
- [디버깅](./development/DEBUGGING.md) - 개발 중 문제 해결
- [Queue System Tasks](./development/QUEUE_SYSTEM_TASKS.md) ✅ - 큐 시스템 구현 작업 계획

### 📋 Configuration
설정 및 커스터마이징

- [Example 관리](./configuration/EXAMPLES.md) - 예제 명령어 설정
- [Production 배포](./configuration/PRODUCTION.md) - 프로덕션 환경 설정
- [환경 설정](./configuration/ENVIRONMENT.md) - 개발 환경 구성

### 🔧 API Reference
기술 레퍼런스

- [Effect.js 패턴](./api/EFFECT_PATTERNS.md) ✅ - Effect.js 사용 패턴
- [Effect.js 가이드](./effect-js-guide.md) ✅ - 프로젝트 특화 Effect.js API
- [CLI API](./api/CLI_API.md) 📝 - Effect CLI API 레퍼런스
- [서비스 API](./api/SERVICE_API.md) 📝 - 파일시스템 서비스 API

### 📚 Guides & Tutorials
실무 가이드 및 튜토리얼

- [첫 번째 명령어 만들기](./guides/FIRST_COMMAND.md) - 단계별 명령어 생성
- [복잡한 명령어 구현](./guides/ADVANCED_COMMANDS.md) - 고급 패턴 활용
- [Queue System](./guides/QUEUE_SYSTEM.md) ✅ - 내부 큐 관리 및 복원력 시스템
- [모범 사례](./guides/BEST_PRACTICES.md) - 권장 개발 패턴

### 🚨 Operations
운영 및 배포

- [MCP 도구 사용법](./operations/MCP_USAGE.md) ✅ - Notion MCP 문서화 워크플로우
- [빌드 및 배포](./operations/BUILD_DEPLOY.md) 📝 - CI/CD 및 배포 가이드
- [모니터링](./operations/MONITORING.md) 📝 - 로깅 및 에러 추적
- [성능 최적화](./operations/PERFORMANCE.md) 📝 - CLI 성능 개선

## 🎯 문서 찾기

### 목적별 추천

**새로 시작하는 분**:
1. README.md → Getting Started → First Command

**기존 프로젝트 확장**:
1. Project Structure → Command Development → Examples

**프로덕션 배포**:
1. Production → Build Deploy → Performance

**문제 해결**:
1. Debugging → API Reference → Best Practices

### 난이도별 분류

- 🟢 **초급**: Getting Started, Examples, First Command
- 🟡 **중급**: Command Development, Service Pattern, Advanced Commands
- 🔴 **고급**: CLI Architecture, Type Safety, Performance

## 📝 문서 기여

새로운 문서 추가 시:

1. **주제 확인**: 기존 주제에 맞는지 확인
2. **중복 방지**: INDEX.md에서 유사한 내용 검색
3. **인덱스 업데이트**: 새 문서를 INDEX.md에 등록
4. **크로스 레퍼런스**: 관련 문서들과 상호 링크

### 문서 작성 규칙

- **하나의 주제**: 각 문서는 하나의 주제만 다룸
- **명확한 제목**: 내용을 정확히 반영하는 제목
- **실용적 예제**: 실제 코드 예제 포함
- **업데이트 날짜**: 마지막 수정일 명시

## 🔄 문서 상태

| 문서 상태 | 의미 | 표시 |
|-----------|------|------|
| ✅ 완성 | 내용 완료, 리뷰 완료 | ✅ |
| 🚧 작성중 | 내용 작성 진행 중 | 🚧 |
| 📝 계획 | 작성 예정 | 📝 |
| 🔄 업데이트 | 내용 업데이트 필요 | 🔄 |

---

**💡 Tip**: Ctrl+F로 키워드 검색해서 원하는 문서를 빠르게 찾으세요!

**❓ 문의**: 찾는 문서가 없거나 추가 문의는 Issues에서 문의해주세요.