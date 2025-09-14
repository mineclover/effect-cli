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
  }>
}

// 가장 안전한 모듈들만 선택
const SAFE_MODULES = [
  'effect/Duration',
  'effect/Option',
  'effect/Either',
  'effect/Array',
  'effect/String',
  'effect/Number'
]

const SAFE_USAGE_PATTERNS = [
  // Duration
  { module: 'effect/Duration', safe: ['seconds', 'minutes', 'hours', 'days', 'millis', 'toMillis'] },
  // Option
  { module: 'effect/Option', safe: ['none', 'some', 'isNone', 'isSome', 'getOrElse', 'match'] },
  // Either
  { module: 'effect/Either', safe: ['left', 'right', 'isLeft', 'isRight', 'getOrElse', 'match'] },
  // Array
  { module: 'effect/Array', safe: ['map', 'filter', 'reduce', 'find', 'some', 'every'] },
  // String
  { module: 'effect/String', safe: ['trim', 'split', 'join', 'replace', 'includes'] },
  // Number
  { module: 'effect/Number', safe: ['toString', 'parseInt', 'parseFloat'] }
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

const isSafeForConversion = (module: string, usages: string[]): boolean => {
  const safePattern = SAFE_USAGE_PATTERNS.find(p => p.module === module)
  if (!safePattern) return false

  // 모든 usage가 안전한 패턴에 포함되어야 함
  return usages.every(usage => safePattern.safe.includes(usage))
}

const main = async () => {
  console.log("🎯 Careful named import conversion starting...")

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

        if (SAFE_MODULES.includes(module)) {
          const usages = extractUsages(content, namespace)

          if (usages.length > 0 && isSafeForConversion(module, usages)) {
            fileImports.push({
              original: fullImport,
              namespace,
              module,
              usages,
              isTreeShakable: true
            })
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

  console.log(`\n📊 Analysis Results:`)
  console.log(`  Files with safe conversion opportunities: ${candidates.length}`)
  const totalImports = candidates.reduce((sum, c) => sum + c.imports.length, 0)
  console.log(`  Total safe imports to convert: ${totalImports}`)

  if (candidates.length === 0) {
    console.log("  No safe conversions found.")
    return
  }

  // 실행 단계
  let convertedFiles = 0
  let convertedImports = 0

  for (const candidate of candidates) {
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
        console.log(`  ✅ ${candidate.file}: ${importInfo.namespace} → { ${namedImports} }`)
      }

      if (hasChanges) {
        await fs.writeFile(candidate.file, content, 'utf-8')
        convertedFiles++
      }
    } catch (error) {
      console.error(`  ❌ Failed to convert ${candidate.file}:`, error)
    }
  }

  console.log(`\n✨ Conversion completed:`)
  console.log(`  Files modified: ${convertedFiles}`)
  console.log(`  Imports converted: ${convertedImports}`)

  if (convertedFiles > 0) {
    console.log(`\n🔍 Next steps:`)
    console.log(`  1. Run \`npm run check\` to verify TypeScript compilation`)
    console.log(`  2. Run tests to ensure functionality is preserved`)
    console.log(`  3. Commit if everything works correctly`)
  }
}

main().catch(console.error)