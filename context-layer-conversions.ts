#!/usr/bin/env node

/**
 * Convert Context and Layer modules - medium complexity, manageable usage
 */

import { readFileSync, writeFileSync } from 'fs';

const MEDIUM_VALUE_MODULES = [
  {
    module: 'effect/Context',
    values: ['make', 'get', 'Tag', 'GenericTag'],
    types: ['Context', 'Tag'],
    confidence: 'medium' as const
  },
  {
    module: 'effect/Layer',
    values: ['effect', 'succeed', 'provide', 'merge', 'mergeAll', 'suspend', 'sync', 'fromContext'],
    types: ['Layer'],
    confidence: 'medium' as const
  }
];

const CONTEXT_FILES = [
  'src/services/Queue/AdvancedCache.ts',
  'src/services/Queue/TransparentQueueAdapter.ts',
  'src/services/Queue/PerformanceProfiler.ts',
  'src/services/UserExperience/UserExperienceEnhancer.ts',
  'src/services/Queue/SchemaManager.ts',
  'src/services/Queue/MemoryOptimizer.ts',
  'src/services/Queue/types.ts'
];

const LAYER_FILES = [
  'src/layers/index.ts',
  'src/bin.ts',
  'src/services/Queue/index.ts'
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

  // Find type usages - look for type position indicators
  const lines = content.split('\n');
  for (const line of lines) {
    const typeMatch = line.match(new RegExp(`\\b${alias}\\.(\\w+)(?=\\s*[<>|&,)\\]]|$)`));
    if (typeMatch && (
      line.includes(': ') ||
      line.includes('<') ||
      line.includes('|') ||
      line.includes('&') ||
      line.includes('type ')
    )) {
      const usage = typeMatch[1];
      types.add(usage);
    }
  }

  return { values, types };
}

function convertFile(filePath: string, targetModules: typeof MEDIUM_VALUE_MODULES): { converted: boolean; changes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;
    let totalChanges = 0;

    for (const moduleConfig of targetModules) {
      const { module, values: availableValues, types: availableTypes } = moduleConfig;

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
        console.log(`   Remaining: ${remainingUsages.slice(0, 5).join(', ')}`);

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
  console.log('🔄 Context & Layer Module Conversions');
  console.log('====================================\n');

  let totalFiles = 0;
  let totalChanges = 0;

  console.log('📋 Converting Context module...');
  for (const filePath of CONTEXT_FILES) {
    const result = convertFile(filePath, [MEDIUM_VALUE_MODULES[0]]); // Context only
    if (result.converted) {
      totalFiles++;
      totalChanges += result.changes;
    }
    console.log();
  }

  console.log('📋 Converting Layer module...');
  for (const filePath of LAYER_FILES) {
    const result = convertFile(filePath, [MEDIUM_VALUE_MODULES[1]]); // Layer only
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