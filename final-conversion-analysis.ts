#!/usr/bin/env node

/**
 * Final conversion analysis - identifying remaining opportunities
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ConversionOpportunity {
  module: string;
  files: string[];
  totalUsages: number;
  conversionPotential: 'high' | 'medium' | 'low';
  reason: string;
}

const MODULE_ANALYSIS: Record<string, {
  commonExports: string[];
  typeExports: string[];
  conversionComplexity: 'low' | 'medium' | 'high';
}> = {
  'effect/Array': {
    commonExports: ['map', 'filter', 'reduce', 'forEach', 'sort', 'find', 'findFirst', 'length', 'isEmpty', 'push', 'concat', 'reverse', 'slice', 'head', 'tail', 'last', 'get', 'contains', 'join'],
    typeExports: ['NonEmptyArray'],
    conversionComplexity: 'low'
  },
  'effect/Effect': {
    commonExports: ['succeed', 'fail', 'gen', 'map', 'flatMap', 'catchAll', 'tap', 'provide', 'pipe', 'try', 'sync', 'promise', 'all', 'forEach', 'timeout', 'retry', 'log', 'ignore', 'orElse'],
    typeExports: ['Effect'],
    conversionComplexity: 'high' // Too many usages, complex patterns
  },
  'effect/Context': {
    commonExports: ['make', 'get'],
    typeExports: ['Context', 'Tag'],
    conversionComplexity: 'medium'
  },
  'effect/Layer': {
    commonExports: ['effect', 'succeed', 'provide', 'merge', 'mergeAll'],
    typeExports: ['Layer'],
    conversionComplexity: 'medium'
  },
  'effect/Fiber': {
    commonExports: ['fork', 'join', 'interrupt', 'await'],
    typeExports: ['Fiber', 'RuntimeFiber'],
    conversionComplexity: 'low'
  },
  'effect/Ref': {
    commonExports: ['make', 'get', 'set', 'update', 'modify'],
    typeExports: ['Ref'],
    conversionComplexity: 'low'
  }
};

function analyzeFiles(): ConversionOpportunity[] {
  const opportunities: ConversionOpportunity[] = [];
  const moduleUsage = new Map<string, { files: Set<string>; count: number }>();

  function scanDirectory(dir: string) {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && !item.includes('node_modules')) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        analyzeFile(fullPath);
      }
    }
  }

  function analyzeFile(filePath: string) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const namespaceMatch = line.match(/import \* as (\w+) from ['"]effect\/(\w+)['"]/);
        if (namespaceMatch) {
          const [, alias, module] = namespaceMatch;
          const moduleKey = `effect/${module}`;

          if (!moduleUsage.has(moduleKey)) {
            moduleUsage.set(moduleKey, { files: new Set(), count: 0 });
          }

          const usage = moduleUsage.get(moduleKey)!;
          usage.files.add(filePath.replace(process.cwd() + '/', ''));

          // Count actual usages in the file
          const usageRegex = new RegExp(`\\b${alias}\\.\\w+`, 'g');
          const matches = content.match(usageRegex);
          usage.count += matches ? matches.length : 0;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error}`);
    }
  }

  scanDirectory('./src');

  // Convert to opportunities
  for (const [module, usage] of moduleUsage.entries()) {
    const analysis = MODULE_ANALYSIS[module];
    if (!analysis) continue;

    let conversionPotential: 'high' | 'medium' | 'low' = 'low';
    let reason = 'Unknown module';

    if (analysis.conversionComplexity === 'low' && usage.count < 20) {
      conversionPotential = 'high';
      reason = 'Simple module with few usages';
    } else if (analysis.conversionComplexity === 'medium' && usage.count < 50) {
      conversionPotential = 'medium';
      reason = 'Medium complexity, manageable usage count';
    } else if (usage.count >= 100) {
      conversionPotential = 'low';
      reason = 'Too many usages, high refactoring cost';
    } else {
      conversionPotential = 'low';
      reason = 'Complex patterns or heavy usage';
    }

    opportunities.push({
      module,
      files: Array.from(usage.files),
      totalUsages: usage.count,
      conversionPotential,
      reason
    });
  }

  return opportunities.sort((a, b) => {
    const potentialOrder = { high: 3, medium: 2, low: 1 };
    return potentialOrder[b.conversionPotential] - potentialOrder[a.conversionPotential];
  });
}

function main() {
  console.log('🔍 Final Conversion Analysis');
  console.log('============================\n');

  const opportunities = analyzeFiles();

  console.log('📊 Remaining Conversion Opportunities:\n');

  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const opp of opportunities) {
    const icon = opp.conversionPotential === 'high' ? '🟢' :
                 opp.conversionPotential === 'medium' ? '🟡' : '🔴';

    console.log(`${icon} ${opp.module}`);
    console.log(`   Files: ${opp.files.length}`);
    console.log(`   Usages: ${opp.totalUsages}`);
    console.log(`   Potential: ${opp.conversionPotential.toUpperCase()}`);
    console.log(`   Reason: ${opp.reason}`);

    if (opp.conversionPotential === 'high' && opp.files.length <= 5) {
      console.log(`   📝 Files to convert: ${opp.files.slice(0, 3).join(', ')}${opp.files.length > 3 ? '...' : ''}`);
    }
    console.log();

    if (opp.conversionPotential === 'high') highCount++;
    else if (opp.conversionPotential === 'medium') mediumCount++;
    else lowCount++;
  }

  console.log('📈 Conversion Summary:');
  console.log(`   🟢 High potential: ${highCount} modules`);
  console.log(`   🟡 Medium potential: ${mediumCount} modules`);
  console.log(`   🔴 Low potential: ${lowCount} modules`);

  const totalRemaining = opportunities.reduce((sum, opp) => sum + opp.totalUsages, 0);
  console.log(`   📊 Total remaining usages: ${totalRemaining}`);

  const highPotentialModules = opportunities.filter(o => o.conversionPotential === 'high');
  if (highPotentialModules.length > 0) {
    console.log('\n🎯 Recommended next conversions:');
    highPotentialModules.forEach(opp => {
      console.log(`   • ${opp.module} (${opp.files.length} files, ${opp.totalUsages} usages)`);
    });
  }
}

main();