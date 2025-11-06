#!/usr/bin/env node

/**
 * Extension Simulator CLI
 * Main entry point for the simulator
 */

import { Command } from 'commander';
import { initializeChromeMocks } from './mocks/chrome-apis.js';
import { registerCommand } from './commands/register.js';
import { pairCommand } from './commands/pair.js';
import { saveCommand } from './commands/save.js';
import { statusCommand } from './commands/status.js';
import { clearCommand } from './commands/clear.js';

// Initialize Chrome API mocks before any imports that might use them
initializeChromeMocks();

const program = new Command();

program
  .name('simulator')
  .description('CLI simulator for testing browser extension auth flows')
  .version('1.0.0');

// Register command
program
  .command('register')
  .description('Register a new device with the API')
  .option('-e, --env <environment>', 'Environment to use (local|production)', 'local')
  .action(async (options) => {
    try {
      await registerCommand({ env: options.env as 'local' | 'production' });
    } catch (error) {
      process.exit(1);
    }
  });

// Pair command
program
  .command('pair')
  .description('Exchange device code for access token')
  .option('-e, --env <environment>', 'Environment to use (local|production)', 'local')
  .action(async (options) => {
    try {
      await pairCommand({ env: options.env as 'local' | 'production' });
    } catch (error) {
      process.exit(1);
    }
  });

// Save command
program
  .command('save')
  .description('Test saving presentation data using authenticated API')
  .requiredOption('-u, --url <url>', 'Presentation URL')
  .option('-t, --title <title>', 'Presentation title')
  .option('-e, --env <environment>', 'Environment to use (local|production)', 'local')
  .action(async (options) => {
    try {
      await saveCommand({
        env: options.env as 'local' | 'production',
        url: options.url,
        title: options.title,
      });
    } catch (error) {
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current authentication and storage status')
  .option('-e, --env <environment>', 'Environment to use (local|production)', 'local')
  .action(async (options) => {
    try {
      await statusCommand({ env: options.env as 'local' | 'production' });
    } catch (error) {
      process.exit(1);
    }
  });

// Clear command
program
  .command('clear')
  .description('Clear all storage data')
  .action(async () => {
    try {
      await clearCommand();
    } catch (error) {
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
