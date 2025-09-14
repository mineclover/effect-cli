#!/usr/bin/env node

/**
 * Individual Schedule module conversions - careful, targeted approach
 */

import { readFileSync, writeFileSync } from 'fs';

const SCHEDULE_TARGET_FILES = [
  'src/services/Queue/index.ts'  // Only the file with actual Schedule usage
];

function analyzeScheduleUsage(content: string): {
  values: Set<string>;
  types: Set<string>;
  usageLines: string[];
} {
  const values = new Set<string>();
  const types = new Set<string>();
  const usageLines: string[] = [];

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for functionName usage
    const valueMatch = line.match(/Schedule\.(\w+)(?!\s*<[^>]*>)/g);
    if (valueMatch) {
      valueMatch.forEach(match => {
        const funcName = match.split('.')[1];
        values.add(funcName);
        usageLines.push(`Line ${i + 1}: ${line.trim()}`);
      });
    }

    // Look for Schedule type usage (Schedule<...> or Schedule as type)
    if (line.includes('Schedule<') || (line.includes('Schedule') && (line.includes(':') || line.includes('type ')))) {
      const typeMatch = line.match(/Schedule\.(\w+)(?=\s*<)/);
      if (typeMatch) {
        const typeName = typeMatch[1];
        types.add(typeName);
        usageLines.push(`Line ${i + 1} (type): ${line.trim()}`);
      }
    }
  }

  return { values, types, usageLines };
}

function convertScheduleFile(filePath: string): { converted: boolean; changes: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let newContent = content;

    // Analyze usage first
    const { values, types, usageLines } = analyzeScheduleUsage(content);

    console.log(`🔍 Analyzing ${filePath}:`);
    console.log(`   Function usages: ${[...values].join(', ')}`);
    console.log(`   Type usages: ${[...types].join(', ')}`);
    console.log('   Usage context:');
    usageLines.forEach(line => console.log(`     ${line}`));

    if (values.size === 0 && types.size === 0) {
      console.log('   ❌ No Schedule usages found');
      return { converted: false, changes: 0 };
    }

    // Available Schedule exports (conservative list)
    const SAFE_SCHEDULE_EXPORTS = {
      values: ['recurWhile', 'addDelay', 'repeat', 'retry', 'exponential', 'fixed', 'spaced'],
      types: ['Schedule']
    };

    const validValues = [...values].filter(v => SAFE_SCHEDULE_EXPORTS.values.includes(v));
    const validTypes = [...types].filter(t => SAFE_SCHEDULE_EXPORTS.types.includes(t));

    console.log(`   ✅ Convertible values: ${validValues.join(', ')}`);
    console.log(`   ✅ Convertible types: ${validTypes.join(', ')}`);

    if (validValues.length === 0 && validTypes.length === 0) {
      console.log('   ⚠️  No safe conversions available');
      return { converted: false, changes: 0 };
    }

    // Create new imports
    let newImports = '';
    if (validValues.length > 0) {
      newImports += `import { ${validValues.join(', ')} } from "effect/Schedule"\n`;
    }
    if (validTypes.length > 0) {
      newImports += `import type { ${validTypes.join(', ')} } from "effect/Schedule"\n`;
    }

    let totalChanges = 0;

    // Replace usages
    for (const value of validValues) {
      const valueRegex = new RegExp(`\\bSchedule\\.${value}\\b`, 'g');
      const matches = newContent.match(valueRegex);
      if (matches) {
        newContent = newContent.replace(valueRegex, value);
        totalChanges += matches.length;
        console.log(`     ✅ Replaced ${matches.length}x Schedule.${value} → ${value}`);
      }
    }

    for (const type of validTypes) {
      const typeRegex = new RegExp(`\\bSchedule\\.${type}\\b`, 'g');
      const matches = newContent.match(typeRegex);
      if (matches) {
        newContent = newContent.replace(typeRegex, type);
        totalChanges += matches.length;
        console.log(`     ✅ Replaced ${matches.length}x Schedule.${type} → ${type}`);
      }
    }

    // Check for remaining usages
    const remainingRegex = /Schedule\.\w+/g;
    const remainingUsages = newContent.match(remainingRegex);

    if (remainingUsages && remainingUsages.length > 0) {
      console.log(`   ⚠️  ${remainingUsages.length} unconverted usages remain: ${remainingUsages.join(', ')}`);

      // Keep namespace import for remaining usages
      const namespaceImport = 'import { functionName, Schedule } from "effect/Schedule"';
      const firstImportMatch = newContent.match(/^import .*$/m);
      if (firstImportMatch) {
        newContent = newContent.replace(firstImportMatch[0], `${namespaceImport}\n${firstImportMatch[0]}`);
      }

      // Add named imports after namespace import
      if (newImports) {
        newContent = newContent.replace(namespaceImport, `${namespaceImport}\n${newImports.trim()}`);
      }
    } else {
      // Replace namespace import completely
      const namespaceRegex = /import \* as Schedule from ["']effect\/Schedule["']/;
      newContent = newContent.replace(namespaceRegex, newImports.trim());
    }

    if (totalChanges > 0) {
      writeFileSync(filePath, newContent);
      console.log(`   ✅ Updated ${filePath} with ${totalChanges} conversions\n`);
      return { converted: true, changes: totalChanges };
    }

    return { converted: false, changes: 0 };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error}`);
    return { converted: false, changes: 0 };
  }
}

function main() {
  console.log('🎯 Individual Schedule Module Conversion');
  console.log('======================================\n');

  let totalFiles = 0;
  let totalChanges = 0;

  for (const filePath of SCHEDULE_TARGET_FILES) {
    const result = convertScheduleFile(filePath);
    if (result.converted) {
      totalFiles++;
      totalChanges += result.changes;
    }
  }

  console.log('📊 Individual Conversion Summary:');
  console.log(`   Files updated: ${totalFiles}`);
  console.log(`   Total conversions: ${totalChanges}`);

  if (totalFiles > 0) {
    console.log('\n🧪 Testing conversions...');
  } else {
    console.log('\n💭 Consider analyzing more complex patterns or defer these modules');
  }
}

main();