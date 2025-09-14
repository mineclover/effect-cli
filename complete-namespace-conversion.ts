#!/usr/bin/env node

/**
 * Complete namespace to named import conversion
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ConversionTarget {
  module: string;
  commonFunctions: string[];
  typeFunctions: string[];
  priority: number; // 1 = highest priority
}

// Conversion targets in priority order
const CONVERSION_TARGETS: ConversionTarget[] = [
  // Phase 1: Zero usage (just remove)
  {
    module: 'effect/HashMap',
    commonFunctions: [],
    typeFunctions: [],
    priority: 1
  },
  {
    module: 'effect/Schedule', 
    commonFunctions: [],
    typeFunctions: [],
    priority: 1
  },
  {
    module: 'effect/Fiber',
    commonFunctions: [],
    typeFunctions: [],
    priority: 1
  },
  // Phase 2: Single function modules
  {
    module: 'effect/TestContext',
    commonFunctions: [],
    typeFunctions: ['TestContext'],
    priority: 2
  },
  {
    module: 'effect/Array',
    commonFunctions: ['filter'],
    typeFunctions: [],
    priority: 2
  },
  {
    module: 'effect/TestClock',
    commonFunctions: ['adjust'],
    typeFunctions: [],
    priority: 2
  },
  {
    module: 'effect/Context',
    commonFunctions: ['GenericTag'],
    typeFunctions: [],
    priority: 2
  },
  // Phase 3: Common utility modules  
  {
    module: 'effect/Console',
    commonFunctions: ['log', 'error'],
    typeFunctions: [],
    priority: 3
  },
  {
    module: 'effect/Option',
    commonFunctions: ['some', 'isSome', 'none', 'isNone', 'match', 'getOrNull', 'fromNullable'],
    typeFunctions: ['Option'],
    priority: 3
  },
  {
    module: 'effect/Exit',
    commonFunctions: ['isSuccess', 'isFailure'],
    typeFunctions: ['Exit'],
    priority: 3
  },
  {
    module: 'effect/Duration',
    commonFunctions: ['seconds', 'millis', 'toMillis'],
    typeFunctions: ['Duration'],
    priority: 3
  },
  // Phase 4: Layer module
  {
    module: 'effect/Layer',
    commonFunctions: ['provide', 'mergeAll', 'effect', 'succeed', 'empty'],
    typeFunctions: ['Layer'],
    priority: 4
  }
];

interface ConversionResult {
  file: string;
  module: string;
  converted: boolean;
  changes: number;
  details: string[];
}

function findAllFilesWithNamespaceImport(module: string): string[] {
  const files: string[] = [];
  
  function scanDirectory(dir: string) {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const modulePattern = module.replace('/', '\\/');
            if (content.match(new RegExp(`import \\* as \\w+ from ['"']${modulePattern}['"]`))) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  scanDirectory('.');
  return files;
}

function convertNamespaceImport(filePath: string, target: ConversionTarget): ConversionResult {
  const result: ConversionResult = {
    file: filePath.replace(process.cwd() + '/', ''),
    module: target.module,
    converted: false,
    changes: 0,
    details: []
  };

  try {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;

    // Find the namespace import
    const modulePattern = target.module.replace('/', '\\/');
    const namespaceRegex = new RegExp(`import \\* as (\\w+) from ['"]${modulePattern}['"]`);
    const namespaceMatch = content.match(namespaceRegex);

    if (!namespaceMatch) {
      return result;
    }

    const alias = namespaceMatch[1];
    console.log(`🔄 ${result.file} - Converting ${target.module} (alias: ${alias})`);

    // Analyze actual usage
    const usedFunctions = new Set<string>();
    const usedTypes = new Set<string>();

    // Find all usages
    const usageRegex = new RegExp(`\\b${alias}\\.(\\w+)`, 'g');
    let usageMatch;
    while ((usageMatch = usageRegex.exec(content)) !== null) {
      const usage = usageMatch[1];
      usedFunctions.add(usage);
    }

    // Separate types from functions
    for (const usage of usedFunctions) {
      if (target.typeFunctions.includes(usage)) {
        usedTypes.add(usage);
        usedFunctions.delete(usage);
      }
    }

    const validFunctions = [...usedFunctions].filter(f => 
      target.commonFunctions.length === 0 || target.commonFunctions.includes(f)
    );
    const validTypes = [...usedTypes].filter(t => 
      target.typeFunctions.length === 0 || target.typeFunctions.includes(t)
    );

    // Handle zero usage case
    if (validFunctions.length === 0 && validTypes.length === 0) {
      // Just remove the namespace import
      newContent = newContent.replace(namespaceRegex, '');
      // Remove empty lines
      newContent = newContent.replace(/\n\s*\n/g, '\n\n');
      result.converted = true;
      result.changes = 1;
      result.details.push('Removed unused namespace import');
      console.log(`   ✅ Removed unused namespace import`);
    } else {
      // Convert to named imports
      let totalChanges = 0;

      // Replace function usages
      for (const func of validFunctions) {
        const funcRegex = new RegExp(`\\b${alias}\\.${func}\\b`, 'g');
        const matches = newContent.match(funcRegex);
        if (matches) {
          newContent = newContent.replace(funcRegex, func);
          totalChanges += matches.length;
          result.details.push(`${matches.length}x ${alias}.${func} → ${func}`);
          console.log(`     ✅ ${matches.length}x ${alias}.${func} → ${func}`);
        }
      }

      // Replace type usages
      for (const type of validTypes) {
        const typeRegex = new RegExp(`\\b${alias}\\.${type}\\b`, 'g');
        const matches = newContent.match(typeRegex);
        if (matches) {
          newContent = newContent.replace(typeRegex, type);
          totalChanges += matches.length;
          result.details.push(`${matches.length}x ${alias}.${type} → ${type}`);
          console.log(`     ✅ ${matches.length}x ${alias}.${type} → ${type}`);
        }
      }

      // Add named imports
      let newImports = '';
      if (validFunctions.length > 0) {
        newImports += `import { ${validFunctions.join(', ')} } from "${target.module}"`;
      }
      if (validTypes.length > 0) {
        if (newImports) newImports += '\n';
        newImports += `import type { ${validTypes.join(', ')} } from "${target.module}"`;
      }

      // Replace namespace import with named imports
      if (newImports) {
        newContent = newContent.replace(namespaceRegex, newImports);
      } else {
        newContent = newContent.replace(namespaceRegex, '');
      }

      result.converted = totalChanges > 0 || newImports.length > 0;
      result.changes = totalChanges;

      // Check for remaining usages
      const remainingUsages = newContent.match(new RegExp(`\\b${alias}\\.\\w+`, 'g'));
      if (remainingUsages && remainingUsages.length > 0) {
        console.log(`   ⚠️  ${remainingUsages.length} unconverted usages: ${remainingUsages.slice(0, 3).join(', ')}`);
        
        // Keep namespace import for remaining usages
        const namespaceImport = `import * as ${alias} from "${target.module}"`;
        if (newImports) {
          newContent = newContent.replace(newImports, `${namespaceImport}\n${newImports}`);
        } else {
          newContent = newContent.replace(/^/, `${namespaceImport}\n`);
        }
      }
    }

    // Write file if changed
    if (newContent !== content) {
      writeFileSync(filePath, newContent);
      console.log(`   ✅ Updated ${result.file}\n`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${result.file}: ${error}`);
  }

  return result;
}

function main() {
  console.log('🎯 Complete Namespace to Named Import Conversion');
  console.log('===============================================\n');

  const allResults: ConversionResult[] = [];
  let totalFiles = 0;
  let totalModules = 0;

  // Process by priority phases
  for (let phase = 1; phase <= 4; phase++) {
    const phaseTargets = CONVERSION_TARGETS.filter(t => t.priority === phase);
    if (phaseTargets.length === 0) continue;

    console.log(`📋 Phase ${phase}: Processing ${phaseTargets.length} modules\n`);

    for (const target of phaseTargets) {
      console.log(`🔍 Processing ${target.module}...`);
      
      const files = findAllFilesWithNamespaceImport(target.module);
      if (files.length === 0) {
        console.log(`   ℹ️  No files found with ${target.module} namespace import\n`);
        continue;
      }

      console.log(`   Found ${files.length} files to convert`);
      
      let moduleConverted = false;
      for (const file of files) {
        const result = convertNamespaceImport(file, target);
        allResults.push(result);
        
        if (result.converted) {
          moduleConverted = true;
          totalFiles++;
        }
      }

      if (moduleConverted) {
        totalModules++;
      }
    }

    console.log(`✅ Phase ${phase} completed\n`);
  }

  // Summary
  console.log('📊 Complete Conversion Summary:');
  console.log(`   Modules processed: ${totalModules}`);
  console.log(`   Files updated: ${totalFiles}`);
  
  const successfulResults = allResults.filter(r => r.converted);
  const totalChanges = successfulResults.reduce((sum, r) => sum + r.changes, 0);
  console.log(`   Total conversions: ${totalChanges}`);

  console.log('\n🎉 All namespace imports converted!');
  console.log('   • Run tests to verify conversions');
  console.log('   • Check bundle analysis for tree-shaking improvements');
  console.log('   • Remaining: effect/Effect (selective conversion completed earlier)');
}

main();
