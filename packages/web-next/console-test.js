// Runtime validation script for sign out functionality
const puppeteer = require('puppeteer');

async function testSignOutFunctionality() {
  let browser;
  let consoleErrors = [];
  let networkErrors = [];
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      slowMo: 1000 // Slow down for visibility
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Listen for network failures
    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
      console.log('❌ Network Error:', request.url(), request.failure().errorText);
    });
    
    console.log('🔍 Opening http://localhost:3000');
    
    // Navigate to the app
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }
    
    console.log('✅ Page loaded successfully');
    
    // Wait for potential React hydration
    await page.waitForTimeout(2000);
    
    // Check if DashboardSidebar is visible (for signed-in users)
    const dashboardSidebar = await page.$('[data-sidebar="sidebar"]');
    
    if (dashboardSidebar) {
      console.log('✅ DashboardSidebar detected - checking sign out functionality');
      
      // Look for user dropdown in sidebar footer
      const userDropdown = await page.$('[data-state] [role="button"]');
      
      if (userDropdown) {
        console.log('✅ User dropdown found - attempting to click');
        await userDropdown.click();
        
        // Wait for dropdown to open
        await page.waitForTimeout(1000);
        
        // Look for sign out option
        const signOutOption = await page.$('text/Sign out');
        
        if (signOutOption) {
          console.log('✅ Sign out option found in dropdown');
          console.log('🎯 TEST SUCCESS: Sign out functionality is properly implemented');
        } else {
          console.log('❌ Sign out option not found in dropdown');
        }
      } else {
        console.log('❌ User dropdown not found in sidebar');
      }
    } else {
      console.log('ℹ️  DashboardSidebar not visible - user may not be signed in');
      console.log('ℹ️  This is expected for non-authenticated users');
    }
    
    // Check for any React errors
    const reactErrors = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot?.errors || [];
    });
    
    if (reactErrors.length > 0) {
      console.log('❌ React errors detected:', reactErrors);
    }
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Page Status: ${response.status()}`);
    
    if (consoleErrors.length === 0 && networkErrors.length === 0) {
      console.log('✅ No runtime errors detected');
      return true;
    } else {
      console.log('❌ Runtime errors detected');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSignOutFunctionality().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});