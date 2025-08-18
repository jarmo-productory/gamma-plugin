const { chromium } = require('playwright');

// Real test credentials
const TEST_EMAIL = 'koolitus@productory.eu';
const TEST_PASSWORD = 'Productory7819';

(async () => {
  console.log('🔍 E2E Authentication Flow Test\n');
  console.log('📧 Test email:', TEST_EMAIL);
  console.log('━'.repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor console for auth events
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Nav]') || text.includes('[Auth]') || text.includes('Bootstrap')) {
      console.log(`📝 Console: ${text}`);
    }
  });
  
  try {
    // Step 1: Load home page
    console.log('\n1️⃣ Loading home page...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Check initial state
    const signInButton = await page.locator('button:has-text("Sign In")').first();
    if (await signInButton.isVisible()) {
      console.log('✅ Sign In button found - user not logged in');
    }
    
    // Step 2: Navigate to sign in
    console.log('\n2️⃣ Navigating to sign in page...');
    await signInButton.click();
    
    // Wait longer and be more flexible with URL patterns
    try {
      await page.waitForURL('**/sign-in**', { timeout: 15000 });
      console.log('✅ Reached sign-in page');
    } catch (error) {
      console.log('⚠️  URL wait timeout, checking current URL...');
      const currentUrl = page.url();
      console.log('   Current URL:', currentUrl);
      if (currentUrl.includes('sign-in')) {
        console.log('✅ Actually on sign-in page');
      } else {
        throw new Error(`Not on sign-in page: ${currentUrl}`);
      }
    }
    
    // Step 3: Fill Clerk sign-in form
    console.log('\n3️⃣ Attempting to sign in...');
    
    // Wait for Clerk form to load
    await page.waitForTimeout(2000);
    
    // Try to find email input (Clerk uses various selectors)
    const emailInput = await page.locator('input[name="identifier"], input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
    
    if (await emailInput.isVisible()) {
      console.log('📝 Filling email...');
      await emailInput.fill(TEST_EMAIL);
      
      // Click continue/next button
      const continueButton = await page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Sign in")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        console.log('✅ Email submitted');
      }
      
      // Wait for password field
      await page.waitForTimeout(2000);
      
      // Fill password
      const passwordInput = await page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        console.log('📝 Filling password...');
        await passwordInput.fill(TEST_PASSWORD);
        
        // Submit form
        const submitButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in"), button[type="submit"]').last();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          console.log('✅ Credentials submitted');
        }
      }
    } else {
      console.log('⚠️  Could not find Clerk sign-in form');
      console.log('   You may need to create account first or form structure changed');
      
      // Try to click "Sign up" if available
      const signUpLink = await page.locator('a:has-text("Sign up"), button:has-text("Sign up")').first();
      if (await signUpLink.isVisible()) {
        console.log('📝 Sign up link found - you may need to create account first');
      }
    }
    
    // Step 4: Wait for redirect back to home
    console.log('\n4️⃣ Waiting for authentication...');
    
    // Wait for either success redirect or error
    try {
      await page.waitForURL('http://localhost:3000', { timeout: 10000 });
      console.log('✅ Redirected to home page');
      
      // Wait for auth state to settle
      await page.waitForTimeout(3000);
      
      // Step 5: Check navbar for email
      console.log('\n5️⃣ Checking navbar for user info...');
      
      const navbarEmail = await page.locator('nav span.font-medium').first();
      if (await navbarEmail.isVisible()) {
        const displayedEmail = await navbarEmail.textContent();
        console.log('✅ Email in navbar:', displayedEmail);
        
        // Check localStorage
        const localStorageData = await page.evaluate(() => {
          return {
            user_email: localStorage.getItem('user_email'),
            user_name: localStorage.getItem('user_name'),
            user_id: localStorage.getItem('user_id'),
            clerk_session_token: !!localStorage.getItem('clerk_session_token')
          };
        });
        
        console.log('\n💾 LocalStorage data:');
        console.log('  Email:', localStorageData.user_email);
        console.log('  Name:', localStorageData.user_name);
        console.log('  ID:', localStorageData.user_id);
        console.log('  Has Clerk token:', localStorageData.clerk_session_token);
        
        // Step 6: Test sign out
        console.log('\n6️⃣ Testing sign out...');
        const signOutButton = await page.locator('button:has-text("Sign Out")').first();
        
        if (await signOutButton.isVisible()) {
          await signOutButton.click();
          console.log('✅ Clicked Sign Out');
          
          await page.waitForTimeout(3000);
          
          // Check if signed out
          const signInButtonAfter = await page.locator('button:has-text("Sign In")').first();
          if (await signInButtonAfter.isVisible()) {
            console.log('✅ Successfully signed out - Sign In button visible again');
          }
        }
        
        console.log('\n🎉 E2E Test Complete!');
        
      } else {
        console.log('❌ Email not displayed in navbar after sign in');
      }
      
    } catch (error) {
      console.log('❌ Sign in failed or took too long');
      console.log('   Error:', error.message);
      
      // Check for Clerk errors
      const errorMessage = await page.locator('.cl-formFieldError, [data-clerk-error]').first();
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log('   Clerk error:', errorText);
      }
    }
    
  } catch (error) {
    console.log(`\n💥 Test failed: ${error.message}`);
  }
  
  // Keep browser open for 5 seconds to see final state
  await page.waitForTimeout(5000);
  await browser.close();
  
  console.log('\n✅ Test finished');
})();