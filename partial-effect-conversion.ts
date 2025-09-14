#!/usr/bin/env node

/**
 * Partial Effect module conversion for high-value, low-risk functions
 */

import { readFileSync, writeFileSync } from 'fs';

// Start with the highest-value, lowest-risk functions
const PHASE_1_CONVERSIONS = {
  values: ['log', 'succeed', 'fail'],  // Start with top 3: 182 usages
  types: [] as string[]
};

const TARGET_FILES = [
  // Core queue files with heavy usage
  'src/commands/SimpleQueueCommand.ts',
  'src/services/Queue/AdaptiveThrottlerLive.ts',
  'src/services/FileSystemLive.ts',
  'src/services/Queue/QueuePersistenceLive.ts',
  'src/services/Queue/InternalQueueLive.ts',
  'src/bin.ts'
];

interface ConversionResult {
  converted: boolean;
  changes: number;
  file: string;
  conversions: string[];
}

function convertFilePartialEffect(filePath: string): ConversionResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Only process files with namespace import
    if (!content.includes('import * as Effect from "effect/Effect"')) {
      return {
        converted: false,
        changes: 0,
        file: filePath,
        conversions: []
      };
    }

    let newContent = content;
    let totalChanges = 0;
    const conversions: string[] = [];

    // Analyze current usage first
    const usedFunctions = new Set<string>();
    for (const func of PHASE_1_CONVERSIONS.values) {
      const regex = new RegExp(`\\bEffect\\.${func}\\b(?!\\s*=)`, 'g');
      if (regex.test(content)) {
        usedFunctions.add(func);
      }
    }

    if (usedFunctions.size === 0) {
      return {
        converted: false,
        changes: 0,
        file: filePath,
        conversions: []
      };
    }

    console.log(`🔄 ${filePath.replace(process.cwd() + '/', '')}`);
    console.log(`   Converting: ${Array.from(usedFunctions).join(', ')}`);

    // Replace function usages
    for (const func of usedFunctions) {
      const funcRegex = new RegExp(`\\bEffect\\.${func}\\b(?!\\s*=)`, 'g');
      const matches = newContent.match(funcRegex);
      if (matches) {
        newContent = newContent.replace(funcRegex, func);
        totalChanges += matches.length;
        conversions.push(`${matches.length}x Effect.${func} → ${func}`);
        console.log(`     ✅ ${matches.length}x Effect.${func} → ${func}`);
      }
    }

    // Add named imports
    const existingNamedImports = newContent.match(/import { ([^}]+) } from "effect\/Effect"/);
    const newFunctions = Array.from(usedFunctions);
    
    if (existingNamedImports) {
      // Merge with existing named imports
      const existingFuncs = existingNamedImports[1].split(',').map(s => s.trim());
      const allFuncs = [...new Set([...existingFuncs, ...newFunctions])].sort();
      newContent = newContent.replace(
        /import { ([^}]+) } from "effect\/Effect"/,
        `import { ${allFuncs.join(', ')} } from "effect/Effect"`
      );
    } else {
      // Add new named import after namespace import
      const namespaceImportMatch = newContent.match(/import \* as Effect from "effect\/Effect"/);
      if (namespaceImportMatch) {
        const namedImport = `import { ${newFunctions.join(', ')} } from "effect/Effect"`;
        newContent = newContent.replace(
          namespaceImportMatch[0],
          `${namespaceImportMatch[0]}\n${namedImport}`
        );
      }
    }

    // Write changes
    if (totalChanges > 0) {
      writeFileSync(filePath, newContent);
      console.log(`   ✅ ${totalChanges} conversions applied\n`);
      
      return {
        converted: true,
        changes: totalChanges,
        file: filePath,
        conversions
      };
    }

    return {
      converted: false,
      changes: 0,
      file: filePath,
      conversions: []
    };

  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error}`);
    return {
      converted: false,
      changes: 0,
      file: filePath,
      conversions: []
    };
  }
}

function main() {
  console.log('🎯 Partial Effect Module Conversion (Phase 1)');
  console.log('=============================================\n');
  console.log('Converting high-value, low-risk functions: log, succeed, fail\n');

  const results: ConversionResult[] = [];
  let totalFiles = 0;
  let totalChanges = 0;

  for (const filePath of TARGET_FILES) {
    const result = convertFilePartialEffect(filePath);
    results.push(result);
    
    if (result.converted) {
      totalFiles++;
      totalChanges += result.changes;
    }
  }

  console.log('📊 Partial Conversion Summary:');
  console.log(`   Files updated: ${totalFiles}`);
  console.log(`   Total conversions: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n📈 Impact:');
    console.log(`   • Converted ~${Math.round((totalChanges / 666) * 100 * 100) / 100}% of total Effect usages`);
    console.log(`   • Maintained namespace import for remaining 483+ Effect functions`);
    console.log(`   • Zero-risk conversion of utility functions`);
  }

  console.log('\n💡 Next Steps:');
  console.log('   • Run tests to verify conversions');
  console.log('   • Consider Phase 2: sleep, sync, try (53 more usages)');
  console.log('   • Bundle analysis to measure tree-shaking improvement');
}

main();
