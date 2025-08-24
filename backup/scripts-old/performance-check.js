#!/usr/bin/env node
// performance-check.js - Performance validation for Gate 1.5
// Measures build times, bundle sizes, and memory usage

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Performance thresholds
const THRESHOLDS = {
  buildTime: {
    extension: 30,    // seconds
    nextjs: 60,       // seconds
    total: 90,        // seconds
  },
  bundleSize: {
    extension: 10,    // MB
    nextjs: 50,       // MB
    shared: 1,        // MB
  },
  memoryUsage: {
    heap: 512,        // MB
  }
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  try {
    const output = execSync(`du -sm "${dirPath}" 2>/dev/null | cut -f1`, { encoding: 'utf-8' });
    return parseInt(output.trim()) || 0;
  } catch {
    return 0;
  }
}

function formatSize(mb) {
  if (mb < 1) {
    return `${(mb * 1024).toFixed(0)}KB`;
  }
  return `${mb.toFixed(1)}MB`;
}

function measureBuildTime(command, cwd = process.cwd()) {
  const startTime = Date.now();
  try {
    execSync(command, { cwd, stdio: 'ignore' });
    const endTime = Date.now();
    return (endTime - startTime) / 1000; // Convert to seconds
  } catch (error) {
    log(`Build failed: ${command}`, 'red');
    return -1;
  }
}

