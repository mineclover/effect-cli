# Queue System Implementation Tasks (Effect.js 기반)

> 🔗 **문서 위치**: [INDEX.md](../INDEX.md) > Development > Queue System Tasks

Effect.js 패턴 기반 Queue System 구현을 위한 상세한 작업 계획입니다.

## 🎯 프로젝트 개요

**목표**: Effect.js + bun:sqlite 기반 지속성 있는 큐 관리 시스템으로 CLI 모니터링 및 장기 안정성 확보
**기간**: 3-4주 (추정)
**우선순위**: High
**핵심 패턴**: Context.GenericTag, Layer.effect, Effect.gen, Ref, Queue, bun:sqlite
**핵심 요구사항**:
- CLI 모니터링 (실시간 상태 조회)
- 장기간 반복 실행 안정성
- bun:sqlite 기반 데이터 지속성
- 재요청 시 기존 큐 초기화

## 📋 Phase 1: 지속성 기반 타입 시스템 + bun:sqlite (Week 1)

### 1.1 스키마 관리 시스템 + 타입 시스템 통합
**예상 시간**: 3-4일  
**파일**: `src/services/Queue/types.ts`, `src/services/Queue/SchemaManager.ts` (기완성)

```typescript
// Effect.js + bun:sqlite + Schema Management 통합 타입
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { Database } from "bun:sqlite"

// 지속성 큐 작업 정의 (schema.sql과 호환)
interface PersistedQueueTask<A, E> {
  readonly id: string
  readonly sessionId: string  // 재요청 시 큐 초기화용
  readonly type: OperationType
  readonly resourceGroup: ResourceGroup  
  readonly operation: Effect.Effect<A, E>
  readonly priority: number
  readonly estimatedDuration: Duration.Duration
  readonly status: TaskStatus
  readonly createdAt: Date
  readonly startedAt?: Date
  readonly completedAt?: Date
  readonly retryCount: number
  readonly maxRetries: number
  readonly lastError?: string
  readonly filePath?: string      // 파일 작업용
  readonly fileSize?: number      // 파일 작업용
  readonly operationData?: string // JSON 메타데이터
}

type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled"
type ResourceGroup = "filesystem" | "network" | "computation" | "memory-intensive"
type OperationType = "file-read" | "file-write" | "directory-list" | "find-files" | "network-request" | "computation"

// 모니터링을 위한 메트릭 타입 (queue_metrics 테이블 호환)
interface QueueMetrics {
  readonly sessionId: string
  readonly totalTasks: number
  readonly completedTasks: number
  readonly failedTasks: number
  readonly runningTasks: number
  readonly pendingTasks: number
  readonly cancelledTasks: number
  readonly successRate: number
  readonly averageProcessingTime: number
  readonly throughputPerMinute: number
  readonly resourceGroupStats: string // JSON string from DB
  readonly lastUpdated: Date
}

// 프로세스 상태 타입 (process_heartbeat 테이블 호환)
interface ProcessHeartbeat {
  readonly processId: number
  readonly sessionId: string
  readonly timestamp: Date
  readonly memoryUsedMB: number
  readonly memoryTotalMB: number
  readonly uptimeSeconds: number
  readonly tasksProcessed: number
  readonly tasksFailed: number
  readonly consecutiveFailures: number
  readonly memoryLeakDetected: boolean
  readonly gcTriggered: boolean
  readonly circuitBreakerOpen: boolean
}

// Circuit Breaker 상태 타입 (circuit_breaker_state 테이블 호환)
interface CircuitBreakerState {
  readonly resourceGroup: ResourceGroup
  readonly sessionId: string
  readonly state: "Closed" | "Open" | "HalfOpen"
  readonly failureCount: number
  readonly successCount: number
  readonly lastFailureTime?: Date
  readonly lastSuccessTime?: Date
  readonly stateChangedAt: Date
  readonly failureThreshold: number
  readonly recoveryTimeoutMs: number
  readonly totalRequests: number
  readonly totalFailures: number
  readonly failureRate: number
}

// 서비스 태그 정의 (스키마 관리 포함)
export const SchemaManager = Context.GenericTag<SchemaManager>("@app/SchemaManager") // 이미 구현됨
export const QueuePersistence = Context.GenericTag<QueuePersistence>("@app/QueuePersistence")  
export const InternalQueue = Context.GenericTag<InternalQueue>("@app/InternalQueue")
export const QueueMonitor = Context.GenericTag<QueueMonitor>("@app/QueueMonitor")
export const CircuitBreaker = Context.GenericTag<CircuitBreaker>("@app/CircuitBreaker")
export const ResourceMonitor = Context.GenericTag<ResourceMonitor>("@app/ResourceMonitor")
export const AdaptiveThrottler = Context.GenericTag<AdaptiveThrottler>("@app/AdaptiveThrottler")
export const StabilityMonitor = Context.GenericTag<StabilityMonitor>("@app/StabilityMonitor")

// Schema Manager 인터페이스 (이미 구현됨)
export interface SchemaManager {
  readonly initializeSchema: () => Effect.Effect<void, SchemaError>
  readonly getCurrentVersion: () => Effect.Effect<Option.Option<string>, SchemaError>
  readonly needsMigration: (targetVersion: string) => Effect.Effect<boolean, SchemaError>
  readonly migrate: (targetVersion: string) => Effect.Effect<void, MigrationError>
  readonly validateSchema: () => Effect.Effect<boolean, SchemaError>
  readonly getAppliedMigrations: () => Effect.Effect<readonly SchemaVersion[], SchemaError>
  readonly cleanup: () => Effect.Effect<void, never>
}
```

