#!/usr/bin/env tsx

import * as fs from "fs/promises"
import * as path from "path"

// Enhanced module patterns with more modules
const MODULE_PATTERNS = [
  // Safe modules with clear separation
  {
    module: 'effect/Duration',
    values: ['minutes', 'seconds', 'millis', 'hours', 'days', 'toMillis', 'toSeconds'],
    types: ['Duration'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Option',
    values: ['some', 'none', 'isSome', 'isNone', 'match', 'getOrElse', 'getOrNull', 'fromNullable'],
    types: ['Option'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Array',
    values: ['map', 'filter', 'reduce', 'forEach', 'find', 'findFirst', 'head', 'tail', 'append', 'prepend', 'length'],
    types: ['Array'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Order',
    values: ['make', 'reverse', 'contramap', 'combine'],
    types: ['Order'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Queue',
    values: ['bounded', 'unbounded', 'offer', 'take', 'size'],
    types: ['Queue'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Console',
    values: ['log', 'error', 'warn', 'info', 'debug'],
    types: ['Console'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Schedule',
    values: ['fixed', 'exponential', 'linear', 'spaced', 'forever', 'once', 'recurs'],
    types: ['Schedule'],
    confidence: 'medium' as const
  }
] as const

const walkDirectory = async (dir: string): Promise<string[]> => {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath))
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

const analyzeUsage = (content: string, module: string) => {
  const moduleAlias = module.split('/')[1] // e.g., 'Duration' from 'effect/Duration'
  const importRegex = new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*["']${module.replace('/', '\\/')}["']`, 'g')
  const importMatch = importRegex.exec(content)

  if (!importMatch) return null

  const actualAlias = importMatch[1]
  const usagePattern = new RegExp(`\\b${actualAlias}\\.(\\w+)`, 'g')
  const usages = new Set<string>()

  let match
  while ((match = usagePattern.exec(content)) !== null) {
    usages.add(match[1])
  }

  return {
    alias: actualAlias,
    usages: Array.from(usages)
  }
}

const generateImports = (modulePattern: typeof MODULE_PATTERNS[number], usages: string[]) => {
  const valueImports = usages.filter(usage => modulePattern.values.includes(usage as any))
  const typeImports = usages.filter(usage => modulePattern.types.includes(usage as any))

  const imports: string[] = []

  if (valueImports.length > 0) {
    imports.push(`import { ${valueImports.join(', ')} } from "${modulePattern.module}"`)
  }

  if (typeImports.length > 0) {
    imports.push(`import type { ${typeImports.join(', ')} } from "${modulePattern.module}"`)
  }

  return {
    imports,
    convertedUsages: [...valueImports, ...typeImports],
    unconvertedUsages: usages.filter(usage =>
      !modulePattern.values.includes(usage as any) &&
      !modulePattern.types.includes(usage as any)
    )
  }
}

const convertImports = async () => {
  console.log("🔄 Enhanced Named Import Conversion")
  console.log("=".repeat(50))

  const files = await walkDirectory("src")
  let totalConversions = 0
  let totalFiles = 0

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    let modified = false
    let newContent = content

    for (const modulePattern of MODULE_PATTERNS) {
      const analysis = analyzeUsage(content, modulePattern.module)

      if (analysis) {
        const { imports, convertedUsages, unconvertedUsages } = generateImports(modulePattern, analysis.usages)

        // Only convert if we can handle all or most usages
        const conversionRate = convertedUsages.length / analysis.usages.length

        if (conversionRate >= 0.8 || (conversionRate >= 0.5 && modulePattern.confidence === 'high')) {
          const oldImportRegex = new RegExp(
            `import\\s*\\*\\s*as\\s+${analysis.alias}\\s*from\\s*["']${modulePattern.module.replace('/', '\\/')}["']`,
            'g'
          )

          // Remove old import
          newContent = newContent.replace(oldImportRegex, '')

          // Add new imports at the top
          const importSection = newContent.match(/^((?:import.*\n)*)/)[1] || ''
          const restOfContent = newContent.slice(importSection.length)

          const newImportSection = importSection + imports.join('\n') + (imports.length > 0 ? '\n' : '')
          newContent = newImportSection + restOfContent

          // Update usage patterns for converted usages
          convertedUsages.forEach(usage => {
            const usageRegex = new RegExp(`\\b${analysis.alias}\\.${usage}\\b`, 'g')
            newContent = newContent.replace(usageRegex, usage)
          })

          console.log(`✅ ${path.relative(process.cwd(), file)}: ${modulePattern.module}`)
          console.log(`   Converted: ${convertedUsages.join(', ')}`)
          if (unconvertedUsages.length > 0) {
            console.log(`   Kept namespace for: ${unconvertedUsages.join(', ')}`)

            // Keep namespace import for unconverted usages
            const namespaceImport = `import * as ${analysis.alias} from "${modulePattern.module}"`
            newContent = newContent.replace(imports.join('\n'), imports.join('\n') + '\n' + namespaceImport)
          }

          modified = true
          totalConversions += convertedUsages.length
        }
      }
    }

    if (modified) {
      await fs.writeFile(file, newContent)
      totalFiles++
    }
  }

  console.log(`\n📊 Conversion Summary:`)
  console.log(`Files modified: ${totalFiles}`)
  console.log(`Total conversions: ${totalConversions}`)

  if (totalFiles > 0) {
    console.log(`\n✅ Enhanced import conversion completed!`)
    console.log(`Run 'npm test' to verify functionality.`)
  } else {
    console.log(`\nℹ️ No additional conversions found.`)
  }
}

convertImports().catch(console.error)