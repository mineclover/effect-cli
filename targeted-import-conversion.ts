#!/usr/bin/env tsx

import * as fs from "fs/promises"
import { glob } from "glob"

interface ConversionCandidate {
  file: string
  imports: Array<{
    original: string
    converted: string
    namespace: string
    module: string
    usages: string[]
  }>
}

const SAFE_MODULE_PATTERNS = [
  // Effect core modules - these typically have consistent naming
  'effect/Effect',
  'effect/Console',
  'effect/Duration',
  'effect/Layer',
  'effect/Option',
  'effect/Either',
  'effect/Array',
  'effect/String',
  'effect/Number',
  // Platform modules with clear usage patterns
  '@effect/platform/FileSystem',
  '@effect/platform/Path'
]

const USAGE_EXTRACTION_PATTERNS = [
  // Common patterns: Namespace.method(), Namespace.property
  /\b(\w+)\.(\w+)\s*\(/g,   // Method calls: Effect.gen(), Console.log()
  /\b(\w+)\.(\w+)\b/g       // Property access: Option.none, Either.right
]

const targetedConversion = async () => {
  console.log("🎯 Starting targeted namespace import conversion...")

  const files = await glob("src/**/*.ts")
  let convertedCount = 0
  const candidates: ConversionCandidate[] = []

  // Step 1: Analyze files and identify safe conversion candidates
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const fileImports: ConversionCandidate['imports'] = []

      // Find namespace imports from safe modules
      const namespaceImportRegex = /import\s*\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g
      let importMatch

      while ((importMatch = namespaceImportRegex.exec(content)) !== null) {
        const [fullImport, namespace, module] = importMatch

        // Only process safe modules
        if (SAFE_MODULE_PATTERNS.includes(module)) {
          // Extract actual usages of this namespace
          const usages = extractNamespaceUsages(content, namespace)

          if (usages.length > 0) {
            // Convert to named imports
            const namedImports = [...new Set(usages)].sort()
            const convertedImport = `import { ${namedImports.join(', ')} } from "${module}"`

            fileImports.push({
              original: fullImport,
              converted: convertedImport,
              namespace,
              module,
              usages
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
  console.log(`  Files with conversion opportunities: ${candidates.length}`)
  const totalImports = candidates.reduce((sum, c) => sum + c.imports.length, 0)
  console.log(`  Total imports to convert: ${totalImports}`)

  // Step 2: Apply conversions
  for (const candidate of candidates) {
    try {
      let content = await fs.readFile(candidate.file, 'utf-8')
      let hasChanges = false

      for (const importInfo of candidate.imports) {
        // Replace the import statement
        const oldImport = importInfo.original
        const newImport = importInfo.converted

        if (content.includes(oldImport)) {
          content = content.replace(oldImport, newImport)

          // Replace all namespace usages
          for (const usage of importInfo.usages) {
            const namespaceUsage = new RegExp(`\\b${importInfo.namespace}\\.${usage}\\b`, 'g')
            content = content.replace(namespaceUsage, usage)
          }

          hasChanges = true
          console.log(`  ✅ Converted ${importInfo.namespace} from ${importInfo.module}`)
        }
      }

      if (hasChanges) {
        await fs.writeFile(candidate.file, content, 'utf-8')
        convertedCount++
        console.log(`  📝 Updated ${candidate.file}`)
      }
    } catch (error) {
      console.error(`  ❌ Failed to convert ${candidate.file}:`, error)
    }
  }

  console.log(`\n✨ Conversion completed:`)
  console.log(`  Files modified: ${convertedCount}`)
  console.log(`  Total imports converted: ${candidates.reduce((sum, c) => sum + c.imports.length, 0)}`)

  if (convertedCount > 0) {
    console.log(`\n🔍 Next steps:`)
    console.log(`  1. Run \`npm run check\` to verify TypeScript compilation`)
    console.log(`  2. Run tests to ensure functionality is preserved`)
    console.log(`  3. Measure bundle size improvement`)
  }
}

function extractNamespaceUsages(content: string, namespace: string): string[] {
  const usages = new Set<string>()

  // Find all namespace.member patterns
  const usageRegex = new RegExp(`\\b${namespace}\\.(\\w+)`, 'g')
  let match

  while ((match = usageRegex.exec(content)) !== null) {
    const member = match[1]
    usages.add(member)
  }

  return Array.from(usages).sort()
}

targetedConversion()