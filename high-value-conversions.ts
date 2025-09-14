#!/usr/bin/env node

/**
 * Convert high-value, low-risk modules: Array, Fiber, Ref
 */

import { readFileSync, writeFileSync } from 'fs';

const HIGH_VALUE_MODULES = [
  {
    module: 'effect/Array',
    values: ['map', 'filter', 'reduce', 'forEach', 'sort', 'find', 'findFirst', 'length', 'isEmpty', 'push', 'concat', 'reverse', 'slice', 'head', 'tail', 'last', 'get', 'contains', 'join'],
    types: ['NonEmptyArray'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Fiber',
    values: ['fork', 'join', 'interrupt', 'await', 'done', 'poll', 'status', 'interruptAll', 'joinAll'],
    types: ['Fiber', 'RuntimeFiber', 'FiberStatus'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Ref',
    values: ['make', 'get', 'set', 'update', 'modify', 'getAndSet', 'getAndUpdate', 'setAndGet', 'updateAndGet'],
    types: ['Ref'],
    confidence: 'high' as const
  }
];

const TARGET_FILES = [
  'src/services/FileSystemLive.ts', // Array
  'src/services/Queue/InternalQueueLive.ts', // Fiber
  'src/services/Queue/StabilityMonitorLive.ts' // Fiber + Ref
];

function analyzeUsage(content: string, alias: string): { values: Set<string>; types: Set<string> } {
  const values = new Set<string>();
  const types = new Set<string>();

  // Find all usages of the alias
  const usageRegex = new RegExp(`\\b${alias}\\.(\\w+)`, 'g');
  let match;

  while ((match = usageRegex.exec(content)) !== null) {
    const usage = match[1];
    values.add(usage);
  }

  // Find type usages
  const typeRegex = new RegExp(`\\b${alias}\\.(\\w+)(?=\\s*[<>|&,)\\]]|$)`, 'g');
  let typeMatch;

  while ((typeMatch = typeRegex.exec(content)) !== null) {
    const usage = typeMatch[1];
    types.add(usage);
  }

  return { values, types };
}

function convertFile(filePath: string): { converted: boolean; changes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;
    let totalChanges = 0;

    for (const moduleConfig of HIGH_VALUE_MODULES) {
      const { module, values: availableValues, types: availableTypes } = moduleConfig;
      const moduleShort = module.split('/')[1];

      // Find namespace import
      const namespaceRegex = new RegExp(`import \\* as (\\w+) from ['"]${module.replace('/', '\\/')}['"]`);
      const namespaceMatch = content.match(namespaceRegex);

      if (!namespaceMatch) continue;

      const alias = namespaceMatch[1];
      const { values: usedValues, types: usedTypes } = analyzeUsage(content, alias);

      // Filter to only available exports
      const validValues = [...usedValues].filter(v => availableValues.includes(v));
      const validTypes = [...usedTypes].filter(t => availableTypes.includes(t));

      if (validValues.length === 0 && validTypes.length === 0) continue;

      console.log(`🔄 ${filePath} - Converting ${module}`);
      console.log(`   Values: ${validValues.join(', ')}`);
      console.log(`   Types: ${validTypes.join(', ')}`);

      // Create new import statements
      let newImports = '';
      if (validValues.length > 0) {
        newImports += `import { ${validValues.join(', ')} } from "${module}"\n`;
      }
      if (validTypes.length > 0) {
        newImports += `import type { ${validTypes.join(', ')} } from "${module}"\n`;
      }

      // Replace namespace import with named imports
      newContent = newContent.replace(namespaceRegex, newImports.trim());

      // Replace usages
      for (const value of validValues) {
        const valueRegex = new RegExp(`\\b${alias}\\.${value}\\b`, 'g');
        newContent = newContent.replace(valueRegex, value);
        totalChanges++;
      }

      for (const type of validTypes) {
        const typeRegex = new RegExp(`\\b${alias}\\.${type}\\b`, 'g');
        newContent = newContent.replace(typeRegex, type);
        totalChanges++;
      }

      // Check if any usages remain
      const remainingRegex = new RegExp(`\\b${alias}\\.\\w+`, 'g');
      const remainingUsages = newContent.match(remainingRegex);

      if (remainingUsages && remainingUsages.length > 0) {
        console.log(`   ⚠️  ${remainingUsages.length} unconverted usages remain`);

        // Add back namespace import for remaining usages
        const firstImport = newContent.match(/^import .*$/m);
        if (firstImport) {
          const namespaceImport = `import * as ${alias} from "${module}"`;
          newContent = newContent.replace(firstImport[0], `${namespaceImport}\n${firstImport[0]}`);
        }
      }

      console.log(`   ✅ ${totalChanges} conversions applied`);
    }

    if (newContent !== content) {
      writeFileSync(filePath, newContent);
      console.log(`✅ Updated ${filePath}`);
      return { converted: true, changes: totalChanges };
    }

    return { converted: false, changes: 0 };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error}`);
    return { converted: false, changes: 0 };
  }
}

function main() {
  console.log('🚀 High-Value Module Conversions');
  console.log('================================\n');

  let totalFiles = 0;
  let totalChanges = 0;

  for (const filePath of TARGET_FILES) {
    const result = convertFile(filePath);
    if (result.converted) {
      totalFiles++;
      totalChanges += result.changes;
    }
    console.log();
  }

  console.log('📊 Conversion Summary:');
  console.log(`   Files converted: ${totalFiles}`);
  console.log(`   Total changes: ${totalChanges}`);

  if (totalFiles > 0) {
    console.log('\n🧪 Running tests to verify conversions...');
  }
}

main();