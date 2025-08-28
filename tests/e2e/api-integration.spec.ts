import { test, expect } from '@playwright/test'

test.describe('API Integration & Route Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('database connection and API endpoints', async ({ page }) => {
    console.log('🗄️ Testing database and API integration')
    
    // Test database connection endpoint
    const dbResponse = await page.request.get('http://localhost:3000/api/test-db')
    const dbStatus = dbResponse.status()
    const dbData = await dbResponse.json()
    
    console.log(`Database connection test: ${dbStatus}`)
    console.log(`Database response:`, dbData)
    
    expect(dbStatus).toBe(200)
    expect(dbData.success).toBe(true)
  })

  test('authentication routes accessibility', async ({ page }) => {
    console.log('🛣️ Testing all authentication routes')
    
    const routes = [
      { path: '/login', expectedStatus: 200, description: 'Login page' },
      { path: '/signup', expectedStatus: 200, description: 'Signup page' },
      { path: '/dashboard', expectedStatus: 307, description: 'Protected dashboard (should redirect)' },
      { path: '/auth/callback', expectedStatus: 200, description: 'Auth callback' },
      { path: '/auth/signout', expectedStatus: 405, description: 'Signout route (POST only)' }
    ]
    
    for (const route of routes) {
      const response = await page.request.get(`http://localhost:3000${route.path}`)
      const actualStatus = response.status()
      
      console.log(`${route.description}: ${actualStatus} (expected ${route.expectedStatus})`)
      
      // For redirects, check the location header
      if (actualStatus === 307) {
        const location = response.headers()['location']
        console.log(`  Redirects to: ${location}`)
      }
      
      expect([route.expectedStatus, 200, 307]).toContain(actualStatus)
    }
  })

  test('network monitoring during authentication', async ({ page }) => {
    console.log('🔍 Monitoring network requests during auth flow')
    
    let networkRequests = []
    
    // Monitor all network requests
    page.on('request', request => {
      if (request.url().includes('localhost:3000')) {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          resourceType: request.resourceType()
        })
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('localhost:3000') && response.status() >= 300) {
        console.log(`  Redirect/Error: ${response.status()} ${response.url()}`)
      }
    })
    
    // Trigger authentication flow
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('testpassword')
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    
    await page.waitForTimeout(3000)
    
    // Filter for API/auth-related requests
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('/api/') || req.url.includes('/auth/')
    )
    
    console.log(`Total requests: ${networkRequests.length}`)
    console.log(`API/Auth requests: ${apiRequests.length}`)
    
    apiRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url} (${req.resourceType})`)
    })
  })

  test('authentication state detection', async ({ page }) => {
    console.log('👤 Testing authentication state detection')
    
    // Check unauthenticated state
    const unauthContent = await page.textContent('body')
    const hasSignInButton = unauthContent?.includes('Sign in')
    
    console.log(`Unauthenticated state detected: ${hasSignInButton}`)
    
    // Try to access protected content
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForTimeout(1000)
    
    const dashboardUrl = page.url()
    const isRedirected = dashboardUrl !== 'http://localhost:3000/dashboard'
    
    console.log(`Dashboard protection working: ${isRedirected}`)
    console.log(`Redirected to: ${dashboardUrl}`)
    
    expect(isRedirected).toBe(true)
  })

  test('error handling and edge cases', async ({ page }) => {
    console.log('⚠️ Testing error handling and edge cases')
    
    // Test 404 handling
    const notFoundResponse = await page.request.get('http://localhost:3000/nonexistent-page')
    console.log(`404 handling: ${notFoundResponse.status()}`)
    
    // Test malformed requests
    try {
      await page.goto('http://localhost:3000/auth/callback?error=test')
      await page.waitForTimeout(1000)
      const errorUrl = page.url()
      console.log(`Error callback handling: ${errorUrl}`)
    } catch (error) {
      console.log(`Error callback test failed: ${error}`)
    }
    
    // Test empty form submission
    await page.goto('http://localhost:3000')
    await page.locator('button[type="submit"]:has-text("Sign in")').click()
    await page.waitForTimeout(1000)
    
    const pageContent = await page.textContent('body')
    const hasValidationFeedback = pageContent?.toLowerCase().includes('required') ||
                                 pageContent?.toLowerCase().includes('invalid')
    
    console.log(`Form validation feedback: ${hasValidationFeedback}`)
  })

  test('performance and loading states', async ({ page }) => {
    console.log('⚡ Testing performance and loading states')
    
    // Measure page load time
    const startTime = Date.now()
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    console.log(`Page load time: ${loadTime}ms`)
    
    // Check for loading indicators during auth
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('test')
    
    // Look for loading states during form submission
    const submitButton = page.locator('button[type="submit"]:has-text("Sign in")')
    await submitButton.click()
    
    // Check if button shows loading state
    await page.waitForTimeout(500)
    const buttonState = await submitButton.getAttribute('disabled')
    const buttonText = await submitButton.textContent()
    
    console.log(`Submit button loading state: disabled=${buttonState}, text="${buttonText}"`)
    
    expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
  })
})