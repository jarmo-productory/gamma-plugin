#!/usr/bin/env node
// Simple build doctor for packages/web-next
import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webNextRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webNextRoot, '..', '..');

function log(title, value) {
  const pad = ' '.repeat(Math.max(1, 24 - title.length));
  console.log(`- ${title}:${pad}${value}`);
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

console.log('Gamma Timetable – Web Next Doctor');
console.log('-----------------------------------');

// Node and npm versions
const nodeVer = process.versions.node;
const major = Number(nodeVer.split('.')[0]);
log('Node version', nodeVer);
if (major < 18) {
  console.log('  ❌ Node 18+ recommended for Next 15. Please upgrade.');
}

// Lockfile hygiene
const rootLock = path.join(repoRoot, 'package-lock.json');
const subLock = path.join(webNextRoot, 'package-lock.json');
log('Root lockfile', exists(rootLock) ? 'present' : 'missing');
log('Sub lockfile', exists(subLock) ? 'present (remove this)' : 'absent ✅');
if (exists(subLock)) {
  console.log('  ⚠ Multiple lockfiles detected. Remove packages/web-next/package-lock.json');
}

// Env check
const envLocal = path.join(webNextRoot, '.env.local');
log('.env.local', exists(envLocal) ? 'present' : 'missing');
if (!exists(envLocal)) {
  console.log('  ⚠ Create packages/web-next/.env.local with dev Clerk/Supabase keys.');
}

// DISABLE_GOOGLE_FONTS guidance
const fontsDisabled = process.env.DISABLE_GOOGLE_FONTS === '1';
log('DISABLE_GOOGLE_FONTS', fontsDisabled ? '1 (offline-safe build)' : '0');
if (!fontsDisabled) {
  console.log('  ℹ Set DISABLE_GOOGLE_FONTS=1 for builds without network access.');
}

// Package.json sanity
const pkg = readJSON(path.join(webNextRoot, 'package.json')) || {};
const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
log('next version', deps.next || 'missing');
log('react version', deps.react || 'missing');
if (!deps.next) {
  console.log('  ❌ Next.js dependency missing. Run npm ci at repo root.');
}

// Port suggestion
console.log('\nChecks complete. Suggested next commands:');
console.log('  npm ci');
console.log('  npm run build:next:offline');
console.log('  cd packages/web-next && npm run start');
console.log('\nIf any step fails, copy the last 20 lines of the error here.');

