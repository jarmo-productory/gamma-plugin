#!/usr/bin/env node

// Import and run the TypeScript source using tsx
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const srcPath = join(__dirname, '..', 'src', 'index.ts');

const child = spawn(tsxPath, [srcPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', code => process.exit(code || 0));
