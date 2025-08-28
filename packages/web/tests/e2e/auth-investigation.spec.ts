import { test, expect } from '@playwright/test';

// Test configuration
const testUser = {
  email: 'koolitus@productory.eu',
  password: 'Testing123!@#'
};

const baseUrl = process.env.CI 
  ? 'https://productory-powerups.netlify.app' 
  : 'http://localhost:3000';

test.describe('Authentication Flow Investigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and local storage before each test
    await page.context().clearCookies();
    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
    
    // Set up console log monitoring
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DevicePairing]') || 
          text.includes('Auth') || 
          text.includes('Supabase') ||
          text.includes('Error')) {
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
        // Log additional details for errors
        if (msg.type() === 'error') {
          msg.args().forEach(async (arg, i) => {
            try {
              const value = await arg.jsonValue();
              console.log(`  Arg[${i}]:`, value);
            } catch (e) {
              // Ignore serialization errors
            }
          });
        }
      }
    });

    // Monitor network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('/auth/') || url.includes('/api/')) {
        console.log(`[Network Request] ${request.method()} ${url}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('/auth/') || url.includes('/api/')) {
        console.log(`[Network Response] ${response.status()} ${url}`);
        if (response.status() >= 400) {
          response.text().then(text => {
            console.log(`  Error response body:`, text.substring(0, 500));
          }).catch(() => {});
        }
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      console.log('[Page Error]', error.message);
    });
  });

  test('1. Homepage loads and auth form is present', async ({ page }) => {
    console.log('\n=== TEST 1: Homepage and Auth Form Validation ===');
    
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check for auth form presence
    const authForm = await page.locator('[data-testid="auth-form"], form').first();
    const isFormVisible = await authForm.isVisible().catch(() => false);
    console.log(`Auth form visible: ${isFormVisible}`);
    
    // Check for sign-in tab
    const signInTab = await page.locator('button:has-text("Sign in")').first();
    const isSignInVisible = await signInTab.isVisible().catch(() => false);
    console.log(`Sign-in tab visible: ${isSignInVisible}`);
    
    // Check for email input
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const isEmailVisible = await emailInput.isVisible().catch(() => false);
    console.log(`Email input visible: ${isEmailVisible}`);
    
    // Check for password input
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    const isPasswordVisible = await passwordInput.isVisible().catch(() => false);
    console.log(`Password input visible: ${isPasswordVisible}`);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'homepage-state.png', fullPage: true });
    console.log('Screenshot saved: homepage-state.png');
    
    expect(isFormVisible || (isSignInVisible && isEmailVisible)).toBeTruthy();
  });

  test('2. Sign-in form submission with real credentials', async ({ page }) => {
    console.log('\n=== TEST 2: Real Credentials Sign-In Test ===');
    
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Click sign-in tab if needed
    const signInTab = await page.locator('button:has-text("Sign in")').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
      console.log('Clicked Sign in tab');
    }
    
    // Fill in credentials
    console.log(`Filling email: ${testUser.email}`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(testUser.email);
    
    console.log('Filling password...');
    await page.locator('input[type="password"], input[name="password"]').first().fill(testUser.password);
    
    // Take screenshot before submission
    await page.screenshot({ path: 'before-signin.png' });
    console.log('Screenshot saved: before-signin.png');
    
    // Submit form
    console.log('Submitting sign-in form...');
    const submitButton = await page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in")').first();
    
    // Set up response listener for auth endpoints
    const authResponsePromise = page.waitForResponse(response => 
      response.url().includes('auth') || response.url().includes('token'),
      { timeout: 30000 }
    ).catch(() => null);
    
    await submitButton.click();
    console.log('Form submitted');
    
    // Wait for auth response
    const authResponse = await authResponsePromise;
    if (authResponse) {
      console.log(`Auth response: ${authResponse.status()} ${authResponse.url()}`);
      const responseBody = await authResponse.text().catch(() => '');
      if (responseBody) {
        console.log('Response body:', responseBody.substring(0, 500));
      }
    }
    
    // Wait for navigation or error message
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL after sign-in: ${currentUrl}`);
    
    // Check for error messages
    const errorMessage = await page.locator('text=/error|invalid|failed/i').first();
    if (await errorMessage.isVisible().catch(() => false)) {
      const errorText = await errorMessage.textContent();
      console.log(`Error message found: ${errorText}`);
    }
    
    // Check authentication state
    const authState = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie
      };
    });
    console.log('Auth state after sign-in:', authState);
    
    // Check for Supabase session
    const supabaseSession = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKey = keys.find(k => k.includes('auth-token') || k.includes('supabase'));
      if (authKey) {
        return localStorage.getItem(authKey);
      }
      return null;
    });
    console.log('Supabase session found:', !!supabaseSession);
    
    // Take screenshot after sign-in attempt
    await page.screenshot({ path: 'after-signin.png', fullPage: true });
    console.log('Screenshot saved: after-signin.png');
    
    // Check if we're authenticated
    const isDashboard = currentUrl.includes('dashboard') || currentUrl === baseUrl + '/';
    const hasSignOutButton = await page.locator('button:has-text("Sign out")').isVisible().catch(() => false);
    
    console.log(`Authentication successful: ${isDashboard || hasSignOutButton}`);
  });

  test('3. DevicePairing component lifecycle monitoring', async ({ page }) => {
    console.log('\n=== TEST 3: DevicePairing Component Monitoring ===');
    
    // First sign in
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    // Sign in first
    const signInTab = await page.locator('button:has-text("Sign in")').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
    }
    
    await page.locator('input[type="email"], input[name="email"]').first().fill(testUser.email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(testUser.password);
    
    const submitButton = await page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    // Wait for authentication
    await page.waitForTimeout(5000);
    
    // Now test with pairing parameters
    console.log('Testing DevicePairing with parameters...');
    await page.goto(`${baseUrl}/?code=TEST123&source=extension`);
    
    // Wait for component to mount
    await page.waitForTimeout(3000);
    
    // Check console logs for DevicePairing messages
    const consoleLogs = await page.evaluate(() => {
      // This would normally capture console logs, but we're already logging them
      return 'Check console output above for [DevicePairing] messages';
    });
    
    // Check if pairing dialog is visible
    const pairingDialog = await page.locator('[role="dialog"], .pairing-dialog, [data-testid="pairing-dialog"]').first();
    const isDialogVisible = await pairingDialog.isVisible().catch(() => false);
    console.log(`Pairing dialog visible: ${isDialogVisible}`);
    
    // Check if notification banner is visible
    const notification = await page.locator('.pairing-notification, [data-testid="pairing-notification"]').first();
    const isNotificationVisible = await notification.isVisible().catch(() => false);
    console.log(`Pairing notification visible: ${isNotificationVisible}`);
    
    // Take screenshot
    await page.screenshot({ path: 'device-pairing-state.png', fullPage: true });
    console.log('Screenshot saved: device-pairing-state.png');
  });

  test('4. Auth callback route handling', async ({ page }) => {
    console.log('\n=== TEST 4: Auth Callback Route Testing ===');
    
    // Test auth callback route directly
    const callbackUrl = `${baseUrl}/auth/callback`;
    console.log(`Testing callback URL: ${callbackUrl}`);
    
    const response = await page.goto(callbackUrl, { waitUntil: 'networkidle' });
    console.log(`Callback response status: ${response?.status()}`);
    
    // Check where we get redirected
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log(`Final URL after callback: ${finalUrl}`);
    
    // Check page content
    const pageContent = await page.content();
    if (pageContent.includes('error') || pageContent.includes('Error')) {
      console.log('Error found in callback page');
    }
  });

  test('5. Session persistence check', async ({ page }) => {
    console.log('\n=== TEST 5: Session Persistence Testing ===');
    
    // Sign in
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    const signInTab = await page.locator('button:has-text("Sign in")').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
    }
    
    await page.locator('input[type="email"], input[name="email"]').first().fill(testUser.email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(testUser.password);
    
    const submitButton = await page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    await page.waitForTimeout(5000);
    
    // Get session data
    const sessionData = await page.evaluate(() => {
      const data: any = {};
      // Check all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase'))) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    console.log('Session data keys:', Object.keys(sessionData));
    
    // Reload page
    console.log('Reloading page to test persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if still authenticated
    const currentUrl = page.url();
    const hasSignOut = await page.locator('button:has-text("Sign out")').isVisible().catch(() => false);
    const hasAuthForm = await page.locator('button:has-text("Sign in")').isVisible().catch(() => false);
    
    console.log(`After reload - URL: ${currentUrl}`);
    console.log(`After reload - Has sign out: ${hasSignOut}`);
    console.log(`After reload - Has auth form: ${hasAuthForm}`);
    
    // Final screenshot
    await page.screenshot({ path: 'session-persistence.png', fullPage: true });
    console.log('Screenshot saved: session-persistence.png');
  });

  test('6. Network authentication flow analysis', async ({ page }) => {
    console.log('\n=== TEST 6: Network Authentication Flow Analysis ===');
    
    const networkLogs: any[] = [];
    
    // Set up detailed network monitoring
    page.on('request', request => {
      const url = request.url();
      if (url.includes('auth') || url.includes('supabase')) {
        networkLogs.push({
          type: 'request',
          method: request.method(),
          url: url,
          headers: request.headers(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('auth') || url.includes('supabase')) {
        const log: any = {
          type: 'response',
          status: response.status(),
          url: url,
          headers: response.headers(),
          timestamp: new Date().toISOString()
        };
        
        if (response.status() >= 400) {
          try {
            log.body = await response.text();
          } catch {}
        }
        
        networkLogs.push(log);
      }
    });
    
    // Perform sign-in
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    const signInTab = await page.locator('button:has-text("Sign in")').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
    }
    
    await page.locator('input[type="email"], input[name="email"]').first().fill(testUser.email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(testUser.password);
    
    console.log('Submitting credentials and monitoring network...');
    const submitButton = await page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    // Wait for network activity
    await page.waitForTimeout(5000);
    
    // Analyze network logs
    console.log('\n=== Network Activity Summary ===');
    console.log(`Total auth-related requests: ${networkLogs.length}`);
    
    networkLogs.forEach(log => {
      if (log.type === 'request') {
        console.log(`\n[REQUEST] ${log.method} ${log.url}`);
        if (log.headers['authorization']) {
          console.log('  Has Authorization header');
        }
      } else {
        console.log(`\n[RESPONSE] ${log.status} ${log.url}`);
        if (log.body) {
          console.log(`  Error body: ${log.body.substring(0, 200)}`);
        }
      }
    });
    
    // Check final authentication state
    const authCheck = await page.evaluate(async () => {
      // Try to call Supabase directly
      try {
        const supabaseUrl = 'https://dknqqcnnbcqujeffbmmb.supabase.co';
        const supabaseKey = localStorage.getItem('sb-dknqqcnnbcqujeffbmmb-auth-token');
        
        if (supabaseKey) {
          const parsed = JSON.parse(supabaseKey);
          return {
            hasToken: true,
            tokenType: parsed.token_type || 'unknown',
            expiresAt: parsed.expires_at || 'unknown',
            user: parsed.user ? 'present' : 'missing'
          };
        }
        return { hasToken: false };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\n=== Authentication State Check ===');
    console.log(authCheck);
  });
});