**완료 기준**:
- [x] 전용 schema.sql 파일 (기완성)
- [x] migrations.sql 버전 관리 시스템 (기완성)  
- [x] SchemaManager.ts Effect 서비스 (기완성)
- [ ] 타입 시스템과 스키마 동기화
- [ ] sessionId 기반 큐 격리 메커니즘  
- [ ] CLI 모니터링용 메트릭 타입 호완성

### 1.2 스키마 관리 통합 Queue Persistence Layer  
**예상 시간**: 3-4일 (SchemaManager 활용으로 단축)
**파일**: `src/services/Queue/QueuePersistenceLive.ts`

```typescript
// SchemaManager와 통합된 지속성 서비스
import { SchemaManager, initializeDatabase } from "./SchemaManager.js"

export const QueuePersistenceLive = Layer.effect(
  QueuePersistence,
  Effect.gen(function* () {
    // SchemaManager 의존성 주입
    const schemaManager = yield* SchemaManager
    
    // 데이터베이스 초기화 (SchemaManager 활용)
    yield* initializeDatabase()
    
    // 스키마 유효성 검증
    const isValid = yield* schemaManager.validateSchema()
    if (!isValid) {
      return yield* Effect.fail(new Error("Database schema validation failed"))
    }
    
    // SQLite 연결 (SchemaManager와 동일한 경로)
    const db = new Database(".effect-cli/queue.db")
    const currentSessionId = yield* Ref.make(generateSessionId())
    
    const clearQueueForNewSession = (sessionId: string) =>
      Effect.gen(function* () {
        // 기존 대기열 모두 취소 처리 (schema.sql 테이블 구조 활용)
        yield* Effect.sync(() => 
          db.prepare(`
            UPDATE queue_tasks 
            SET status = 'cancelled' 
            WHERE session_id != ? AND status IN ('pending', 'running')
          `).run(sessionId)
        )
        
        // 세션 정보 업데이트 (queue_sessions 테이블)
        yield* Effect.sync(() =>
          db.prepare(`
            INSERT OR REPLACE INTO queue_sessions 
            (session_id, created_at, command_line, working_directory, process_id, status)
            VALUES (?, ?, ?, ?, ?, 'active')
          `).run(
            sessionId,
            new Date().toISOString(),
            process.argv.join(' '),
            process.cwd(),
            process.pid
          )
        )
        
        yield* Effect.log(`Cleared previous queues, new session: ${sessionId}`)
      })
    
    const persistTask = <A, E>(task: PersistedQueueTask<A, E>) =>
      Effect.gen(function* () {
        // schema.sql의 queue_tasks 테이블과 정확히 호환
        yield* Effect.sync(() =>
          db.prepare(`
            INSERT OR REPLACE INTO queue_tasks 
            (id, session_id, type, resource_group, priority, status, 
             created_at, retry_count, max_retries, estimated_duration,
             file_path, file_size, operation_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            task.id, task.sessionId, task.type, task.resourceGroup,
            task.priority, task.status, task.createdAt.toISOString(), 
            task.retryCount, task.maxRetries, task.estimatedDuration.millis,
            task.filePath || null, task.fileSize || null, task.operationData || null
          )
        )
      })
    
    const updateTaskStatus = (taskId: string, status: TaskStatus, error?: string) =>
      Effect.gen(function* () {
        const now = new Date().toISOString()
        
        // schema.sql 트리거가 actual_duration을 자동 계산
        if (status === 'running') {
          yield* Effect.sync(() =>
            db.prepare(`UPDATE queue_tasks SET status = ?, started_at = ? WHERE id = ?`)
              .run(status, now, taskId)
          )
        } else if (status === 'completed' || status === 'failed') {
          yield* Effect.sync(() =>
            db.prepare(`
              UPDATE queue_tasks 
              SET status = ?, completed_at = ?, last_error = ? 
              WHERE id = ?
            `).run(status, now, error || null, taskId)
          )
        }
      })
    
    const loadPendingTasks = (sessionId: string) =>
      Effect.gen(function* () {
        const tasks = yield* Effect.sync(() =>
          db.prepare(`
            SELECT * FROM queue_tasks 
            WHERE session_id = ? AND status = 'pending'
            ORDER BY priority DESC, created_at ASC
          `).all(sessionId)
        )
        
        return tasks.map(transformToPersistedQueueTask)
      })
    
    // 프로세스 재시작 시 복구 (schema.sql의 세션 추적 활용)
    const recoverFromCrash = (sessionId: string) =>
      Effect.gen(function* () {
        // 실행 중이던 작업들을 pending으로 되돌림
        yield* Effect.sync(() =>
          db.prepare(`
            UPDATE queue_tasks 
            SET status = 'pending', started_at = NULL
            WHERE session_id = ? AND status = 'running'
          `).run(sessionId)
        )
        
        // 이전 세션 정보 정리
        yield* Effect.sync(() =>
          db.prepare(`
            UPDATE queue_sessions 
            SET status = 'crashed', ended_at = ?
            WHERE session_id != ? AND status = 'active'
          `).run(new Date().toISOString(), sessionId)
        )
        
        yield* Effect.log("Recovered from previous crash, reset running tasks to pending")
      })
    
    // 메트릭 수집 (queue_metrics 테이블 활용)
    const updateMetrics = (sessionId: string) =>
      Effect.gen(function* () {
        const stats = yield* Effect.sync(() =>
          db.prepare(`
            SELECT 
              COUNT(*) as total_tasks,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
              SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_tasks,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
              AVG(actual_duration) as avg_processing_time
            FROM queue_tasks 
            WHERE session_id = ?
          `).get(sessionId)
        )
        
        if (stats) {
          yield* Effect.sync(() =>
            db.prepare(`
              INSERT OR REPLACE INTO queue_metrics
              (session_id, snapshot_time, total_tasks, pending_tasks, running_tasks,
               completed_tasks, failed_tasks, cancelled_tasks, success_rate, 
               average_processing_time, throughput_per_minute)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
            `).run(
              sessionId, new Date().toISOString(),
              stats.total_tasks, stats.pending_tasks, stats.running_tasks,
              stats.completed_tasks, stats.failed_tasks,
              stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks) : 0,
              stats.avg_processing_time || 0
            )
          )
        }
      })

    return QueuePersistence.of({
      clearQueueForNewSession,
      persistTask,
      updateTaskStatus,
      loadPendingTasks,
      recoverFromCrash,
      updateMetrics,
      getCurrentSession: () => Ref.get(currentSessionId),
      cleanup: () => 
        Effect.gen(function* () {
          yield* schemaManager.cleanup()
          yield* Effect.sync(() => db.close())
        })
    })
  })
)
```

**구현 항목**:
- [x] SchemaManager 통합으로 안전한 데이터베이스 초기화
- [ ] 완전한 스키마 호환성 (schema.sql 테이블 구조)
- [ ] sessionId 기반 큐 격리 (queue_sessions 테이블 활용)
- [ ] 작업 상태 지속성 (트리거 활용 자동 duration 계산)
- [ ] 메트릭 수집 자동화 (queue_metrics 테이블)
- [ ] Effect.sync로 SQLite 연산을 Effect로 래핑

**완료 기준**:
- [ ] SchemaManager와 완벽한 통합
- [ ] 재요청 시 기존 큐 완전 초기화 동작
- [ ] 프로세스 중단 후 재시작 시 복구
- [ ] schema.sql 정의와 100% 호환성

### 1.3 Ref + Effect.gen Circuit Breaker
**예상 시간**: 2-3일
**파일**: `src/services/Queue/CircuitBreaker.ts`

```typescript
// Effect.js 기반 Circuit Breaker
interface CircuitBreakerState {
  readonly state: "Closed" | "Open" | "HalfOpen"
  readonly failureCount: number
  readonly successCount: number
  readonly lastFailureTime: Option<Date>
}

