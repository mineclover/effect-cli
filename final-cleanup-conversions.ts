#!/usr/bin/env node

/**
 * Final cleanup conversions for remaining Option and Fiber usages
 */

import { readFileSync, writeFileSync } from 'fs';

const FINAL_CLEANUP_MODULES = [
  {
    module: 'effect/Option',
    values: ['map', 'filter', 'flatMap', 'getOrElse', 'fold', 'exists', 'contains', 'tap'],
    types: ['Option'],
    confidence: 'high' as const
  },
  {
    module: 'effect/Fiber',
    values: ['never', 'done', 'poll', 'status', 'unit', 'fail'],
    types: ['Fiber', 'RuntimeFiber'],
    confidence: 'high' as const
  }
];

const REMAINING_FILES = [
  // Option files
  'src/services/Queue/index.ts',
  'src/services/Queue/InternalQueueLive.ts',

  // Fiber file
  'src/services/Queue/StabilityMonitorLive.ts'
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

  // Find type usages with more context
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const typeMatch = line.match(new RegExp(`\\b${alias}\\.(\\w+)(?=\\s*[<>|&,)\\]]|$)`));
    if (typeMatch && (
      line.includes(': ') ||
      line.includes('<') ||
      line.includes('|') ||
      line.includes('&') ||
      line.includes('type ') ||
      line.includes('readonly ') ||
      line.includes('interface ')
    )) {
      const usage = typeMatch[1];
      types.add(usage);
      // Remove from values if it's actually a type
      values.delete(usage);
    }
  }

  return { values, types };
}

function convertFile(filePath: string): { converted: boolean; changes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;
    let totalChanges = 0;

    for (const moduleConfig of FINAL_CLEANUP_MODULES) {
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

      // Replace usages first, then import
      for (const value of validValues) {
        const valueRegex = new RegExp(`\\b${alias}\\.${value}\\b`, 'g');
        const matches = newContent.match(valueRegex);
        if (matches) {
          newContent = newContent.replace(valueRegex, value);
          totalChanges += matches.length;
          console.log(`     Replaced ${matches.length}x ${alias}.${value} → ${value}`);
        }
      }

      for (const type of validTypes) {
        const typeRegex = new RegExp(`\\b${alias}\\.${type}\\b`, 'g');
        const matches = newContent.match(typeRegex);
        if (matches) {
          newContent = newContent.replace(typeRegex, type);
          totalChanges += matches.length;
          console.log(`     Replaced ${matches.length}x ${alias}.${type} → ${type}`);
        }
      }

      // Check if any usages remain
      const remainingRegex = new RegExp(`\\b${alias}\\.\\w+`, 'g');
      const remainingUsages = newContent.match(remainingRegex);

      if (remainingUsages && remainingUsages.length > 0) {
        console.log(`   ⚠️  ${remainingUsages.length} unconverted usages remain: ${remainingUsages.slice(0, 3).join(', ')}`);

        // Add back namespace import for remaining usages
        const firstImport = newContent.match(/^import .*$/m);
        if (firstImport) {
          const namespaceImport = `import * as ${alias} from "${module}"`;
          newContent = newContent.replace(firstImport[0], `${namespaceImport}\n${firstImport[0]}`);
        }

        // Add our named imports after the namespace import
        if (newImports) {
          const namespaceImportLine = newContent.match(`import \\* as ${alias} from "${module.replace('/', '\\//')}"`);
          if (namespaceImportLine) {
            newContent = newContent.replace(namespaceImportLine[0], `${namespaceImportLine[0]}\n${newImports.trim()}`);
          }
        }
      } else {
        // No remaining usages, replace namespace import with named imports
        newContent = newContent.replace(namespaceRegex, newImports.trim());
      }

      console.log(`   ✅ ${totalChanges} conversions applied`);
    }

    if (newContent !== content) {
      writeFileSync(filePath, newContent);
      console.log(`✅ Updated ${filePath}\n`);
      return { converted: true, changes: totalChanges };
    }

    return { converted: false, changes: 0 };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error}`);
    return { converted: false, changes: 0 };
  }
}

function main() {
  console.log('🧹 Final Cleanup Conversions');
  console.log('============================\n');

  let totalFiles = 0;
  let totalChanges = 0;

  for (const filePath of REMAINING_FILES) {
    const result = convertFile(filePath);
    if (result.converted) {
      totalFiles++;
      totalChanges += result.changes;
    } else {
      console.log(`ℹ️  ${filePath} - No conversions needed\n`);
    }
  }

  console.log('📊 Final Cleanup Summary:');
  console.log(`   Files updated: ${totalFiles}`);
  console.log(`   Total conversions: ${totalChanges}`);

  if (totalFiles > 0) {
    console.log('\n🧪 Testing conversions...');
  }
}

main();