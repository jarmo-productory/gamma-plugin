// Test if the security migration was applied successfully (internal only)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireInternalAccess } from '@/utils/internal-guard';

export async function GET(request: NextRequest) {
  const guard = await requireInternalAccess(request);
  if (!guard.ok) return guard.res;
  const results: any = {
    timestamp: new Date().toISOString(),
    migrationTests: {
      rpcFunctions: { tested: false, results: [] },
      tokenHashing: { tested: false, results: [] },
      overallStatus: 'PENDING'
    }
  };

  try {
    console.log('🧪 Testing migration application (internal)...');
    const supabase = await createClient();
    
    // Test validate_and_touch_token function
    try {
      const { data: validateResult, error: validateError } = await supabase.rpc('validate_and_touch_token', {
        input_token: 'test_token_that_should_not_exist'
      });
      
      results.migrationTests.rpcFunctions.results.push({
        function: 'validate_and_touch_token',
        exists: !validateError?.message.includes('function') && !validateError?.message.includes('does not exist'),
        error: validateError?.message || null
      });
    } catch (error) {
      results.migrationTests.rpcFunctions.results.push({
        function: 'validate_and_touch_token',
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test store_hashed_token function
    try {
      const { data: storeResult, error: storeError } = await supabase.rpc('store_hashed_token', {
        input_token: 'test_token_123',
        p_device_id: 'test_device',
        p_user_id: 'test_user',
        p_user_email: 'test@example.com'
      });
      
      results.migrationTests.rpcFunctions.results.push({
        function: 'store_hashed_token',
        exists: !storeError?.message.includes('function') && !storeError?.message.includes('does not exist'),
        error: storeError?.message || null
      });
    } catch (error) {
      results.migrationTests.rpcFunctions.results.push({
        function: 'store_hashed_token',
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test get_user_devices function
    try {
      const { data: devicesResult, error: devicesError } = await supabase.rpc('get_user_devices', {
        p_user_id: 'test_user_123'
      });
      
      results.migrationTests.rpcFunctions.results.push({
        function: 'get_user_devices',
        exists: !devicesError?.message.includes('function') && !devicesError?.message.includes('does not exist'),
        error: devicesError?.message || null
      });
    } catch (error) {
      results.migrationTests.rpcFunctions.results.push({
        function: 'get_user_devices',
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    results.migrationTests.rpcFunctions.tested = true;

    // Test 2: Check if token_hash column exists
    console.log('🔍 Testing token_hash column...');
    try {
      const { data: columnTest, error: columnError } = await supabase
        .from('device_tokens')
        .select('token_hash')
        .limit(1);
        
      results.migrationTests.tokenHashing = {
        tested: true,
        results: [
          {
            test: 'token_hash_column_exists',
            passed: !columnError?.message.includes('column') && !columnError?.message.includes('does not exist'),
            error: columnError?.message || null
          }
        ]
      };
    } catch (error) {
      results.migrationTests.tokenHashing = {
        tested: true,
        results: [
          {
            test: 'token_hash_column_exists',
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        ]
      };
    }

    // Overall assessment
    const rpcFunctionCount = results.migrationTests.rpcFunctions.results.filter((r: any) => r.exists).length;
    const tokenHashingPassed = results.migrationTests.tokenHashing.results.every((r: any) => r.passed);
    
    results.migrationTests.overallStatus = (rpcFunctionCount >= 3 && tokenHashingPassed) ? 'SUCCESS' : 'PARTIAL';

    console.log(`🎯 Migration test ${results.migrationTests.overallStatus}`);

    return NextResponse.json({
      success: true,
      message: `Migration test ${results.migrationTests.overallStatus}`,
      ...results
    });

  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        partialResults: results
      },
      { status: 500 }
    );
  }
}
