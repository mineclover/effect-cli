#!/usr/bin/env tsx

import * as fs from "fs/promises"
import * as path from "path"

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

const analyzeBundleSize = async () => {
  console.log("📊 Bundle Size Analysis")
  console.log("=".repeat(50))

  // Check current bundle size
  const bundlePath = "dist/bin.cjs"

  try {
    const stats = await fs.stat(bundlePath)
    const sizeInKB = (stats.size / 1024).toFixed(2)
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log(`Current bundle size: ${sizeInKB} KB (${sizeInMB} MB)`)
  } catch (error) {
    console.log("❌ Bundle file not found. Building first...")

    // Try to build
    const { spawn } = await import("child_process")
    const buildProcess = spawn("npm", ["run", "build"], { stdio: "inherit" })

    await new Promise((resolve, reject) => {
      buildProcess.on("close", (code) => {
        if (code === 0) resolve(undefined)
        else reject(new Error(`Build failed with code ${code}`))
      })
    })

    // Check again after build
    try {
      const stats = await fs.stat(bundlePath)
      const sizeInKB = (stats.size / 1024).toFixed(2)
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`Bundle size after build: ${sizeInKB} KB (${sizeInMB} MB)`)
    } catch {
      console.log("❌ Still no bundle file after build")
      return
    }
  }

  // Analyze import conversions made
  const files = await walkDirectory("src")
  let namedImportsCount = 0
  let namespacedImportsCount = 0

  const importPatterns = {
    named: /import\s*{[^}]+}\s*from\s*["']effect\//g,
    namespaced: /import\s*\*\s*as\s+\w+\s*from\s*["']effect\//g,
    typeImport: /import\s*type\s*{[^}]+}\s*from\s*["']effect\//g
  }

  const conversions: string[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')

    const namedMatches = content.match(importPatterns.named) || []
    const typeMatches = content.match(importPatterns.typeImport) || []
    const namespacedMatches = content.match(importPatterns.namespaced) || []

    namedImportsCount += namedMatches.length + typeMatches.length
    namespacedImportsCount += namespacedMatches.length

    if (namedMatches.length > 0 || typeMatches.length > 0) {
      const relativePath = path.relative(process.cwd(), file)
      conversions.push(`  ✅ ${relativePath}: ${namedMatches.length + typeMatches.length} named imports`)
    }
  }

  console.log(`\n📈 Import Analysis:`)
  console.log(`Named imports: ${namedImportsCount}`)
  console.log(`Namespaced imports: ${namespacedImportsCount}`)
  console.log(`Conversion ratio: ${((namedImportsCount / (namedImportsCount + namespacedImportsCount)) * 100).toFixed(1)}%`)

  if (conversions.length > 0) {
    console.log(`\n🔄 Converted files:`)
    conversions.forEach(conv => console.log(conv))
  }

  // Tree-shaking potential
  const treeShakingPotential = namedImportsCount / (namedImportsCount + namespacedImportsCount)
  console.log(`\n🌳 Tree-shaking potential: ${(treeShakingPotential * 100).toFixed(1)}%`)

  if (treeShakingPotential > 0.1) {
    console.log("✅ Good tree-shaking potential! Named imports allow bundlers to eliminate unused code.")
  }
}

analyzeBundleSize().catch(console.error)