export const CircuitBreakerLive = Layer.effect(
  CircuitBreaker,
  Effect.gen(function* () {
    // ResourceGroup별 Ref 상태 관리
    const states = yield* Effect.forEach(
      ["filesystem", "network", "computation", "memory-intensive"] as const,
      (group) =>
        Ref.make<CircuitBreakerState>({
          state: "Closed",
          failureCount: 0, 
          successCount: 0,
          lastFailureTime: Option.none()
        }).pipe(Effect.map(ref => [group, ref] as const))
    ).pipe(Effect.map(entries => new Map(entries)))

    const shouldAllow = (resourceGroup: ResourceGroup) =>
      Effect.gen(function* () {
        const stateRef = states.get(resourceGroup)!
        const state = yield* Ref.get(stateRef)
        
        if (state.state === "Open") {
          // 복구 시간 체크 (Option.isSome 활용)
          if (Option.isSome(state.lastFailureTime)) {
            const elapsed = Date.now() - state.lastFailureTime.value.getTime()
            if (elapsed > 60000) { // 1분 후 HalfOpen
              yield* Ref.update(stateRef, s => ({ ...s, state: "HalfOpen" }))
              return true
            }
          }
          return false
        }
        
        return true // Closed or HalfOpen
      })

    return CircuitBreaker.of({ shouldAllow, recordSuccess, recordFailure })
  })
)
```

**구현 항목**:
- [ ] Ref 기반 상태 관리 (ResourceGroup별 독립적)
- [ ] Option 타입 활용 시간 추적 (lastFailureTime)
- [ ] Effect.gen 패턴 상태 전환 로직
- [ ] Ref.update를 통한 안전한 상태 변경
- [ ] Layer.effect 패턴 서비스 생성

**완료 기준**:
- [ ] Ref 기반 동시성 안전 상태 관리
- [ ] Option 타입 활용 null 안전성
- [ ] Effect.gen 일관성 유지

### 1.3 스키마 기반 실시간 CLI 모니터링 서비스
**예상 시간**: 2-3일 (스키마 활용으로 단축)
**파일**: `src/services/Queue/QueueMonitorLive.ts`, `src/examples/QueueCommand.ts`

```typescript
// Schema Views와 통합된 실시간 모니터링 서비스
export const QueueMonitorLive = Layer.effect(
  QueueMonitor,
  Effect.gen(function* () {
    const persistence = yield* QueuePersistence
    const schemaManager = yield* SchemaManager
    
    // SQLite 연결 (SchemaManager와 동일)
    const db = new Database(".effect-cli/queue.db")
    
    const getQueueStatus = (sessionId?: string) =>
      Effect.gen(function* () {
        const currentSession = sessionId ?? (yield* persistence.getCurrentSession())
        
        // schema.sql의 current_session_summary VIEW 활용
        const summary = yield* Effect.sync(() =>
          db.prepare(`
            SELECT * FROM current_session_summary 
            WHERE session_id = ?
          `).get(currentSession)
        )
        
        // schema.sql의 resource_group_performance VIEW 활용
        const resourceStats = yield* Effect.sync(() =>
          db.prepare(`
            SELECT * FROM resource_group_performance
            WHERE session_id = ?
          `).all(currentSession)
        )
        
        return {
          sessionId: currentSession,
          totalTasks: summary?.total_tasks || 0,
          completedTasks: summary?.completed_tasks || 0,
          failedTasks: summary?.failed_tasks || 0,
          runningTasks: summary?.running_tasks || 0,
          pendingTasks: summary?.pending_tasks || 0,
          successRate: summary?.success_rate_percent || 0,
          averageProcessingTime: summary?.avg_duration_ms || 0,
          resourceGroupStats: resourceStats,
          lastUpdated: new Date()
        } as QueueMetrics
      })
    
    const watchQueueProgress = (sessionId: string) =>
      Effect.gen(function* () {
        // Schedule을 사용한 주기적 상태 업데이트
        yield* getQueueStatus(sessionId).pipe(
          Effect.flatMap(metrics => 
            Effect.sync(() => {
              console.clear()
              displayQueueDashboard(metrics)
              
              // 프로세스 상태도 표시 (process_heartbeat 테이블)
              const heartbeat = db.prepare(`
                SELECT * FROM process_heartbeat 
                WHERE session_id = ? 
                ORDER BY timestamp DESC LIMIT 1
              `).get(sessionId)
              
              if (heartbeat) {
                displayProcessStatus(heartbeat)
              }
            })
          ),
          Effect.repeat(Schedule.fixed(Duration.seconds(1)))
        )
      })
    
    const getHistoricalStats = (days: number = 7) =>
      Effect.gen(function* () {
        // 과거 queue_sessions 데이터 활용
        const sessionStats = yield* Effect.sync(() =>
          db.prepare(`
            SELECT 
              DATE(created_at) as date,
              COUNT(*) as session_count,
              SUM(completed_tasks) as total_completed,
              SUM(failed_tasks) as total_failed,
              AVG(completed_tasks * 1.0 / NULLIF(total_tasks, 0)) as avg_success_rate
            FROM queue_sessions 
            WHERE created_at >= datetime('now', '-${days} days')
            AND status IN ('completed', 'crashed')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
          `).all()
        )
        
        return sessionStats
      })
    
    const getDatabaseStatus = () =>
      Effect.gen(function* () {
        // SchemaManager 기능 활용
        const dbStatus = yield* getDatabaseStatus() // SchemaManager에서 제공
        const currentVersion = yield* schemaManager.getCurrentVersion()
        
        return {
          ...dbStatus,
          schemaVersion: Option.getOrElse(currentVersion, () => "unknown"),
          tableCount: 6, // schema.sql에 정의된 테이블 수
          viewCount: 2,  // current_session_summary, resource_group_performance
          indexCount: 8  // schema.sql에 정의된 인덱스 수
        }
      })

    return QueueMonitor.of({
      getQueueStatus,
      watchQueueProgress,
      getHistoricalStats,
      getDatabaseStatus,
      exportMetrics: (format: 'json' | 'csv') => exportQueueMetrics(format)
    })
  })
)

