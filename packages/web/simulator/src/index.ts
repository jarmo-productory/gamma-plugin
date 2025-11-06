#!/usr/bin/env node

import { DeviceAuthSimulator } from './auth/simulator';
import { generateMockPresentation, savePresentationWithRetry } from './presentation/save';
import { SimulatorConfig } from './types';

const DEFAULT_CONFIG: SimulatorConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  storageDir: process.env.STORAGE_DIR || './.simulator-storage',
};

async function printStatus(auth: DeviceAuthSimulator) {
  const deviceInfo = await auth.getStoredDeviceInfo();
  const token = await auth.getStoredToken();

  console.log('\n📊 Simulator Status:');
  console.log('='.repeat(50));

  if (deviceInfo) {
    console.log('Device ID:', deviceInfo.deviceId);
    console.log('Device Code:', deviceInfo.code);
    console.log('Code Expires:', new Date(deviceInfo.expiresAt).toLocaleString());
    console.log('Code Valid:', new Date(deviceInfo.expiresAt) > new Date() ? '✅ Yes' : '❌ Expired');
  } else {
    console.log('Device: ❌ Not registered');
  }

  console.log('');

  if (token) {
    const expiryDate = new Date(token.expiresAt);
    const isValid = expiryDate > new Date();
    console.log('Token:', isValid ? '✅ Valid' : '❌ Expired');
    console.log('Token Expires:', expiryDate.toLocaleString());
    console.log('Token Preview:', token.token.substring(0, 20) + '...');
  } else {
    console.log('Token: ❌ Not authenticated');
  }

  console.log('='.repeat(50));
}

async function registerCommand(auth: DeviceAuthSimulator) {
  console.log('\n🚀 Device Registration Flow');
  console.log('='.repeat(50));

  const deviceInfo = await auth.registerDevice();
  const pairingUrl = auth.buildSignInUrl(deviceInfo.code);

  console.log('\n✅ Device registered successfully!');
  console.log('\n📋 Pairing Instructions:');
  console.log('1. Open this URL in your browser:');
  console.log(`   ${pairingUrl}`);
  console.log('\n2. Sign in with your Gamma account');
  console.log('\n3. Run: simulator pair');
  console.log('\nDevice Code:', deviceInfo.code);
  console.log('Expires:', new Date(deviceInfo.expiresAt).toLocaleString());
}

async function pairCommand(auth: DeviceAuthSimulator, code?: string) {
  const deviceInfo = await auth.getStoredDeviceInfo();

  if (!deviceInfo) {
    console.error('\n❌ No device registered. Run: simulator register');
    process.exit(1);
  }

  const deviceCode = code || deviceInfo.code;
  console.log('\n🔗 Device Pairing Flow');
  console.log('='.repeat(50));
  console.log('Device ID:', deviceInfo.deviceId);
  console.log('Code:', deviceCode);

  const token = await auth.pollExchangeUntilLinked(
    deviceInfo.deviceId,
    deviceCode,
    { intervalMs: 2000, maxWaitMs: 300000 } // 5 minutes
  );

  if (token) {
    console.log('\n🎉 Device paired successfully!');
    console.log('Token expires:', new Date(token.expiresAt).toLocaleString());
  } else {
    console.log('\n❌ Pairing failed or timed out');
    console.log('Please try again or run: simulator register');
    process.exit(1);
  }
}

async function saveCommand(auth: DeviceAuthSimulator, url?: string) {
  console.log('\n💾 Presentation Save Flow');
  console.log('='.repeat(50));

  // Check authentication
  const token = await auth.getValidTokenOrRefresh();
  if (!token) {
    console.error('\n❌ Not authenticated. Run: simulator pair');
    process.exit(1);
  }

  // Generate mock presentation
  const { url: presentationUrl, data: timetableData } = generateMockPresentation(url);

  // Save with retry logic
  try {
    await savePresentationWithRetry(auth, presentationUrl, timetableData, 3);
    console.log('\n🎉 Presentation saved successfully!');
  } catch (error) {
    console.error('\n❌ Failed to save presentation:', error);
    process.exit(1);
  }
}

async function clearCommand(auth: DeviceAuthSimulator) {
  console.log('\n🗑️  Clearing all data...');
  await auth.clearAll();
  console.log('✅ All data cleared!');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const auth = new DeviceAuthSimulator(DEFAULT_CONFIG);

  console.log('\n🎮 Gamma Extension Simulator');
  console.log('API Base URL:', DEFAULT_CONFIG.apiBaseUrl);
  console.log('Storage Dir:', DEFAULT_CONFIG.storageDir);

  switch (command) {
    case 'register':
      await registerCommand(auth);
      break;

    case 'pair':
      await pairCommand(auth, args[1]);
      break;

    case 'save':
      const urlFlag = args.indexOf('--url');
      const url = urlFlag >= 0 ? args[urlFlag + 1] : undefined;
      await saveCommand(auth, url);
      break;

    case 'status':
      await printStatus(auth);
      break;

    case 'clear':
      await clearCommand(auth);
      break;

    default:
      console.log('\n📚 Available Commands:');
      console.log('='.repeat(50));
      console.log('  simulator register              # Register device, get pairing URL');
      console.log('  simulator pair [CODE]           # Exchange code for token');
      console.log('  simulator save [--url <URL>]    # Save mock presentation');
      console.log('  simulator status                # Show auth status, token expiry');
      console.log('  simulator clear                 # Clear all data');
      console.log('='.repeat(50));
      console.log('\nExample workflow:');
      console.log('  1. simulator register');
      console.log('  2. Open the pairing URL in browser');
      console.log('  3. simulator pair');
      console.log('  4. simulator save');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
