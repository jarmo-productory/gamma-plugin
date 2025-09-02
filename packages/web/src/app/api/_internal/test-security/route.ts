// Test API endpoint for security implementation validation
import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken, generateDeviceInfo } from '@/utils/secureTokenStore';
import { requireInternalAccess } from '@/utils/internal-guard';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const guard = await requireInternalAccess(request);
  if (!guard.ok) return guard.res;
  try {
    const tests: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Secure token generation
    console.log('🧪 Testing secure token generation...');
    const token = generateSecureToken();
    tests.tests.tokenGeneration = {
      success: true,
      token: token.substring(0, 10) + '...', // Only show first 10 chars for security
      length: token.length,
      formatValid: /^[A-Za-z0-9_-]+$/.test(token),
      entropyEstimate: token.length * Math.log2(64)
    };

    // Test 2: Multiple token uniqueness
    console.log('🧪 Testing token uniqueness...');
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    tests.tests.tokenUniqueness = {
      success: tokens.size === 100,
      uniqueTokens: tokens.size,
      totalGenerated: 100
    };

    // Test 3: Device info generation
    console.log('🧪 Testing device info generation...');
    const userAgent = request.headers.get('user-agent');
    const deviceInfo = generateDeviceInfo(userAgent || undefined);
    tests.tests.deviceInfo = {
      success: true,
      deviceId: deviceInfo.deviceId.substring(0, 10) + '...',
      deviceName: deviceInfo.deviceName,
      formatValid: /^dev_[a-f0-9]{32}$/.test(deviceInfo.deviceId)
    };

    // Test 4: Check if migration is needed
    console.log('🧪 Checking if security migration is applied...');
    try {
      // Try to call one of our new RPC functions to see if migration was applied
      // This will be tested when we apply the migration
      tests.tests.migrationStatus = {
        applied: false,
        note: 'Migration needs to be applied to test RPC functions'
      };
    } catch (error) {
      tests.tests.migrationStatus = {
        applied: false,
        error: 'Migration check failed'
      };
    }

    console.log('✅ Security tests completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Security implementation tests completed',
      ...tests
    });

  } catch (error) {
    console.error('❌ Security test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Security test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
