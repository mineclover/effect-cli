#!/usr/bin/env node

/**
 * Partial Effect module analysis for high-value, low-risk conversions
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface EffectUsageAnalysis {
  function: string;
  files: string[];
  usageCount: number;
  risk: 'low' | 'medium' | 'high';
  conversionValue: 'high' | 'medium' | 'low';
  sampleUsages: string[];
}

// High-value, low-risk Effect functions for partial conversion
const SAFE_EFFECT_FUNCTIONS = {
  'succeed': { risk: 'low', value: 'high' },
  'fail': { risk: 'low', value: 'high' },
  'sync': { risk: 'low', value: 'medium' },
  'promise': { risk: 'medium', value: 'medium' },
  'try': { risk: 'low', value: 'medium' },
  'catchAll': { risk: 'medium', value: 'medium' },
  'map': { risk: 'medium', value: 'medium' },
  'tap': { risk: 'low', value: 'medium' },
  'log': { risk: 'low', value: 'high' },
  'logError': { risk: 'low', value: 'high' },
  'all': { risk: 'medium', value: 'medium' },
  'sleep': { risk: 'low', value: 'medium' }
} as const;

function analyzeEffectUsage(): EffectUsageAnalysis[] {
  const results: EffectUsageAnalysis[] = [];
  const usageMap = new Map<string, { files: Set<string>; usages: string[]; count: number }>();

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
      const relativePath = filePath.replace(process.cwd() + '/', '');

      // Only analyze files that have namespace import
      if (!content.includes('import * as Effect from "effect/Effect"')) {
        return;
      }

      // Look for Effect.functionName patterns
      for (const [funcName, config] of Object.entries(SAFE_EFFECT_FUNCTIONS)) {
        const regex = new RegExp(`\\bEffect\\.${funcName}\\b(?!\\s*=)`, 'g');
        let match;
        const fileUsages: string[] = [];

        while ((match = regex.exec(content)) !== null) {
          const lines = content.substring(0, match.index).split('\n');
          const lineNum = lines.length;
          const line = content.split('\n')[lineNum - 1];
          fileUsages.push(`${relativePath}:${lineNum} - ${line.trim()}`);
        }

        if (fileUsages.length > 0) {
          if (!usageMap.has(funcName)) {
            usageMap.set(funcName, { files: new Set(), usages: [], count: 0 });
          }

          const usage = usageMap.get(funcName)!;
          usage.files.add(relativePath);
          usage.usages.push(...fileUsages.slice(0, 3)); // Store up to 3 samples per file
          usage.count += fileUsages.length;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error}`);
    }
  }

  scanDirectory('./src');

  // Convert to analysis results
  for (const [funcName, usage] of usageMap.entries()) {
    const config = SAFE_EFFECT_FUNCTIONS[funcName as keyof typeof SAFE_EFFECT_FUNCTIONS];
    
    results.push({
      function: funcName,
      files: Array.from(usage.files),
      usageCount: usage.count,
      risk: config.risk,
      conversionValue: config.value,
      sampleUsages: [...new Set(usage.usages)].slice(0, 5)
    });
  }

  return results.sort((a, b) => {
    // Sort by value (high first), then by risk (low first), then by count (desc)
    const valueOrder = { high: 3, medium: 2, low: 1 };
    const riskOrder = { low: 3, medium: 2, high: 1 };
    
    if (a.conversionValue !== b.conversionValue) {
      return valueOrder[b.conversionValue] - valueOrder[a.conversionValue];
    }
    if (a.risk !== b.risk) {
      return riskOrder[b.risk] - riskOrder[a.risk];
    }
    return b.usageCount - a.usageCount;
  });
}

function main() {
  console.log('🔍 Partial Effect Module Analysis');
  console.log('=================================\n');

  const analysis = analyzeEffectUsage();

  console.log('📊 High-Value Effect Function Conversion Opportunities:\n');

  let totalHighValue = 0;
  let totalConversions = 0;

  for (const item of analysis) {
    const valueIcon = item.conversionValue === 'high' ? '🎯' : 
                     item.conversionValue === 'medium' ? '🟡' : '🔵';
    const riskIcon = item.risk === 'low' ? '🟢' : 
                    item.risk === 'medium' ? '🟠' : '🔴';

    console.log(`${valueIcon}${riskIcon} Effect.${item.function}`);
    console.log(`   Files: ${item.files.length}`);
    console.log(`   Usages: ${item.usageCount}`);
    console.log(`   Risk: ${item.risk.toUpperCase()}`);
    console.log(`   Value: ${item.conversionValue.toUpperCase()}`);

    if (item.sampleUsages.length > 0) {
      console.log(`   Sample usages:`);
      item.sampleUsages.forEach(usage => {
        console.log(`     ${usage}`);
      });
    }

    // Count high-value, low-risk opportunities
    if (item.conversionValue === 'high' && (item.risk === 'low' || item.risk === 'medium')) {
      totalHighValue += item.usageCount;
    }
    totalConversions += item.usageCount;

    console.log();
  }

  console.log('📈 Conversion Potential Summary:');
  console.log(`   🎯 High-value opportunities: ${totalHighValue} usages`);
  console.log(`   📊 Total safe conversions: ${totalConversions} usages`);
  console.log(`   💡 Potential conversion gain: ~${Math.round((totalHighValue / 666) * 100 * 100) / 100}% of Effect usages`);

  // Recommendations
  const highValueLowRisk = analysis.filter(item => 
    item.conversionValue === 'high' && item.risk === 'low' && item.usageCount >= 5
  );

  if (highValueLowRisk.length > 0) {
    console.log('\n🎯 Top Recommended Conversions (High Value + Low Risk):');
    highValueLowRisk.forEach(item => {
      const effort = item.usageCount < 10 ? 'Low effort' :
                    item.usageCount < 25 ? 'Medium effort' : 'High effort';
      console.log(`   • Effect.${item.function} (${item.files.length} files, ${item.usageCount} usages) - ${effort}`);
    });
  }

  console.log('\n💭 Analysis Results:');
  if (totalHighValue > 20) {
    console.log('   ✅ Substantial partial conversion opportunity identified');
  } else if (totalHighValue > 10) {
    console.log('   🟡 Moderate partial conversion opportunity identified');
  } else {
    console.log('   🔴 Limited partial conversion opportunity - consider deferring');
  }
}

main();
