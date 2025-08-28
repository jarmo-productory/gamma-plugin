import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });

  console.log('🔗 Starting Device Pairing Debug Test');

  try {
    // Step 1: Register a device
    console.log('\n📝 Step 1: Registering device...');
    const registerResponse = await page.request.post('http://localhost:3000/api/devices/register', {
      data: {}
    });
    
    if (!registerResponse.ok()) {
      throw new Error(`Device registration failed: ${registerResponse.status()}`);
    }
    
    const deviceInfo = await registerResponse.json();
    console.log(`✅ Device registered: ${deviceInfo.code}`);

    // Step 2: Navigate to homepage
    console.log('\n🏠 Step 2: Navigating to homepage...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1000);
    console.log('✅ Homepage loaded');

    // Step 3: Check authentication form
    console.log('\n🔐 Step 3: Checking authentication form...');
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    const signInButton = await page.locator('button[type="submit"]:has-text("Sign in")');

    const hasEmailInput = await emailInput.count() > 0;
    const hasPasswordInput = await passwordInput.count() > 0;
    const hasSignInButton = await signInButton.count() > 0;

    console.log(`Form elements: email=${hasEmailInput}, password=${hasPasswordInput}, signIn=${hasSignInButton}`);

    if (!hasEmailInput || !hasPasswordInput || !hasSignInButton) {
      console.log('❌ Authentication form not found - checking page content');
      const pageContent = await page.locator('body').textContent();
      console.log('Page text:', pageContent.substring(0, 200) + '...');
      await page.screenshot({ path: 'debug-homepage.png' });
      return;
    }

    // Step 4: Authenticate
    console.log('\n🔑 Step 4: Authenticating user...');
    await emailInput.fill('koolitus@productory.eu');
    await passwordInput.fill('Productory7819');
    
    // Monitor for auth requests
    let authRequestMade = false;
    page.on('request', request => {
      if (request.url().includes('/auth/') || request.url().includes('supabase')) {
        authRequestMade = true;
        console.log(`[AUTH REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    await signInButton.click();
    await page.waitForTimeout(3000); // Wait for auth to process

    console.log(`Auth request made: ${authRequestMade}`);
    console.log(`Current URL after auth: ${page.url()}`);

    // Step 5: Navigate to pairing URL 
    console.log('\n🔗 Step 5: Testing device pairing URL...');
    const pairingURL = `http://localhost:3000/?source=extension&code=${deviceInfo.code}`;
    console.log(`Navigating to: ${pairingURL}`);
    
    await page.goto(pairingURL);
    await page.waitForTimeout(2000);

    // Step 6: Look for pairing UI elements
    console.log('\n👀 Step 6: Analyzing pairing UI...');
    
    // Check for notification banner (unauthenticated state)
    const pairingNotification = await page.locator('[role="alert"]').count();
    const notificationText = pairingNotification > 0 ? 
      await page.locator('[role="alert"]').textContent() : 'None';
    
    // Check for dialog (authenticated state)
    const pairingDialog = await page.locator('[role="dialog"]').count();
    const dialogTitle = pairingDialog > 0 ?
      await page.locator('[role="dialog"] [data-title], [role="dialog"] h2, [role="dialog"] .dialog-title').textContent() : 'None';

    console.log(`Notification banners found: ${pairingNotification}`);
    console.log(`Notification text: ${notificationText}`);
    console.log(`Dialog modals found: ${pairingDialog}`);
    console.log(`Dialog title: ${dialogTitle}`);

    // Check for specific pairing text
    const pairingTitle = await page.locator('text=🔗 Device Pairing').count();
    const pairingCode = await page.locator(`text=${deviceInfo.code}`).count();
    const linkButton = await page.locator('button:has-text("Link Device")').count();

    console.log(`"🔗 Device Pairing" text found: ${pairingTitle}`);
    console.log(`Device code "${deviceInfo.code}" found: ${pairingCode}`);
    console.log(`"Link Device" button found: ${linkButton}`);

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'debug-pairing-state.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-pairing-state.png');

    // Step 7: Try to trigger pairing if dialog found
    if (pairingDialog > 0 && linkButton > 0) {
      console.log('\n🔗 Step 7: Attempting device linking...');
      
      const linkDeviceButton = page.locator('button:has-text("Link Device")');
      await linkDeviceButton.click();
      await page.waitForTimeout(2000);

      // Check for success/error messages
      const successMessage = await page.locator('text*="successfully linked"').count();
      const errorMessage = await page.locator('text*="Failed"').count();
      
      console.log(`Success message found: ${successMessage}`);
      console.log(`Error message found: ${errorMessage}`);
      
      await page.screenshot({ path: 'debug-pairing-result.png' });
    } else {
      console.log('\n⚠️  Step 7: Pairing dialog not found - cannot test linking');
    }

    console.log('\n✅ Debug test completed');

  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    await page.screenshot({ path: 'debug-error-state.png' });
  } finally {
    await browser.close();
  }
})();