// CLI 명령어 통합 (schema 상태 포함)
export const queueCommand = Command.make("queue", {
  action: Options.choice("action", ["status", "watch", "history", "clear", "schema"])
}).pipe(
  Command.withHandler(({ action }) =>
    Effect.gen(function* () {
      const monitor = yield* QueueMonitor
      const persistence = yield* QueuePersistence
      
      switch (action) {
        case "status":
          const status = yield* monitor.getQueueStatus()
          yield* Console.log(JSON.stringify(status, null, 2))
          break
          
        case "watch":
          const sessionId = yield* persistence.getCurrentSession()
          yield* monitor.watchQueueProgress(sessionId)
          break
          
        case "history":
          const history = yield* monitor.getHistoricalStats(7)
          yield* Console.table(history)
          break
          
        case "clear":
          const newSessionId = generateSessionId()
          yield* persistence.clearQueueForNewSession(newSessionId)
          yield* Console.log(`Queue cleared. New session: ${newSessionId}`)
          break
          
        case "schema":
          const dbStatus = yield* monitor.getDatabaseStatus()
          yield* Console.log("Database Schema Status:")
          yield* Console.log(`Version: ${dbStatus.schemaVersion}`)
          yield* Console.log(`Tables: ${dbStatus.tableCount}`)
          yield* Console.log(`Valid: ${dbStatus.isValid}`)
          break
      }
    })
  )
)
```

**구현 항목**:
- [ ] schema.sql VIEW 활용한 효율적 상태 조회
- [ ] CLI 대시보드 watch 모드 (Schedule.fixed 활용)
- [ ] queue_sessions 기반 히스토리컬 통계
- [ ] 큐 초기화 명령어 (clear)
- [ ] SchemaManager 통합 database 상태 확인
- [ ] JSON/CSV 메트릭 내보내기

**완료 기준**:
- [ ] `queue status` - current_session_summary VIEW 활용
- [ ] `queue watch` - 실시간 프로세스 상태 포함
- [ ] `queue history` - queue_sessions 테이블 기반 통계
- [ ] `queue clear` - 큐 초기화 후 새 세션 시작
- [ ] `queue schema` - 데이터베이스 스키마 상태 조회

## 📋 Phase 2: 장기 안정성 + 복원력 시스템 (Week 2)

### 2.1 스키마 호환 Heartbeat + 안정성 모니터링
**예상 시간**: 2-3일 (process_heartbeat 테이블 활용)
**파일**: `src/services/Queue/StabilityMonitor.ts`

```typescript
// process_heartbeat 테이블과 완전 호환되는 안정성 모니터링
export const StabilityMonitorLive = Layer.effect(
  StabilityMonitor,
  Effect.gen(function* () {
    const persistence = yield* QueuePersistence
    const schemaManager = yield* SchemaManager
    
    // SQLite 연결 (SchemaManager와 동일)
    const db = new Database(".effect-cli/queue.db")
    
    // 프로세스 상태 추적 (Ref + schema.sql 호환)
    const processState = yield* Ref.make({
      startTime: new Date(),
      lastHeartbeat: new Date(),
      totalProcessed: 0,
      totalFailed: 0,
      consecutiveFailures: 0,
      memoryLeakDetected: false,
      gcTriggered: false,
      circuitBreakerOpen: false
    })
    
    // Heartbeat 기록 (process_heartbeat 테이블 정확히 호환)
    const recordHeartbeat = Effect.gen(function* () {
      const state = yield* Ref.get(processState)
      const sessionId = yield* persistence.getCurrentSession()
      const now = new Date()
      const memUsage = process.memoryUsage()
      
      // schema.sql process_heartbeat 테이블과 정확히 맞춤
      yield* Effect.sync(() =>
        db.prepare(`
          INSERT OR REPLACE INTO process_heartbeat 
          (process_id, session_id, timestamp, memory_used_mb, memory_total_mb,
           uptime_seconds, tasks_processed, tasks_failed, consecutive_failures,
           memory_leak_detected, gc_triggered, circuit_breaker_open)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          process.pid,
          sessionId,
          now.toISOString(),
          Math.round(memUsage.heapUsed / 1024 / 1024),
          Math.round(memUsage.heapTotal / 1024 / 1024), 
          Math.floor((now.getTime() - state.startTime.getTime()) / 1000),
          state.totalProcessed,
          state.totalFailed,
          state.consecutiveFailures,
          state.memoryLeakDetected,
          state.gcTriggered,
          state.circuitBreakerOpen
        )
      )
      
      yield* Ref.update(processState, s => ({ ...s, lastHeartbeat: now, gcTriggered: false }))
    })
    
    // 메모리 누수 감지 및 GC 트리거
    const detectMemoryLeak = Effect.gen(function* () {
      const memUsage = process.memoryUsage()
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024
      
      // 500MB 이상 시 경고 및 상태 업데이트
      if (heapUsedMB > 500) {
        yield* Effect.log(`Memory leak warning: ${heapUsedMB.toFixed(1)}MB`)
        yield* Ref.update(processState, s => ({ ...s, memoryLeakDetected: true }))
        
        // 가비지 컬렉션 강제 실행
        if (global.gc) {
          yield* Effect.sync(() => global.gc())
          yield* Ref.update(processState, s => ({ ...s, gcTriggered: true }))
          yield* Effect.log("Forced garbage collection")
        }
      } else if (heapUsedMB < 200 && state.memoryLeakDetected) {
        // 메모리 사용량이 안정화되면 상태 리셋
        yield* Ref.update(processState, s => ({ ...s, memoryLeakDetected: false }))
      }
    })
    
    // 연속 실패 추적 및 Circuit Breaker 연동
    const handleFailure = (error: unknown) =>
      Effect.gen(function* () {
        yield* Ref.update(processState, s => ({ 
          ...s, 
          totalFailed: s.totalFailed + 1,
          consecutiveFailures: s.consecutiveFailures + 1 
        }))
        
        const state = yield* Ref.get(processState)
        
        // 10회 연속 실패 시 Circuit Breaker 상태 업데이트
        if (state.consecutiveFailures >= 10) {
          yield* Effect.log("Too many consecutive failures, updating circuit breaker status")
          yield* Ref.update(processState, s => ({ ...s, circuitBreakerOpen: true }))
        }
      })
    
    const handleSuccess = Effect.gen(function* () {
      yield* Ref.update(processState, s => ({ 
        ...s, 
        totalProcessed: s.totalProcessed + 1,
        consecutiveFailures: 0, // 성공 시 리셋
        circuitBreakerOpen: false // 성공하면 Circuit Breaker 복구
      }))
    })
    
    // 백그라운드 안정성 모니터링 Fiber
    const stabilityFiber = yield* Effect.gen(function* () {
      yield* recordHeartbeat
      yield* detectMemoryLeak
    }).pipe(
      Effect.repeat(Schedule.fixed(Duration.seconds(30))), // 30초마다
      Effect.catchAll(error => 
        handleFailure(error).pipe(Effect.flatMap(() => Effect.unit))
      ),
      Effect.fork
    )
    
    // 프로세스 종료 시 정리 (queue_sessions 상태 업데이트)
    const gracefulShutdown = Effect.gen(function* () {
      yield* Effect.log("Initiating graceful shutdown...")
      yield* Fiber.interrupt(stabilityFiber)
      
      // 진행 중인 작업들을 pending으로 복구
      const sessionId = yield* persistence.getCurrentSession()
      yield* persistence.recoverFromCrash(sessionId)
      
      // 세션 종료 상태 업데이트
      yield* Effect.sync(() =>
        db.prepare(`
          UPDATE queue_sessions 
          SET status = 'completed', ended_at = ?
          WHERE session_id = ?
        `).run(new Date().toISOString(), sessionId)
      )
      
      yield* Effect.log("Graceful shutdown completed")
    })

    return StabilityMonitor.of({
      getProcessState: () => Ref.get(processState),
      recordTaskCompletion: () => handleSuccess,
      recordTaskFailure: (error: unknown) => handleFailure(error),
      gracefulShutdown
    })
  })
)
```

**구현 항목**:
- [ ] 프로세스 Heartbeat 기록 (30초마다 SQLite 저장)
- [ ] 메모리 누수 자동 감지 및 GC 트리거
- [ ] 연속 실패 추적 및 자동 복구 모드
- [ ] Graceful shutdown 처리 (SIGTERM/SIGINT)
- [ ] Effect.catchAll을 통한 복원력

**완료 기준**:
- [ ] 장기간 실행 시 메모리 안정성 확보
- [ ] 프로세스 비정상 종료 시 작업 복구
- [ ] 30초마다 상태 정보 지속성 저장

### 2.2 Effect.sleep + Semaphore 기반 Adaptive Throttling
**예상 시간**: 3-4일
**파일**: `src/services/Queue/AdaptiveThrottler.ts`

```typescript
// Effect.js Semaphore + sleep 패턴
export const AdaptiveThrottlerLive = Layer.effect(
  AdaptiveThrottler,
  Effect.gen(function* () {
    const monitor = yield* ResourceMonitor
    
    // ResourceGroup별 Semaphore로 동시성 제어
    const semaphores = yield* Effect.forEach(
      ["filesystem", "network", "computation", "memory-intensive"] as const,
      (group) => 
        Semaphore.make(getConcurrencyLimit(group)).pipe(
          Effect.map(sem => [group, sem] as const)
        )
    ).pipe(Effect.map(entries => new Map(entries)))

    const throttle = <A, E>(
      resourceGroup: ResourceGroup, 
      operation: Effect.Effect<A, E>
    ) =>
      Effect.gen(function* () {
        const semaphore = semaphores.get(resourceGroup)!
        const metrics = yield* monitor.getMetrics()
        
        // 시스템 부하 기반 지연 계산
        const delay = calculateAdaptiveDelay(metrics, resourceGroup)
        
        // Semaphore.withPermits로 동시성 제어 + 지연
        return yield* Semaphore.withPermits(semaphore, 1)(
          Effect.gen(function* () {
            yield* Effect.sleep(delay)
            return yield* operation.pipe(
              Effect.withSpan(`throttled-${resourceGroup}`, {
                attributes: { 
                  delay: delay.millis,
                  memoryMB: Math.round(metrics.memoryUsage / 1024 / 1024)
                }
              })
            )
          })
        )
      })

    return AdaptiveThrottler.of({ throttle })
  })
)

// 부하 기반 지연 계산 함수
const calculateAdaptiveDelay = (metrics: SystemMetrics, group: ResourceGroup): Duration.Duration => {
  const memoryRatio = metrics.memoryUsage / metrics.memoryTotal
  const baseDelay = getBaseDelay(group)
  
  if (memoryRatio > 0.8) return Duration.millis(baseDelay.millis * 4)
  if (memoryRatio > 0.6) return Duration.millis(baseDelay.millis * 2)
  return baseDelay
}
```

**구현 항목**:
- [ ] Semaphore.withPermits 동시성 제어
- [ ] Effect.sleep 기반 적응형 지연
- [ ] ResourceMonitor와 연동한 부하 감지
- [ ] Effect.withSpan을 통한 추적성
- [ ] ResourceGroup별 독립적 throttling 정책

**완료 기준**:
- [ ] Semaphore 기반 동시성 제한 동작
- [ ] 시스템 메트릭 기반 적응형 지연
- [ ] Effect tracing으로 성능 분석

### 2.3 Progress Tracking
**예상 시간**: 1-2일
**파일**: `src/services/Queue/ProgressTracker.ts`

**구현 항목**:
- [ ] 작업 진행률 추적
- [ ] 실시간 통계 수집
- [ ] CLI 진행률 표시
- [ ] 성능 메트릭 로깅

**완료 기준**:
- [ ] 정확한 진행률 계산
- [ ] 사용자 친화적 표시
- [ ] 로그 형식 일관성

## 📋 Phase 3: Effect.js + 지속성 통합 Layer (Week 3)

### 3.1 완전 투명한 QueuedFileSystem with Persistence
**예상 시간**: 3-4일
**파일**: `src/services/QueuedFileSystemLive.ts`

```typescript
// Effect.js 중심, bun:sqlite는 지속성만 담당
export const QueuedFileSystemLive = Layer.effect(
  FileSystem,
  Effect.gen(function* () {
    // Effect.js 서비스 의존성 주입
    const baseFS = yield* FileSystem
    const persistence = yield* QueuePersistence  
    const throttler = yield* AdaptiveThrottler
    const circuitBreaker = yield* CircuitBreaker
    const stability = yield* StabilityMonitor
    
    // 세션 초기화 (재요청 시 이전 큐 정리)
    const sessionId = yield* persistence.getCurrentSession()
    yield* persistence.clearQueueForNewSession(sessionId)
    yield* Effect.log(`Started new queue session: ${sessionId}`)
    
    // 투명한 파일 읽기 (사용자는 큐 존재 모름)
    const readFileContent = (filePath: string) =>
      Effect.gen(function* () {
        // 1. Circuit Breaker 체크 (Effect.js 방식)
        const allowed = yield* circuitBreaker.shouldAllow("filesystem")
        if (!allowed) {
          return yield* Effect.fail(new CircuitBreakerError("filesystem"))
        }
        
        // 2. 작업을 SQLite에 기록 (지속성)
        const taskId = `read-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        yield* persistence.persistTask({
          id: taskId,
          sessionId,
          type: "file-read",
          resourceGroup: "filesystem",
          operation: Effect.succeed("placeholder"), // 실제로는 저장하지 않음
          priority: 1,
          estimatedDuration: Duration.millis(100),
          status: "pending",
          createdAt: new Date(),
          retryCount: 0
        })
        
        // 3. Effect.js throttling 적용
        const result = yield* throttler.throttle(
          "filesystem",
          Effect.gen(function* () {
            // 상태를 running으로 업데이트
            yield* persistence.updateTaskStatus(taskId, "running")
            
            // 실제 파일 읽기 (Effect.js 방식)
            const content = yield* baseFS.readFileContent(filePath).pipe(
              Effect.retry({
                schedule: Schedule.exponential(Duration.millis(100)).pipe(
                  Schedule.intersect(Schedule.recurs(3))
                )
              })
            )
            
            return content
          })
        )
        
        // 4. 성공 처리
        yield* persistence.updateTaskStatus(taskId, "completed")
        yield* circuitBreaker.recordSuccess("filesystem")
        yield* stability.recordTaskCompletion()
        
        return result
        
      }).pipe(
        Effect.catchAll(error => 
          Effect.gen(function* () {
            // 실패 처리 (Effect.js + SQLite)
            yield* persistence.updateTaskStatus(taskId, "failed", String(error))
            yield* circuitBreaker.recordFailure("filesystem", error)
            return yield* Effect.fail(error)
          })
        ),
        Effect.withSpan("queued-read-file", { attributes: { path: filePath } })
      )

    // 모든 파일 시스템 작업을 큐를 통해 처리
    return FileSystem.of({
      readFileContent,
      listDirectory: (path) => wrapWithQueue("list-directory", "filesystem", baseFS.listDirectory(path)),
      findFiles: (searchPath, pattern) => wrapWithQueue("find-files", "filesystem", baseFS.findFiles(searchPath, pattern))
    })
  })
)

// 완전한 Layer 조합 (Effect.js 중심)
export const PersistedQueueSystemLayer = Layer.mergeAll(
  QueuePersistenceLive,      // SQLite 지속성 (보조)
  StabilityMonitorLive,      // Effect.js 안정성 (핵심)
  CircuitBreakerLive,        // Effect.js 복원력 (핵심)  
  AdaptiveThrottlerLive      // Effect.js 속도조절 (핵심)
).pipe(
  Layer.provide(FileSystemLive),  // 기존 Effect.js Layer
  Layer.provide(QueueMonitorLive)  // CLI 모니터링
)
```

**핵심 설계 원칙**:
- **Effect.js 중심**: 모든 비즈니스 로직은 Effect 패턴
- **bun:sqlite 보조**: 지속성과 모니터링 데이터만 SQLite
- **완전 투명**: 사용자 코드는 큐 존재를 전혀 모름
- **재요청 시 초기화**: 새 세션마다 이전 큐 자동 정리

**구현 항목**:
- [ ] Effect.js 서비스들의 완벽한 조합
- [ ] 재요청 시 자동 큐 초기화 (sessionId 기반)
- [ ] SQLite는 오직 메타데이터 저장용
- [ ] 기존 FileSystem API 100% 호환성

**완료 기준**:
- [ ] 기존 Command 코드 전혀 수정 없이 큐 적용
- [ ] CLI 재실행 시 이전 큐 완전 정리
- [ ] 장기간 실행 시 안정성 확보

### 3.2 Network Request Queue
**예상 시간**: 2-3일
**파일**: `src/services/QueuedNetworkService.ts`

**구현 항목**:
- [ ] HTTP 요청 큐 관리
- [ ] Rate limiting 준수
- [ ] 재시도 로직 통합
- [ ] 타임아웃 처리

**완료 기준**:
- [ ] API 호출 제한 준수
- [ ] 네트워크 에러 복원력
- [ ] 응답 시간 최적화

### 3.3 Layer Composition
**예상 시간**: 1-2일
**파일**: `src/services/QueueSystemLive.ts`

**구현 항목**:
- [ ] 모든 큐 서비스 통합
- [ ] Layer 의존성 관리
- [ ] 설정 주입 시스템
- [ ] 생명주기 관리

**완료 기준**:
- [ ] 깔끔한 서비스 조립
- [ ] 순환 의존성 없음
- [ ] 메모리 정리 보장

## 📋 Phase 4: CLI 통합 및 최적화 (Week 3)

### 4.1 Command Integration
**예상 시간**: 2-3일
**파일들**: `src/examples/*Command.ts`

**구현 항목**:
- [ ] 기존 명령어에 큐 적용
- [ ] 대량 처리 명령어 최적화
- [ ] 에러 처리 개선
- [ ] 사용자 피드백 향상

**완료 기준**:
- [ ] 모든 명령어 정상 동작
- [ ] 성능 개선 측정
- [ ] 사용자 경험 개선

### 4.2 Configuration System
**예상 시간**: 1-2일
**파일**: `src/config/QueueConfig.ts`

**구현 항목**:
- [ ] 설정 파일 스키마
- [ ] 환경별 설정 관리
- [ ] 런타임 설정 변경
- [ ] 검증 및 기본값

**완료 기준**:
- [ ] 유연한 설정 시스템
- [ ] 설정 검증 로직
- [ ] 문서화된 옵션들

### 4.3 Monitoring & Debugging
**예상 시간**: 2일
**파일**: `src/services/Queue/Monitor.ts`

**구현 항목**:
- [ ] 큐 상태 시각화
- [ ] 디버그 정보 수집
- [ ] 성능 메트릭 내보내기
- [ ] 로그 레벨 제어

**완료 기준**:
- [ ] 운영 가시성 확보
- [ ] 문제 진단 도구
- [ ] 성능 튜닝 정보

## 📋 Phase 5: Effect.js 테스트 패턴 (Week 3)

### 5.1 Effect Testing Framework 활용
**예상 시간**: 2-3일

```typescript
// Effect.js 기반 테스트 패턴
import * as Effect from "effect/Effect"
import * as TestClock from "effect/TestClock" 
import * as TestContext from "effect/TestContext"
import * as Layer from "effect/Layer"

describe("InternalQueue", () => {
  it("should enqueue and process tasks in order", () =>
    Effect.gen(function* () {
      // TestClock으로 시간 제어
      yield* TestClock.adjust(Duration.seconds(0))
      
      const queue = yield* InternalQueue
      const results: string[] = []
      
      // 테스트용 작업들
      const task1 = createTestTask("task1", () => 
        Effect.sync(() => results.push("task1"))
      )
      const task2 = createTestTask("task2", () =>
        Effect.sync(() => results.push("task2"))  
      )
      
      // 큐에 작업 추가
      yield* queue.enqueue(task1)
      yield* queue.enqueue(task2)
      
      // 시간 진행하여 처리 완료 대기
      yield* TestClock.adjust(Duration.seconds(1))
      
      // 결과 검증
      expect(results).toEqual(["task1", "task2"])
      
    }).pipe(
      Effect.provide(InternalQueueLive),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise
    )
  )
  
  it("should handle circuit breaker failures", () =>
    Effect.gen(function* () {
      const circuitBreaker = yield* CircuitBreaker
      
      // 연속 실패 시뮬레이션
      yield* Effect.forEach(Array.range(1, 6), () =>
        circuitBreaker.recordFailure("filesystem", new Error("test"))
      )
      
      // Circuit Breaker가 Open 상태인지 확인
      const shouldAllow = yield* circuitBreaker.shouldAllow("filesystem")
      expect(shouldAllow).toBe(false)
      
    }).pipe(
      Effect.provide(CircuitBreakerLive),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise
    )
  )
})

// Mock Layer 생성 패턴
const TestFileSystemLive = Layer.effect(
  FileSystem,
  Effect.gen(function* () {
    return FileSystem.of({
      readFileContent: (path) => 
        Effect.succeed(`mock content for ${path}`),
      listDirectory: (path) =>
        Effect.succeed([
          { name: "test.txt", path: `${path}/test.txt`, isDirectory: false, size: 100 }
        ]),
      findFiles: (searchPath, pattern) =>
        Effect.succeed([])
    })
  })
)
```

**테스트 범위**:
- [ ] TestContext.TestContext로 격리된 단위 테스트
- [ ] TestClock으로 시간 기반 로직 테스트 (throttling, circuit breaker)
- [ ] Mock Layer를 통한 의존성 분리 테스트
- [ ] Effect.gen 패턴 기반 통합 테스트
- [ ] Fiber.interrupt를 활용한 정리 로직 테스트

**완료 기준**:
- [ ] Effect.runPromise 기반 비동기 테스트
- [ ] Layer 조합 테스트 (의존성 정상 주입)
- [ ] TestClock 활용 시간 제어 테스트

### 5.2 Performance Benchmarking
**예상 시간**: 1-2일

**벤치마크 항목**:
- [ ] 큐 없음 vs 큐 적용 성능 비교
- [ ] 메모리 사용량 프로파일링
- [ ] 다양한 부하 조건 테스트
- [ ] 실제 사용 시나리오 검증

**완료 기준**:
- [ ] 성능 회귀 없음
- [ ] 리소스 사용량 안정성
- [ ] 확장성 검증

### 5.3 Documentation Update
**예상 시간**: 1일

**문서 업데이트**:
- [ ] API 레퍼런스 생성
- [ ] 사용 가이드 작성
- [ ] 설정 옵션 문서화
- [ ] 트러블슈팅 가이드

**완료 기준**:
- [ ] 완전한 사용자 가이드
- [ ] 개발자 문서 완성
- [ ] 예제 코드 검증

## 🚨 위험 요소 및 대응

### 기술적 위험
- **메모리 누수**: 철저한 테스트, 프로파일링
- **성능 저하**: 벤치마킹, 최적화
- **복잡성 증가**: 단계적 구현, 리팩토링

### 일정 위험
- **과소 추정**: 20% 버퍼 시간 포함
- **기술 이슈**: 프로토타입 우선 구현
- **통합 문제**: 점진적 통합 전략

## 📊 성공 기준

### Effect.js 특화 요구사항
- [ ] Context.GenericTag 기반 서비스 정의
- [ ] Layer.effect 패턴 일관성
- [ ] Effect.gen generator 패턴 활용
- [ ] Ref 기반 안전한 상태 관리
- [ ] Queue.bounded 활용 동시성 제어
- [ ] Semaphore.withPermits 리소스 제한
- [ ] Effect.withSpan 추적성 확보

### Effect.js 성능 요구사항
- [ ] Effect.fork를 통한 비차단 백그라운드 작업
- [ ] Schedule.fixed 기반 정확한 주기성  
- [ ] Fiber 생명주기 적절한 관리
- [ ] Layer 의존성 체인 최적화
- [ ] Effect.catchAll 기반 견고한 에러 처리

### Effect.js 테스트 요구사항
- [ ] TestContext.TestContext 격리 테스트
- [ ] TestClock 시간 제어 테스트
- [ ] Mock Layer 의존성 분리
- [ ] Effect.runPromise 비동기 테스트
- [ ] Layer 조합 통합 테스트

## 🎯 Effect.js 패턴 준수사항

### 필수 패턴
1. **서비스 정의**: `Context.GenericTag<T>("@app/ServiceName")`
2. **서비스 구현**: `Layer.effect(Service, Effect.gen(function* () {}))`
3. **상태 관리**: `Ref.make()` → `Ref.get()` / `Ref.set()` / `Ref.update()`
4. **동시성 제어**: `Queue.bounded()`, `Semaphore.make()`
5. **에러 처리**: `Effect.catchAll()`, `Effect.retry()`
6. **리소스 정리**: `Effect.ensuring()`, `Fiber.interrupt()`

### 프로젝트 기존 패턴 따르기
- FileSystemLive.ts와 동일한 Effect.withSpan 사용
- 기존 Command 패턴과 호환되는 Layer 구성
- 현재 프로젝트의 import 경로 (`effect/Effect`, `effect/Layer` 등)

---

**📅 생성**: 2025-01-12 (Effect.js 기반 재설계)
**👤 담당**: Development Team  
**📋 상태**: Effect.js Planning Phase
**🎯 핵심**: Context + Layer + Effect.gen + Ref + Queue 패턴