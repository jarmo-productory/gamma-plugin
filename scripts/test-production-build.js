#!/usr/bin/env node

/**
 * Production Build Validation Script
 *
 * Validates that the production extension build in /packages/extension/dist/
 * is properly configured for production deployment.
 *
 * Sprint 33: Extension Production Wiring
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.join(__dirname, '..', 'packages', 'extension', 'dist');
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`${COLORS.BOLD}${COLORS.BLUE}${title}${COLORS.RESET}`);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, COLORS.GREEN);
}

function logError(message) {
  log(`❌ ${message}`, COLORS.RED);
}

function logWarning(message) {
  log(`⚠️  ${message}`, COLORS.YELLOW);
}

let errors = 0;
let warnings = 0;

// Test 1: Check dist directory exists
logSection('1. Build Output Validation');

if (!fs.existsSync(DIST_PATH)) {
  logError(`Distribution directory not found: ${DIST_PATH}`);
  logError('Run: npm run build:prod');
  process.exit(1);
}
logSuccess('Distribution directory exists');

// Test 2: Check required files exist
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'sidebar.js',
  'sidebar.html',
  'sidebar.css',
  'popup.js',
  'popup.html'
];

const requiredDirs = [
  'assets',
  'lib'
];

for (const file of requiredFiles) {
  const filePath = path.join(DIST_PATH, file);
  if (fs.existsSync(filePath)) {
    logSuccess(`Required file present: ${file}`);
  } else {
    logError(`Missing required file: ${file}`);
    errors++;
  }
}

for (const dir of requiredDirs) {
  const dirPath = path.join(DIST_PATH, dir);
  if (fs.existsSync(dirPath)) {
    logSuccess(`Required directory present: ${dir}/`);
  } else {
    logError(`Missing required directory: ${dir}/`);
    errors++;
  }
}

// Test 3: Validate manifest.json
logSection('2. Manifest Validation');

try {
  const manifestPath = path.join(DIST_PATH, 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  // Check version
  if (manifest.version) {
    logSuccess(`Extension version: ${manifest.version}`);
  } else {
    logError('No version in manifest');
    errors++;
  }

  // Check name
  if (manifest.name === 'Productory Powerups for Gamma') {
    logSuccess('Extension name correct');
  } else {
    logError(`Unexpected extension name: ${manifest.name}`);
    errors++;
  }

  // Check host permissions
  const hostPermissions = manifest.host_permissions || [];
  const expectedHosts = [
    'https://gamma.app/*',
    'https://productory-powerups.netlify.app/*'
  ];

  let hostCheck = true;
  for (const expectedHost of expectedHosts) {
    if (hostPermissions.includes(expectedHost)) {
      logSuccess(`Host permission present: ${expectedHost}`);
    } else {
      logError(`Missing host permission: ${expectedHost}`);
      errors++;
      hostCheck = false;
    }
  }

  // Check for localhost (should not be present in production)
  const hasLocalhost = hostPermissions.some(host => host.includes('localhost'));
  if (hasLocalhost) {
    logError('Production manifest contains localhost permissions');
    errors++;
  } else {
    logSuccess('No localhost permissions in production manifest');
  }

  // Check required permissions
  const permissions = manifest.permissions || [];
  const requiredPerms = ['activeTab', 'scripting', 'storage', 'downloads', 'sidePanel', 'tabs', 'cookies'];

  for (const perm of requiredPerms) {
    if (permissions.includes(perm)) {
      logSuccess(`Permission present: ${perm}`);
    } else {
      logError(`Missing permission: ${perm}`);
      errors++;
    }
  }

} catch (error) {
  logError(`Failed to read/parse manifest.json: ${error.message}`);
  errors++;
}

// Test 4: Check for localhost references in built files
logSection('3. Production URL Validation');

function searchFileForPatterns(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = content.match(regex);
      if (matches) {
        findings.push({ pattern, matches: matches.length });
      }
    }

    return findings;
  } catch (error) {
    return null;
  }
}

const jsFiles = fs.readdirSync(DIST_PATH)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(DIST_PATH, file));

// Check for problematic patterns
const localhostPatterns = ['localhost:3000', '"http://localhost'];
const productionPatterns = ['productory-powerups.netlify.app', 'https://productory-powerups'];

let hasProblematicLocalhost = false;
let hasProductionUrls = false;

for (const jsFile of jsFiles) {
  const fileName = path.basename(jsFile);

  // Check for localhost references (excluding fallbacks)
  const localhostFindings = searchFileForPatterns(jsFile, localhostPatterns);
  if (localhostFindings && localhostFindings.length > 0) {
    // This might be okay if they're in fallback code, but we should warn
    for (const finding of localhostFindings) {
      logWarning(`Found localhost references in ${fileName}: ${finding.pattern} (${finding.matches} occurrences)`);
      warnings++;
    }
    hasProblematicLocalhost = true;
  }

  // Check for production URLs
  const productionFindings = searchFileForPatterns(jsFile, productionPatterns);
  if (productionFindings && productionFindings.length > 0) {
    for (const finding of productionFindings) {
      logSuccess(`Production URLs found in ${fileName}: ${finding.pattern} (${finding.matches} occurrences)`);
    }
    hasProductionUrls = true;
  }
}

if (!hasProductionUrls) {
  logError('No production URLs found in built JavaScript files');
  errors++;
}

// Test 5: Check bundle sizes
logSection('4. Bundle Size Check');

const maxSizes = {
  'sidebar.js': 50 * 1024, // 50KB
  'background.js': 20 * 1024, // 20KB
  'content.js': 20 * 1024, // 20KB
};

for (const [fileName, maxSize] of Object.entries(maxSizes)) {
  const filePath = path.join(DIST_PATH, fileName);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    const maxSizeKB = Math.round(maxSize / 1024);

    if (stats.size <= maxSize) {
      logSuccess(`${fileName}: ${sizeKB}KB (within ${maxSizeKB}KB limit)`);
    } else {
      logWarning(`${fileName}: ${sizeKB}KB (exceeds ${maxSizeKB}KB limit)`);
      warnings++;
    }
  }
}

// Test 6: Asset validation
logSection('5. Asset Validation');

const assetDir = path.join(DIST_PATH, 'assets');
if (fs.existsSync(assetDir)) {
  const assets = fs.readdirSync(assetDir);
  const requiredAssets = ['icon-16.png', 'icon-48.png', 'icon-128.png'];

  for (const asset of requiredAssets) {
    if (assets.includes(asset)) {
      logSuccess(`Asset present: ${asset}`);
    } else {
      logError(`Missing asset: ${asset}`);
      errors++;
    }
  }
} else {
  logError('Assets directory not found');
  errors++;
}

// Final Summary
logSection('Final Summary');

if (errors === 0 && warnings === 0) {
  logSuccess('🎉 All tests passed! Extension is ready for production.');
} else if (errors === 0) {
  log(`⚠️  ${warnings} warnings found, but no critical errors.`, COLORS.YELLOW);
  log('Extension should work in production, but review warnings.', COLORS.YELLOW);
} else {
  logError(`❌ ${errors} errors and ${warnings} warnings found.`);
  logError('Extension is NOT ready for production.');
}

console.log('\n' + '='.repeat(60));
log(`${COLORS.BOLD}Next Steps:${COLORS.RESET}`);

if (errors === 0) {
  log('✅ Load extension in Chrome from: packages/extension/dist/');
  log('✅ Test on gamma.app with production authentication');
  log('✅ Create distribution package: npm run package:prod');
} else {
  log('❌ Fix errors above before proceeding');
  log('❌ Re-run: npm run build:prod');
  log('❌ Re-test: node scripts/test-production-build.js');
}

console.log('='.repeat(60));

process.exit(errors > 0 ? 1 : 0);