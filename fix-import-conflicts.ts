#!/usr/bin/env tsx

import * as fs from "fs/promises"
import { glob } from "glob"

interface ImportConflict {
  file: string
  conflicts: Array<{
    importName: string
    fromModules: string[]
  }>
}

const fixImportConflicts = async () => {
  console.log("🔧 Fixing import conflicts...")

  const files = await glob("src/**/*.ts")
  let fixedCount = 0
  const conflicts: ImportConflict[] = []

  for (const file of files) {
    try {
      let content = await fs.readFile(file, 'utf-8')
      const original = content

      // Track imports by name
      const importMap = new Map<string, string[]>()

      // Find all import statements
      const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']([^"']+)["']/g
      let match

      while ((match = importRegex.exec(content)) !== null) {
        const importNames = match[1].split(',').map(name => name.trim().split(' as ')[0])
        const fromModule = match[2]

        importNames.forEach(importName => {
          if (!importMap.has(importName)) {
            importMap.set(importName, [])
          }
          importMap.get(importName)!.push(fromModule)
        })
      }

      // Find conflicts (same name imported from multiple modules)
      const fileConflicts: Array<{importName: string, fromModules: string[]}> = []
      importMap.forEach((modules, importName) => {
        if (modules.length > 1) {
          fileConflicts.push({ importName, fromModules: modules })
        }
      })

      if (fileConflicts.length > 0) {
        conflicts.push({ file, conflicts: fileConflicts })

        // Fix common conflicts with aliases
        for (const conflict of fileConflicts) {
          if (conflict.importName === 'layer') {
            // Fix layer conflicts by adding module-specific aliases
            content = content.replace(
              /import\s*\{\s*([^}]*layer[^}]*)\s*\}\s*from\s*["'](@effect\/platform-node\/NodeContext)["']/g,
              'import { $1 as NodeContextLayer } from "$2"'
            )
            content = content.replace(
              /import\s*\{\s*([^}]*layer[^}]*)\s*\}\s*from\s*["'](@effect\/platform-node\/NodeFileSystem)["']/g,
              'import { $1 as NodeFileSystemLayer } from "$2"'
            )
            content = content.replace(
              /import\s*\{\s*([^}]*layer[^}]*)\s*\}\s*from\s*["'](@effect\/platform-node\/NodePath)["']/g,
              'import { $1 as NodePathLayer } from "$2"'
            )
          }

          if (conflict.importName === 'run') {
            // Fix run conflicts
            content = content.replace(
              /import\s*\{\s*([^}]*run[^}]*)\s*\}\s*from\s*["'](@effect\/cli\/Command)["']/g,
              'import { run as runCommand, $1 } from "$2"'
            )
          }

          if (conflict.importName === 'withDescription') {
            // Fix withDescription conflicts - likely from different CLI modules
            content = content.replace(
              /import\s*\{\s*([^}]*withDescription[^}]*)\s*\}\s*from\s*["'](@effect\/cli\/Args)["']/g,
              'import { withDescription as argsWithDescription, $1 } from "$2"'
            )
            content = content.replace(
              /import\s*\{\s*([^}]*withDescription[^}]*)\s*\}\s*from\s*["'](@effect\/cli\/Options)["']/g,
              'import { withDescription as optionsWithDescription, $1 } from "$2"'
            )
          }
        }

        if (content !== original) {
          await fs.writeFile(file, content, 'utf-8')
          console.log(`  ✅ Fixed conflicts in ${file}`)
          fixedCount++
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to process ${file}:`, error)
    }
  }

  console.log(`\n📊 Found conflicts in ${conflicts.length} files`)
  conflicts.forEach(conflict => {
    console.log(`\n📁 ${conflict.file}:`)
    conflict.conflicts.forEach(c => {
      console.log(`  ⚠️  ${c.importName} imported from: ${c.fromModules.join(', ')}`)
    })
  })

  console.log(`\n✨ Fixed ${fixedCount} files with import conflicts`)
}

fixImportConflicts()