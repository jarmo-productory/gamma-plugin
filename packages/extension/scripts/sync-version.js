/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../../../package.json');
const manifestPath = path.resolve(__dirname, '../manifest.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const newVersion = packageJson.version;
  manifestJson.version = newVersion;

  // Pretty print with 2 spaces and a trailing newline
  fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2) + '\n');

  console.log(`Successfully updated manifest.json to version ${newVersion}`);
} catch (error) {
  console.error('Failed to sync version:', error);
  process.exit(1);
}
