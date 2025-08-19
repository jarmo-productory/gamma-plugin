const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Simple Console Error Test\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  
  // Monitor console for errors
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (text.includes('[Nav]') || text.includes('[Auth]') || text.includes('Bootstrap')) {
      console.log(`📝 Console: ${text}`);
    }
  });
  
  // Monitor network failures
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`🚫 HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  try {
    console.log('Loading localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(5000); // Let page fully load and auth state settle
    
    console.log(`\n📊 Test Results:`);
    console.log(`   Console errors found: ${errors.length}`);
    
    if (errors.length === 0) {
      console.log('✅ No console errors - page is clean!');
    } else {
      console.log('❌ Console errors detected:');
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
  
  console.log('\n✅ Test finished');
})();