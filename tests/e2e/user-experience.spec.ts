import { test, expect } from '@playwright/test'

test.describe('User Experience & Advanced Authentication', () => {
  const testUser = {
    email: 'koolitus@productory.eu',
    password: 'Productory7819'
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('complete user journey with real credentials', async ({ page }) => {
    console.log('🚀 Testing complete authentication user journey')
    
    // Fill login form with real credentials
    await page.locator('input[type="email"]').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    
    // Monitor authentication requests
    let authRequests = []
    page.on('request', request => {
      if (request.url().includes('/api/auth') || request.url().includes('/auth/')) {
        authRequests.push({ method: request.method(), url: request.url() })
      }
    })
    
    // Submit form
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    console.log(`Post-login URL: ${currentUrl}`)
    console.log(`Auth requests: ${authRequests.length}`)
    
    // Test dashboard access post-authentication
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForTimeout(2000)
    
    const dashboardUrl = page.url()
    console.log(`Dashboard access result: ${dashboardUrl}`)
    
    await page.screenshot({ path: 'test-results/user-journey.png', fullPage: true })
  })

  test('Google OAuth integration detection', async ({ page }) => {
    // Look for Google OAuth button
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")')
    
    if (await googleButton.count() > 0) {
      await expect(googleButton).toBeVisible()
      console.log('✅ Google OAuth integration detected')
      
      const buttonText = await googleButton.textContent()
      console.log(`Google OAuth button: "${buttonText}"`)
    } else {
      console.log('ℹ️ Google OAuth not found - custom auth only')
    }
  })

  test('form validation and error handling', async ({ page }) => {
    console.log('🧪 Testing form validation and UX')
    
    // Test empty form submission
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(1000)
    
    // Check for validation messages
    const validationElements = await page.locator('[role="alert"], .error, [aria-invalid="true"]').count()
    console.log(`Validation elements found: ${validationElements}`)
    
    // Test invalid email format
    await page.locator('input[type="email"]').fill('invalid-email')
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(1000)
    
    // Test wrong credentials
    await page.locator('input[type="email"]').clear()
    await page.locator('input[type="email"]').fill('wrong@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(3000)
    
    const errorContent = await page.textContent('body')
    const hasAuthError = errorContent?.toLowerCase().includes('invalid') ||
                        errorContent?.toLowerCase().includes('incorrect')
    
    console.log(`Authentication error handling: ${hasAuthError ? 'Working' : 'Needs attention'}`)
    
    await page.screenshot({ path: 'test-results/form-validation.png', fullPage: true })
  })

  test('tab interface and UI transitions', async ({ page }) => {
    // Test tab switching between Sign in and Create account
    const signInTab = page.locator('[role="tab"]:has-text("Sign in")')
    const createAccountTab = page.locator('[role="tab"]:has-text("Create account")')
    
    if (await createAccountTab.count() > 0) {
      console.log('✅ Tab interface detected')
      
      // Switch to Create account
      await createAccountTab.click()
      await page.waitForTimeout(500)
      
      // Verify form is still accessible
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
      
      // Switch back to Sign in
      if (await signInTab.count() > 0) {
        await signInTab.click()
        await page.waitForTimeout(500)
        await expect(emailInput).toBeVisible()
      }
      
      console.log('✅ Tab switching functionality working')
    } else {
      console.log('ℹ️ No tab interface - single form design')
    }
  })

  test('authentication persistence and session', async ({ page }) => {
    // Test if authentication state persists across page reloads
    console.log('🔄 Testing session persistence')
    
    // Attempt login
    await page.locator('input[type="email"]').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(3000)
    
    // Check for any auth cookies or localStorage
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(cookie => 
      cookie.name.toLowerCase().includes('auth') || 
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token')
    )
    
    console.log(`Auth-related cookies: ${authCookies.length}`)
    
    const localStorage = await page.evaluate(() => {
      const authKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.toLowerCase().includes('auth')) {
          authKeys.push(key)
        }
      }
      return authKeys
    })
    
    console.log(`Auth localStorage keys: ${localStorage.length}`)
    
    // Reload page and check if still authenticated
    await page.reload()
    await page.waitForTimeout(2000)
    
    // Try accessing dashboard
    await page.goto('http://localhost:3000/dashboard')
    const finalUrl = page.url()
    
    console.log(`Session persistence test result: ${finalUrl.includes('/dashboard') ? 'Persisted' : 'Expired'}`)
  })
})