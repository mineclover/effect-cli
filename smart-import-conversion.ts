#!/usr/bin/env tsx

import * as fs from "fs/promises"

interface ImportConversion {
  file: string
  conversions: Array<{
    original: string
    namespace: string
    module: string
    valueUsages: string[]
    typeUsages: string[]
    newImport: string
    confidence: 'high' | 'medium'
  }>
}

// 모듈별 값과 타입 분리 패턴
const MODULE_PATTERNS = [
  {
    module: 'effect/Context',
    values: ['GenericTag', 'Tag', 'make'],
    types: ['Context'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Layer',
    values: ['effect', 'succeed', 'fail', 'fromEffect', 'merge'],
    types: ['Layer'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Ref',
    values: ['make', 'get', 'set', 'update', 'modify'],
    types: ['Ref'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Fiber',
    values: ['interrupt', 'join', 'await', 'fork'],
    types: ['Fiber'],
    confidence: 'medium' as const
  }
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

const extractUsages = (content: string, namespace: string) => {
  const valueUsages = new Set<string>()
  const typeUsages = new Set<string>()

  // 값 사용 패턴 (호출, 속성 접근)
  const valueRegex = new RegExp(`\\b${namespace}\\.(\\w+)\\s*[\\(\\.]`, 'g')
  let match
  while ((match = valueRegex.exec(content)) !== null) {
    valueUsages.add(match[1])
  }

  // 타입 사용 패턴 (타입 주석, 제네릭)
  const typeRegex = new RegExp(`\\b${namespace}\\.(\\w+)(?:\\s*<|\\s*\\[|\\s*(?:,|;|\\)|\\}|$))`, 'g')
  match = null
  while ((match = typeRegex.exec(content)) !== null) {
    if (!valueUsages.has(match[1])) {
      typeUsages.add(match[1])
    }
  }

  // 더 정교한 타입 사용 감지
  const typeContexts = [
    // 타입 주석
    new RegExp(`: (?:readonly )?${namespace}\\.(\\w+)`, 'g'),
    // 제네릭 타입
    new RegExp(`<[^>]*${namespace}\\.(\\w+)`, 'g'),
    // 반환 타입
    new RegExp(`Effect<[^>]*${namespace}\\.(\\w+)`, 'g'),
    // 배열 타입
    new RegExp(`Array<${namespace}\\.(\\w+)>`, 'g')
  ]

  for (const regex of typeContexts) {
    match = null
    while ((match = regex.exec(content)) !== null) {
      if (!valueUsages.has(match[1])) {
        typeUsages.add(match[1])
      }
    }
  }

  return {
    values: Array.from(valueUsages).sort(),
    types: Array.from(typeUsages).sort()
  }
}

const canConvert = (module: string, valueUsages: string[], typeUsages: string[]) => {
  const pattern = MODULE_PATTERNS.find(p => p.module === module)
  if (!pattern) return null

  // 모든 값 사용이 안전한지 확인
  const unsafeValues = valueUsages.filter(usage => !pattern.values.includes(usage))
  const unsafeTypes = typeUsages.filter(usage => !pattern.types.includes(usage))

  if (unsafeValues.length === 0 && unsafeTypes.length === 0) {
    return {
      canConvert: true,
      confidence: pattern.confidence,
      reason: 'All usages are safe'
    }
  }

  return {
    canConvert: false,
    confidence: 'low' as const,
    reason: `Unsafe usages: values=[${unsafeValues.join(',')}] types=[${unsafeTypes.join(',')}]`
  }
}

const generateNewImport = (module: string, valueUsages: string[], typeUsages: string[]) => {
  const parts = []

  if (valueUsages.length > 0) {
    parts.push(`{ ${valueUsages.join(', ')} }`)
  }

  if (typeUsages.length > 0) {
    parts.push(`type { ${typeUsages.join(', ')} }`)
  }

  return parts.length > 0 ? `import ${parts.join(', ')} from "${module}"` : null
}

const main = async () => {
  console.log("🎯 Smart import conversion with type/value separation...")

  const files = await findFiles()
  const candidates: ImportConversion[] = []

  // 분석 단계
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const fileConversions: ImportConversion['conversions'] = []

      const namespaceImportRegex = /import\s*\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g
      let importMatch

      while ((importMatch = namespaceImportRegex.exec(content)) !== null) {
        const [fullImport, namespace, module] = importMatch

        const pattern = MODULE_PATTERNS.find(p => p.module === module)
        if (pattern) {
          const usages = extractUsages(content, namespace)

          if (usages.values.length > 0 || usages.types.length > 0) {
            const conversionCheck = canConvert(module, usages.values, usages.types)

            if (conversionCheck?.canConvert) {
              const newImport = generateNewImport(module, usages.values, usages.types)

              if (newImport) {
                fileConversions.push({
                  original: fullImport,
                  namespace,
                  module,
                  valueUsages: usages.values,
                  typeUsages: usages.types,
                  newImport,
                  confidence: conversionCheck.confidence
                })
              }
            } else if (conversionCheck) {
              console.log(`  ⚠️  ${file}: ${namespace} (${module}) - ${conversionCheck.reason}`)
            }
          }
        }
      }

      if (fileConversions.length > 0) {
        candidates.push({ file, conversions: fileConversions })
      }
    } catch (error) {
      console.error(`  ❌ Failed to analyze ${file}:`, error)
    }
  }

  console.log(`\n📊 Smart Analysis Results:`)
  console.log(`  Files with safe conversions: ${candidates.length}`)
  const totalConversions = candidates.reduce((sum, c) => sum + c.conversions.length, 0)
  console.log(`  Total safe conversions: ${totalConversions}`)

  if (candidates.length === 0) {
    console.log("  No safe conversions found.")
    return
  }

  // 변환 실행
  let convertedFiles = 0
  let convertedImports = 0

  for (const candidate of candidates) {
    try {
      let content = await fs.readFile(candidate.file, 'utf-8')
      let hasChanges = false

      for (const conversion of candidate.conversions) {
        // import 구문 변경
        content = content.replace(conversion.original, conversion.newImport)

        // 값 사용 변경
        for (const usage of conversion.valueUsages) {
          const namespaceUsage = new RegExp(`\\b${conversion.namespace}\\.${usage}\\b`, 'g')
          content = content.replace(namespaceUsage, usage)
        }

        // 타입 사용은 그대로 유지하되 namespace 제거
        for (const usage of conversion.typeUsages) {
          const namespaceUsage = new RegExp(`\\b${conversion.namespace}\\.${usage}\\b`, 'g')
          content = content.replace(namespaceUsage, usage)
        }

        hasChanges = true
        convertedImports++

        const valueStr = conversion.valueUsages.length > 0 ? `values: [${conversion.valueUsages.join(', ')}]` : ''
        const typeStr = conversion.typeUsages.length > 0 ? `types: [${conversion.typeUsages.join(', ')}]` : ''
        const usageInfo = [valueStr, typeStr].filter(Boolean).join(', ')

        console.log(`  ✅ ${candidate.file}: ${conversion.namespace} → ${usageInfo} (${conversion.confidence})`)
      }

      if (hasChanges) {
        await fs.writeFile(candidate.file, content, 'utf-8')
        convertedFiles++
      }
    } catch (error) {
      console.error(`  ❌ Failed to convert ${candidate.file}:`, error)
    }
  }

  console.log(`\n✨ Smart conversion completed:`)
  console.log(`  Files modified: ${convertedFiles}`)
  console.log(`  Imports converted: ${convertedImports}`)

  if (convertedFiles > 0) {
    console.log(`\n🔍 Next steps:`)
    console.log(`  1. Run \`npm run check\` to verify TypeScript compilation`)
    console.log(`  2. Run tests to ensure functionality is preserved`)
    console.log(`  3. Measure bundle size improvement`)
  }
}

main().catch(console.error)