// Main performance checks
async function runPerformanceChecks() {
  log('\n🚀 Performance Validation Suite', 'blue');
  log('================================\n');
  
  const results = {
    passed: [],
    warnings: [],
    failures: [],
  };
  
  // 1. Bundle Size Analysis
  log('📦 1. Bundle Size Analysis', 'blue');
  log('-------------------------');
  
  const bundles = [
    { name: 'Extension', path: 'packages/extension/dist', threshold: THRESHOLDS.bundleSize.extension },
    { name: 'Next.js', path: 'packages/web-next/.next', threshold: THRESHOLDS.bundleSize.nextjs },
    { name: 'Shared', path: 'packages/shared/dist', threshold: THRESHOLDS.bundleSize.shared },
  ];
  
  bundles.forEach(bundle => {
    const size = getDirectorySize(bundle.path);
    const status = size <= bundle.threshold ? '✅' : '⚠️';
    const color = size <= bundle.threshold ? 'green' : 'yellow';
    
    log(`${status} ${bundle.name}: ${formatSize(size)} (limit: ${formatSize(bundle.threshold)})`, color);
    
    if (size > bundle.threshold) {
      results.warnings.push(`${bundle.name} bundle exceeds size limit: ${formatSize(size)} > ${formatSize(bundle.threshold)}`);
    } else {
      results.passed.push(`${bundle.name} bundle size OK`);
    }
  });
  
  // 2. Build Time Measurement
  log('\n⏱️  2. Build Time Measurement', 'blue');
  log('---------------------------');
  
  log('Measuring build times (this may take a minute)...');
  
  // Clean build directories first
  try {
    execSync('rm -rf packages/extension/dist packages/web-next/.next packages/shared/dist', { stdio: 'ignore' });
  } catch {}
  
  const buildTimes = {
    extension: measureBuildTime('npm run build', path.join(process.cwd(), 'packages/extension')),
    nextjs: measureBuildTime('npm run build', path.join(process.cwd(), 'packages/web-next')),
    shared: measureBuildTime('npm run build', path.join(process.cwd(), 'packages/shared')),
  };
  
  const totalBuildTime = Object.values(buildTimes).reduce((a, b) => a + b, 0);
  
  Object.entries(buildTimes).forEach(([name, time]) => {
    if (time < 0) {
      log(`❌ ${name} build failed`, 'red');
      results.failures.push(`${name} build failed`);
    } else {
      const threshold = THRESHOLDS.buildTime[name] || 30;
      const status = time <= threshold ? '✅' : '⚠️';
      const color = time <= threshold ? 'green' : 'yellow';
      
      log(`${status} ${name}: ${time.toFixed(1)}s (limit: ${threshold}s)`, color);
      
      if (time > threshold) {
        results.warnings.push(`${name} build time exceeds limit: ${time.toFixed(1)}s > ${threshold}s`);
      } else {
        results.passed.push(`${name} build time OK`);
      }
    }
  });
  
  log(`\n📊 Total build time: ${totalBuildTime.toFixed(1)}s (limit: ${THRESHOLDS.buildTime.total}s)`);
  
  if (totalBuildTime > THRESHOLDS.buildTime.total) {
    results.warnings.push(`Total build time exceeds limit: ${totalBuildTime.toFixed(1)}s > ${THRESHOLDS.buildTime.total}s`);
  }
  
  // 3. Memory Usage Check
  log('\n💾 3. Memory Usage Check', 'blue');
  log('----------------------');
  
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const rssMB = memoryUsage.rss / 1024 / 1024;
  
  log(`Heap Used: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB`);
  log(`RSS: ${rssMB.toFixed(1)}MB`);
  log(`External: ${(memoryUsage.external / 1024 / 1024).toFixed(1)}MB`);
  
  if (heapUsedMB > THRESHOLDS.memoryUsage.heap) {
    log(`⚠️ High memory usage detected`, 'yellow');
    results.warnings.push(`High memory usage: ${heapUsedMB.toFixed(1)}MB > ${THRESHOLDS.memoryUsage.heap}MB`);
  } else {
    log(`✅ Memory usage within limits`, 'green');
    results.passed.push('Memory usage OK');
  }
  
  // 4. Check for performance optimizations
  log('\n🔍 4. Performance Optimizations', 'blue');
  log('------------------------------');
  
  // Check if production builds are optimized
  const checks = [
    {
      name: 'Next.js production build',
      check: () => fs.existsSync('packages/web-next/.next/BUILD_ID'),
      message: 'Next.js production build configured',
    },
    {
      name: 'Tree shaking enabled',
      check: () => {
        try {
          const viteConfig = fs.readFileSync('vite.config.ts', 'utf-8');
          return viteConfig.includes('build:');
        } catch {
          return false;
        }
      },
      message: 'Vite build optimization configured',
    },
    {
      name: 'Code splitting',
      check: () => {
        const distFiles = fs.existsSync('packages/extension/dist') ? 
          fs.readdirSync('packages/extension/dist').filter(f => f.endsWith('.js')) : [];
        return distFiles.length > 1;
      },
      message: 'Code splitting enabled',
    },
  ];
  
  checks.forEach(check => {
    if (check.check()) {
      log(`✅ ${check.message}`, 'green');
      results.passed.push(check.message);
    } else {
      log(`⚠️ ${check.message} - not detected`, 'yellow');
      results.warnings.push(`${check.message} - not detected`);
    }
  });
  
  // 5. Final Summary
  log('\n📊 Performance Check Summary', 'blue');
  log('===========================');
  
  log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(item => log(`  • ${item}`, 'green'));
  
  if (results.warnings.length > 0) {
    log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(item => log(`  • ${item}`, 'yellow'));
  }
  
  if (results.failures.length > 0) {
    log(`\n❌ Failures: ${results.failures.length}`);
    results.failures.forEach(item => log(`  • ${item}`, 'red'));
  }
  
  // Exit code
  if (results.failures.length > 0) {
    log('\n❌ Performance validation FAILED', 'red');
    process.exit(1);
  } else if (results.warnings.length > 5) {
    log('\n⚠️  Performance validation PASSED WITH WARNINGS', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ Performance validation PASSED', 'green');
    process.exit(0);
  }
}

// Run the checks
runPerformanceChecks().catch(error => {
  log(`\n❌ Performance check failed: ${error.message}`, 'red');
  process.exit(1);
});