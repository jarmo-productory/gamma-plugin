/**
 * Test Script
 * Validates simulator infrastructure
 */

import { initializeChromeMocks, getStorageData } from './mocks/chrome-apis.js';
import { FileStorageManager } from './storage/file-storage.js';
import { getEnvironmentConfig } from './config/environment.js';
import { logger } from './utils/logger.js';

async function testInfrastructure(): Promise<void> {
  logger.section('Infrastructure Test');

  try {
    // Test 1: Chrome mocks
    logger.info('Testing Chrome API mocks...');
    initializeChromeMocks();

    // Test chrome.storage
    await chrome.storage.local.set({ test_key: 'test_value' });
    const result = await chrome.storage.local.get('test_key');
    if (result.test_key === 'test_value') {
      logger.success('✓ chrome.storage.local works');
    } else {
      throw new Error('chrome.storage.local failed');
    }

    // Test crypto.subtle
    const data = new TextEncoder().encode('test');
    const hash = await crypto.subtle.digest('SHA-256', data);
    if (hash.byteLength === 32) {
      logger.success('✓ crypto.subtle works');
    } else {
      throw new Error('crypto.subtle failed');
    }

    // Test 2: File storage
    logger.info('\nTesting file storage...');
    const storage = new FileStorageManager();
    await storage.save('test_file', { data: 'test' });
    const loaded = await storage.load('test_file');
    if (loaded?.data === 'test') {
      logger.success('✓ File storage works');
    } else {
      throw new Error('File storage failed');
    }

    // Test 3: Environment config
    logger.info('\nTesting environment config...');
    const localConfig = getEnvironmentConfig('local');
    const prodConfig = getEnvironmentConfig('production');

    if (localConfig.apiBaseUrl.includes('localhost')) {
      logger.success('✓ Local config loaded');
    }
    if (prodConfig.apiBaseUrl.includes('netlify')) {
      logger.success('✓ Production config loaded');
    }

    // Test 4: Logger
    logger.info('\nTesting logger...');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    logger.success('✓ Logger works');

    // Display storage contents
    logger.info('\nStorage contents:');
    const allData = await getStorageData();
    logger.kv('Keys', Object.keys(allData).join(', '));

    logger.section('All Tests Passed! ✓');
    logger.info('\nNext steps:');
    console.log('1. Install dependencies: cd packages/simulator && npm install');
    console.log('2. Build: npm run build');
    console.log('3. Run CLI: npm run simulator -- --help');

    // Cleanup test data
    await chrome.storage.local.remove('test_key');
    await storage.remove('test_file');
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run tests
testInfrastructure().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
