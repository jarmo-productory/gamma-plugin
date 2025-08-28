// Quick manual test for account creation functionality
// Run with: node test-account-creation.js

import { chromium } from 'playwright';

(async () => {
  console.log('🧪 Testing Account Creation Flow...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  try {
    // Navigate to localhost
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to localhost:3000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click on "Create account" tab
    console.log('🔄 Looking for Create account tab...');
    const createAccountTab = page.locator('button:has-text("Create account")');
    await createAccountTab.waitFor({ timeout: 5000 });
    await createAccountTab.click();
    console.log('✅ Clicked Create account tab');
    
    await page.waitForTimeout(1000);
    
    // Test validation with invalid data first
    console.log('📝 Testing validation with invalid data...');
    await page.fill('input[name="firstName"]', 'A'); // Too short
    await page.fill('input[name="lastName"]', '123'); // Invalid characters  
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'different');
    
    // Check the terms checkbox
    await page.check('input[type="checkbox"]#terms');
    
    console.log('📝 Form filled out');
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('/api/')) {
        requests.push(`${request.method()} ${request.url()}`);
        console.log(`🌐 Request: ${request.method()} ${request.url()}`);
      }
    });
    
    // Monitor responses 
    page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('/api/')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Click the Create account button
    console.log('🚀 Submitting form...');
    await page.click('button[type="submit"]:has-text("Create account")');
    
    // Wait for response and check for success/error messages
    await page.waitForTimeout(5000);
    
    // Look for success or error messages
    const messageElement = page.locator('div:has-text("Account created successfully")');
    const errorElement = page.locator('div:has-text("error"), div[class*="error"]');
    
    const hasSuccess = await messageElement.count() > 0;
    const hasError = await errorElement.count() > 0;
    
    if (hasSuccess) {
      const successText = await messageElement.textContent();
      console.log('✅ SUCCESS:', successText);
    } else if (hasError) {
      const errorText = await errorElement.textContent();
      console.log('❌ ERROR:', errorText);
    } else {
      console.log('⚠️ No clear success/error message found');
      
      // Check console logs for errors
      const logs = await page.evaluate(() => {
        return window.console._logs || [];
      });
      
      console.log('📋 Page state after submission:');
      console.log('Current URL:', page.url());
      
      // Take a screenshot
      await page.screenshot({ path: 'account-creation-test.png', fullPage: true });
      console.log('📸 Screenshot saved as account-creation-test.png');
    }
    
    console.log('📊 Network requests made:', requests);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-account-creation.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
})();