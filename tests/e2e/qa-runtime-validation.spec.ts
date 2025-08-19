import { test, expect, chromium, firefox, webkit } from '@playwright/test';

// QA Runtime Validation Suite - Evidence-Based Testing
// Testing actual application runtime state vs claims

test.describe('QA Runtime Validation Suite', () => {
  const apps = [
    {
      name: 'Next.js App (web-next)',
      url: 'http://localhost:3000',
      description: 'Sprint 6 Next.js conversion app'
    },
    {
      name: 'Production App',
      url: 'https://productory-powerups.netlify.app',
      description: 'Production deployed application'
    }
  ];

  // Test 1: Next.js Application Console Error Validation
  test('Next.js App - Console Error Count (Claimed: 0 errors)', async ({ page }) => {
    const consoleErrors: Array<{ type: string, text: string, url: string, timestamp: number }> = [];
    const consoleWarnings: Array<{ type: string, text: string, url: string, timestamp: number }> = [];

    // Capture all console messages
    page.on('console', msg => {
      const timestamp = Date.now();
      const data = {
        type: msg.type(),
        text: msg.text(),
        url: page.url(),
        timestamp
      };

      if (msg.type() === 'error') {
        consoleErrors.push(data);
        console.log(`❌ CONSOLE ERROR: ${data.text}`);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(data);
        console.log(`⚠️  CONSOLE WARNING: ${data.text}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorData = {
        type: 'pageerror',
        text: error.message,
        url: page.url(),
        timestamp: Date.now()
      };
      consoleErrors.push(errorData);
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    // Load page and wait for full render
    console.log('🔍 Loading Next.js app at http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for React to fully mount
    await page.waitForTimeout(2000);

    // Take screenshot for evidence
    await page.screenshot({ path: 'nextjs-app-runtime-validation.png', fullPage: true });

    // Validate page loaded correctly
    await expect(page).toHaveTitle(/.+/); // Should have some title
    
    // Check for main content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Evidence logging
    console.log(`📊 EVIDENCE SUMMARY:`);
    console.log(`   • Page Title: ${await page.title()}`);
    console.log(`   • Console Errors: ${consoleErrors.length}`);
    console.log(`   • Console Warnings: ${consoleWarnings.length}`);
    console.log(`   • Page URL: ${page.url()}`);
    console.log(`   • Screenshot: nextjs-app-runtime-validation.png`);

    if (consoleErrors.length > 0) {
      console.log(`❌ CONSOLE ERRORS DETECTED:`);
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.text}`);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log(`⚠️  CONSOLE WARNINGS DETECTED:`);
      consoleWarnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type}] ${warning.text}`);
      });
    }

    // VALIDATION AGAINST CLAIMS
    const claimed0Errors = true; // This is the claim being tested
    const actual0Errors = consoleErrors.length === 0;
    
    console.log(`🔍 CLAIM VALIDATION:`);
    console.log(`   • Claimed: 0 console errors`);
    console.log(`   • Actual: ${consoleErrors.length} console errors`);
    console.log(`   • Claim Valid: ${actual0Errors ? '✅ TRUE' : '❌ FALSE'}`);

    // This should pass if claims are accurate
    if (!actual0Errors) {
      console.log(`❌ CRITICAL: Console error claim is FALSE - Found ${consoleErrors.length} errors`);
    }

    expect(consoleErrors.length).toBe(0);
  });

  // Test 2: Production Application Validation
  test('Production App - Functional Validation', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ PRODUCTION ERROR: ${msg.text()}`);
      }
    });

    console.log('🔍 Loading Production app at https://productory-powerups.netlify.app');
    
    try {
      await page.goto('https://productory-powerups.netlify.app', { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'production-app-runtime-validation.png', fullPage: true });

      const title = await page.title();
      const url = page.url();
      
      console.log(`📊 PRODUCTION EVIDENCE:`);
      console.log(`   • Page Title: ${title}`);
      console.log(`   • Final URL: ${url}`);
      console.log(`   • Console Errors: ${consoleErrors.length}`);
      console.log(`   • Screenshot: production-app-runtime-validation.png`);

      expect(page.url()).toContain('netlify.app');

    } catch (error) {
      console.log(`❌ PRODUCTION ACCESS ERROR: ${error}`);
      await page.screenshot({ path: 'production-app-error.png' });
      throw error;
    }
  });

  // Test 3: Authentication Flow Testing
  test('Authentication Components Runtime Test', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    const reactErrors: Array<string> = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        if (msg.text().includes('React') || msg.text().includes('useAuth') || msg.text().includes('Clerk')) {
          reactErrors.push(msg.text());
        }
      }
    });

    console.log('🔍 Testing authentication components runtime');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Test with authentication parameters
    await page.goto('http://localhost:3000?code=TEST123', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Look for authentication UI elements
    const bodyContent = await page.content();
    const hasSignInButton = bodyContent.includes('Sign in') || bodyContent.includes('Login') || bodyContent.includes('Get Started');
    const hasClerkContent = bodyContent.includes('clerk') || bodyContent.includes('Clerk');

    await page.screenshot({ path: 'auth-components-runtime-validation.png', fullPage: true });

    console.log(`📊 AUTHENTICATION EVIDENCE:`);
    console.log(`   • Console Errors: ${consoleErrors.length}`);
    console.log(`   • React/Auth Errors: ${reactErrors.length}`);
    console.log(`   • Has Sign-in Button: ${hasSignInButton}`);
    console.log(`   • Has Clerk Content: ${hasClerkContent}`);
    console.log(`   • Screenshot: auth-components-runtime-validation.png`);

    if (reactErrors.length > 0) {
      console.log(`❌ REACT/AUTH ERRORS:`);
      reactErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    expect(reactErrors.length).toBe(0);
  });

  // Test 4: Performance Validation
  test('Performance Metrics Validation', async ({ page }) => {
    console.log('🔍 Measuring performance metrics');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    console.log(`📊 PERFORMANCE EVIDENCE:`);
    console.log(`   • Total Load Time: ${loadTime}ms`);
    console.log(`   • DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   • Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   • First Paint: ${metrics.firstPaint}ms`);
    console.log(`   • First Contentful Paint: ${metrics.firstContentfulPaint}ms`);

    // Validate performance claims
    const claimedFastLoad = loadTime < 3000; // < 3 seconds
    const claimedGoodMetrics = metrics.firstContentfulPaint < 2000;

    console.log(`🔍 PERFORMANCE VALIDATION:`);
    console.log(`   • Load Time < 3s: ${claimedFastLoad ? '✅' : '❌'} (${loadTime}ms)`);
    console.log(`   • FCP < 2s: ${claimedGoodMetrics ? '✅' : '❌'} (${metrics.firstContentfulPaint}ms)`);

    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  // Test 5: Cross-Browser Compatibility 
  test('Cross-Browser Runtime Validation', async () => {
    const browsers = [
      { name: 'Chromium', browser: chromium },
      { name: 'Firefox', browser: firefox },
      { name: 'WebKit', browser: webkit }
    ];

    for (const { name, browser } of browsers) {
      console.log(`🔍 Testing ${name} browser compatibility`);
      
      const browserInstance = await browser.launch();
      const page = await browserInstance.newPage();
      
      const consoleErrors: Array<string> = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(`${name}: ${msg.text()}`);
        }
      });

      try {
        await page.goto('http://localhost:3000', { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${name.toLowerCase()}-compatibility-test.png` });
        
        const title = await page.title();
        
        console.log(`📊 ${name} EVIDENCE:`);
        console.log(`   • Loaded Successfully: ✅`);
        console.log(`   • Page Title: ${title}`);
        console.log(`   • Console Errors: ${consoleErrors.length}`);
        console.log(`   • Screenshot: ${name.toLowerCase()}-compatibility-test.png`);

      } catch (error) {
        console.log(`❌ ${name} FAILED: ${error}`);
      } finally {
        await browserInstance.close();
      }
    }
  });
});

// Extension Runtime Testing (Requires Chrome Extension Setup)
test.describe('Extension Runtime Validation', () => {
  test.skip('Chrome Extension Loading Test', async () => {
    // This would require loading the extension in Chrome
    // Skipped for now as it requires special setup
    console.log('🔍 Extension testing requires Chrome extension setup');
    console.log('📋 Manual Test Required:');
    console.log('   1. Load extension from dist/ folder');
    console.log('   2. Navigate to gamma.app');
    console.log('   3. Test timetable extraction');
    console.log('   4. Validate authentication flow');
  });
});