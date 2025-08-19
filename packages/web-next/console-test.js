const { chromium } = require('playwright');

async function checkConsoleErrors() {
  console.log('🔍 Starting browser console error check...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
      console.log('❌ CONSOLE ERROR:', text);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log('⚠️  CONSOLE WARNING:', text);
    } else if (type === 'log' && text.includes('[Auth]')) {
      console.log('ℹ️  AUTH LOG:', text);
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('💥 PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📍 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('⏳ Waiting for page to settle...');
    await page.waitForTimeout(3000);
    
    // Check if page loaded successfully
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if main content is visible
    const mainContent = await page.isVisible('main');
    console.log('🎯 Main content visible:', mainContent);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    
    if (errors.length === 0) {
      console.log('✅ No console errors found!');
    } else {
      console.log('🚨 Console errors detected:');
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.log('💥 Failed to load page:', error.message);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors().catch(console.error);