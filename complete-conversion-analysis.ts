#!/usr/bin/env node

/**
 * Complete namespace import analysis for final conversion
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface NamespaceImportAnalysis {
  module: string;
  files: string[];
  totalUsages: number;
  uniqueUsages: Set<string>;
  sampleUsages: string[];
  riskLevel: 'low' | 'medium' | 'high';
  conversionStrategy: string;
}

function scanForNamespaceImports(): NamespaceImportAnalysis[] {
  const results: NamespaceImportAnalysis[] = [];
  const moduleMap = new Map<string, {
    files: Set<string>;
    usages: Set<string>;
    samples: string[];
    count: number;
  }>();

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

      // Find all namespace imports
      const namespaceMatches = content.matchAll(/import \* as (\w+) from ['"](effect\/\w+)['"]/g);
      
      for (const match of namespaceMatches) {
        const [, alias, module] = match;
        
        if (!moduleMap.has(module)) {
          moduleMap.set(module, {
            files: new Set(),
            usages: new Set(),
            samples: [],
            count: 0
          });
        }

        const moduleData = moduleMap.get(module)!;
        moduleData.files.add(relativePath);

        // Find all usages of this alias
        const usageRegex = new RegExp(`\\b${alias}\\.(\\w+)`, 'g');
        let usageMatch;
        while ((usageMatch = usageRegex.exec(content)) !== null) {
          const usage = usageMatch[1];
          moduleData.usages.add(usage);
          moduleData.count++;
          
          // Store sample with context
          if (moduleData.samples.length < 5) {
            const lines = content.substring(0, usageMatch.index).split('\n');
            const lineNum = lines.length;
            const line = content.split('\n')[lineNum - 1];
            moduleData.samples.push(`${relativePath}:${lineNum} - ${line.trim()}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error}`);
    }
  }

  scanDirectory('./src');
  scanDirectory('./test');
  scanDirectory('./samples');

  // Convert to analysis results
  for (const [module, data] of moduleMap.entries()) {
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let strategy = 'Standard conversion';

    if (module === 'effect/Effect') {
      riskLevel = 'high';
      strategy = 'Selective conversion of safe functions';
    } else if (data.usages.size > 20) {
      riskLevel = 'medium';
      strategy = 'Batch conversion with validation';
    }

    results.push({
      module,
      files: Array.from(data.files),
      totalUsages: data.count,
      uniqueUsages: data.usages,
      sampleUsages: data.samples,
      riskLevel,
      conversionStrategy: strategy
    });
  }

  return results.sort((a, b) => b.totalUsages - a.totalUsages);
}

function main() {
  console.log('🔍 Complete Namespace Import Analysis');
  console.log('====================================\n');

  const analysis = scanForNamespaceImports();
  
  console.log(`📊 Found ${analysis.length} modules with namespace imports:\n`);

  let totalFiles = 0;
  let totalUsages = 0;

  for (const item of analysis) {
    const riskIcon = item.riskLevel === 'low' ? '🟢' : 
                    item.riskLevel === 'medium' ? '🟡' : '🔴';

    console.log(`${riskIcon} ${item.module}`);
    console.log(`   Files: ${item.files.length}`);
    console.log(`   Total usages: ${item.totalUsages}`);
    console.log(`   Unique functions: ${item.uniqueUsages.size}`);
    console.log(`   Risk: ${item.riskLevel.toUpperCase()}`);
    console.log(`   Strategy: ${item.conversionStrategy}`);
    
    if (item.uniqueUsages.size <= 15) {
      console.log(`   Functions: ${Array.from(item.uniqueUsages).sort().join(', ')}`);
    } else {
      const functions = Array.from(item.uniqueUsages).sort();
      console.log(`   Functions: ${functions.slice(0, 10).join(', ')}`);
      console.log(`              +${functions.length - 10} more...`);
    }

    if (item.sampleUsages.length > 0) {
      console.log(`   Sample usage: ${item.sampleUsages[0]}`);
    }

    totalFiles += item.files.length;
    totalUsages += item.totalUsages;
    console.log();
  }

  console.log('📈 Conversion Summary:');
  console.log(`   Total modules: ${analysis.length}`);
  console.log(`   Total file instances: ${totalFiles}`);
  console.log(`   Total usages: ${totalUsages}`);
  
  const lowRisk = analysis.filter(a => a.riskLevel === 'low');
  const mediumRisk = analysis.filter(a => a.riskLevel === 'medium');
  const highRisk = analysis.filter(a => a.riskLevel === 'high');

  console.log('\n🎯 Conversion Plan:');
  console.log(`   🟢 Low risk modules: ${lowRisk.length} (immediate conversion)`);
  console.log(`   🟡 Medium risk modules: ${mediumRisk.length} (careful conversion)`);
  console.log(`   🔴 High risk modules: ${highRisk.length} (selective conversion)`);

  // Recommended conversion order
  console.log('\n📋 Recommended Conversion Order:');
  
  const sortedByComplexity = [...analysis].sort((a, b) => {
    const riskOrder = { low: 3, medium: 2, high: 1 };
    if (a.riskLevel !== b.riskLevel) {
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    }
    return a.uniqueUsages.size - b.uniqueUsages.size;
  });

  sortedByComplexity.forEach((item, index) => {
    const effort = item.uniqueUsages.size < 5 ? 'Low' :
                  item.uniqueUsages.size < 15 ? 'Medium' : 'High';
    console.log(`   ${index + 1}. ${item.module} (${item.uniqueUsages.size} functions, ${effort} effort)`);
  });
}

main();
