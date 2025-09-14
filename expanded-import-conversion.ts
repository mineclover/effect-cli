#!/usr/bin/env tsx

import * as fs from "fs/promises"

interface ImportAnalysis {
  file: string
  imports: Array<{
    original: string
    namespace: string
    module: string
    usages: string[]
    isTreeShakable: boolean
    confidence: 'high' | 'medium' | 'low'
  }>
}

// 확장된 안전한 모듈 목록
const EXTENDED_SAFE_MODULES = [
  // 기본 유틸리티
  'effect/Duration',
  'effect/Option',
  'effect/Either',
  'effect/Array',
  'effect/String',
  'effect/Number',
  // 추가 안전한 모듈들
  'effect/Context',
  'effect/Layer',
  'effect/Ref',
  'effect/Fiber'
]

// 모듈별 안전한 사용 패턴 정의
const EXTENDED_USAGE_PATTERNS = [
  // 기존 패턴
  { module: 'effect/Duration', safe: ['seconds', 'minutes', 'hours', 'days', 'millis', 'toMillis', 'fromMillis'], confidence: 'high' as const },
  { module: 'effect/Option', safe: ['none', 'some', 'isNone', 'isSome', 'getOrElse', 'match', 'map', 'flatMap', 'filter'], confidence: 'high' as const },
  { module: 'effect/Either', safe: ['left', 'right', 'isLeft', 'isRight', 'getOrElse', 'match', 'map', 'mapLeft', 'flatMap'], confidence: 'high' as const },
  { module: 'effect/Array', safe: ['map', 'filter', 'reduce', 'find', 'some', 'every', 'length', 'empty', 'append', 'flatten'], confidence: 'high' as const },
  { module: 'effect/String', safe: ['trim', 'split', 'join', 'replace', 'includes', 'startsWith', 'endsWith'], confidence: 'high' as const },
  { module: 'effect/Number', safe: ['toString', 'parseInt', 'parseFloat'], confidence: 'high' as const },

  // 새로 추가하는 패턴들 (보수적으로)
  { module: 'effect/Context', safe: ['GenericTag', 'Tag'], confidence: 'medium' as const },
  { module: 'effect/Layer', safe: ['effect', 'succeed', 'fail'], confidence: 'medium' as const },
  { module: 'effect/Ref', safe: ['make', 'get', 'set', 'update'], confidence: 'medium' as const },
  { module: 'effect/Fiber', safe: ['interrupt', 'join', 'await'], confidence: 'medium' as const }
]

const findFiles = async (): Promise<string[]> => {
  const files: string[] = []

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  }

  await walk('src')
  return files
}

const extractUsages = (content: string, namespace: string): string[] => {
  const usages = new Set<string>()
  const regex = new RegExp(`\\b${namespace}\\.(\\w+)`, 'g')
  let match

  while ((match = regex.exec(content)) !== null) {
    usages.add(match[1])
  }

  return Array.from(usages).sort()
}

const isSafeForConversion = (module: string, usages: string[]): { safe: boolean, confidence: 'high' | 'medium' | 'low' } => {
  const safePattern = EXTENDED_USAGE_PATTERNS.find(p => p.module === module)
  if (!safePattern) return { safe: false, confidence: 'low' }

  // 모든 usage가 안전한 패턴에 포함되어야 함
  const allUsagesSafe = usages.every(usage => safePattern.safe.includes(usage))

  if (allUsagesSafe) {
    return { safe: true, confidence: safePattern.confidence }
  }

  // 부분적으로 안전한 경우 체크 (80% 이상 안전한 패턴인 경우)
  const safeUsageCount = usages.filter(usage => safePattern.safe.includes(usage)).length
  const safeRatio = safeUsageCount / usages.length

  if (safeRatio >= 0.8 && safePattern.confidence === 'high') {
    console.log(`  ⚠️  ${module}: ${(safeRatio * 100).toFixed(1)}% safe usages (${safeUsageCount}/${usages.length})`)
    console.log(`      Unsafe usages: ${usages.filter(usage => !safePattern.safe.includes(usage)).join(', ')}`)
    return { safe: false, confidence: 'medium' }
  }

  return { safe: false, confidence: 'low' }
}

