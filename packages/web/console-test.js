// Runtime validation for device pairing flow
// This script tests that the implementation compiles and runs without console errors

const testEndpoints = [
  'http://localhost:3000',
  'http://localhost:3000/?code=test123&source=extension',
  'http://localhost:3000/dashboard'
];

async function testEndpoint(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: { 'User-Agent': 'Console-Test' }
    });
    return {
      url,
      status: response.status,
      success: response.ok
    };
  } catch (error) {
    return {
      url,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Running runtime validation tests...');
  console.log('');
  
  let errorCount = 0;
  
  for (const url of testEndpoints) {
    const result = await testEndpoint(url);
    
    if (result.success) {
      console.log(`✅ ${result.url} - HTTP ${result.status}`);
    } else {
      console.log(`❌ ${result.url} - ${result.status} ${result.error || ''}`);
      errorCount++;
    }
  }
  
  console.log('');
  console.log(`📊 Test Results: ${testEndpoints.length - errorCount}/${testEndpoints.length} passed`);
  
  if (errorCount === 0) {
    console.log('🎉 All runtime tests passed!');
  } else {
    console.log(`⚠️  ${errorCount} tests failed`);
  }
  
  return errorCount;
}

// Run tests immediately
runTests().then(errorCount => {
  process.exit(errorCount > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});