const main = async () => {
  console.log("🚀 Expanded named import conversion starting...")

  const files = await findFiles()
  const candidates: ImportAnalysis[] = []

  // 분석 단계
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const fileImports: ImportAnalysis['imports'] = []

      const namespaceImportRegex = /import\s*\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g
      let importMatch

      while ((importMatch = namespaceImportRegex.exec(content)) !== null) {
        const [fullImport, namespace, module] = importMatch

        if (EXTENDED_SAFE_MODULES.includes(module)) {
          const usages = extractUsages(content, namespace)

          if (usages.length > 0) {
            const safetyCheck = isSafeForConversion(module, usages)

            if (safetyCheck.safe) {
              fileImports.push({
                original: fullImport,
                namespace,
                module,
                usages,
                isTreeShakable: true,
                confidence: safetyCheck.confidence
              })
            }
          }
        }
      }

      if (fileImports.length > 0) {
        candidates.push({ file, imports: fileImports })
      }
    } catch (error) {
      console.error(`  ❌ Failed to analyze ${file}:`, error)
    }
  }

  // 결과 분석
  console.log(`\n📊 Analysis Results:`)
  console.log(`  Files with conversion opportunities: ${candidates.length}`)
  const totalImports = candidates.reduce((sum, c) => sum + c.imports.length, 0)
  console.log(`  Total imports to convert: ${totalImports}`)

  const confidenceBreakdown = candidates.reduce((acc, c) => {
    c.imports.forEach(imp => {
      acc[imp.confidence] = (acc[imp.confidence] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  console.log(`  Confidence levels: High: ${confidenceBreakdown.high || 0}, Medium: ${confidenceBreakdown.medium || 0}, Low: ${confidenceBreakdown.low || 0}`)

  if (candidates.length === 0) {
    console.log("  No safe conversions found.")
    return
  }

  // 사용자에게 확인 요청 (high confidence만 자동 실행)
  const highConfidenceImports = candidates.map(c => ({
    ...c,
    imports: c.imports.filter(imp => imp.confidence === 'high')
  })).filter(c => c.imports.length > 0)

  const mediumConfidenceImports = candidates.map(c => ({
    ...c,
    imports: c.imports.filter(imp => imp.confidence === 'medium')
  })).filter(c => c.imports.length > 0)

  // High confidence imports 자동 실행
  let convertedFiles = 0
  let convertedImports = 0

  console.log(`\n🔥 Converting ${highConfidenceImports.reduce((sum, c) => sum + c.imports.length, 0)} high-confidence imports...`)

  for (const candidate of highConfidenceImports) {
    try {
      let content = await fs.readFile(candidate.file, 'utf-8')
      let hasChanges = false

      for (const importInfo of candidate.imports) {
        const namedImports = importInfo.usages.join(', ')
        const newImport = `import { ${namedImports} } from "${importInfo.module}"`

        // import 변경
        content = content.replace(importInfo.original, newImport)

        // 사용 부분 변경
        for (const usage of importInfo.usages) {
          const namespaceUsage = new RegExp(`\\b${importInfo.namespace}\\.${usage}\\b`, 'g')
          content = content.replace(namespaceUsage, usage)
        }

        hasChanges = true
        convertedImports++
        console.log(`  ✅ ${candidate.file}: ${importInfo.namespace} → { ${namedImports} } (${importInfo.confidence})`)
      }

      if (hasChanges) {
        await fs.writeFile(candidate.file, content, 'utf-8')
        convertedFiles++
      }
    } catch (error) {
      console.error(`  ❌ Failed to convert ${candidate.file}:`, error)
    }
  }

  // Medium confidence imports 목록만 출력
  if (mediumConfidenceImports.length > 0) {
    console.log(`\n⚠️  Medium confidence conversions available (manual review recommended):`)
    mediumConfidenceImports.forEach(candidate => {
      candidate.imports.forEach(importInfo => {
        console.log(`  📋 ${candidate.file}: ${importInfo.namespace} → { ${importInfo.usages.join(', ')} } (${importInfo.module})`)
      })
    })
  }

  console.log(`\n✨ Conversion completed:`)
  console.log(`  Files modified: ${convertedFiles}`)
  console.log(`  Imports converted: ${convertedImports}`)

  if (convertedFiles > 0) {
    console.log(`\n🔍 Next steps:`)
    console.log(`  1. Run \`npm run check\` to verify TypeScript compilation`)
    console.log(`  2. Run tests to ensure functionality is preserved`)
    console.log(`  3. Review medium confidence conversions manually`)
    console.log(`  4. Commit if everything works correctly`)
  }
}

main().catch(console.error)