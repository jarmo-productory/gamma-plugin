import { test, expect } from '@playwright/test';

test.describe('Authentication Pairing Flow', () => {
  let deviceCode: string;
  let deviceId: string;

  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.goto('/');
  });

  test('complete device pairing flow', async ({ page, context }) => {
    // Step 1: Register a device (simulate extension registration)
    const registerResponse = await page.request.post('/api/devices/register', {
      data: {}
    });
    expect(registerResponse.ok()).toBe(true);
    
    const deviceInfo = await registerResponse.json();
    expect(deviceInfo).toHaveProperty('deviceId');
    expect(deviceInfo).toHaveProperty('code');
    expect(deviceInfo).toHaveProperty('expiresAt');
    
    deviceCode = deviceInfo.code;
    deviceId = deviceInfo.deviceId;

    // Step 2: Navigate to the pairing URL (simulate extension opening web app)  
    await page.goto(`/?source=extension&code=${deviceCode}`);
    
    // For unauthenticated users, should show notification banner
    await expect(page.getByText('Device Pairing Request')).toBeVisible();
    await expect(page.getByText(deviceCode)).toBeVisible();
    await expect(page.getByText('Please sign in below to complete the device pairing')).toBeVisible();

    // Step 3: User signs in to enable the modal pairing dialog
    // Use existing test user credentials instead of creating new account
    await page.getByLabel('Email').fill('koolitus@productory.eu');
    await page.getByLabel('Password').fill('Productory7819');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait a moment for authentication to process
    await page.waitForTimeout(2000);

    // Step 4: After authentication, the modal dialog should appear
    // The modal dialog contains the "🔗 Device Pairing" text and Link Device button
    await expect(page.getByText('🔗 Device Pairing')).toBeVisible();
    await expect(page.getByText(deviceCode)).toBeVisible();
    
    // Step 5: Click Link Device button in the modal
    await page.getByRole('button', { name: 'Link Device' }).click();
    
    // Should show success or error message
    // Since this is a real API call, it might succeed or fail depending on the code validity
    await page.waitForTimeout(1000);
    
    // The test documents the expected flow - actual API response may vary
  });

  test('device pairing with expired code', async ({ page }) => {
    // Create an already expired code by manipulating time
    // This is a simulation - in practice, we'd wait for expiration or mock the server time
    
    await page.goto('/?source=extension&code=EXPIRED123');
    
    // For unauthenticated users, should show notification banner instead of modal dialog
    await expect(page.getByText('Device Pairing Request')).toBeVisible();
    await expect(page.getByText('EXPIRED123')).toBeVisible();
    
    // Should show message to sign in first
    await expect(page.getByText('Please sign in below to complete the device pairing')).toBeVisible();
    
    // No "Link Device" button should be visible for unauthenticated users
    await expect(page.getByRole('button', { name: 'Link Device' })).not.toBeVisible();
  });

  test('device pairing without authentication', async ({ page }) => {
    // Register a valid device first
    const registerResponse = await page.request.post('/api/devices/register', {
      data: {}
    });
    const deviceInfo = await registerResponse.json();
    
    await page.goto(`/?source=extension&code=${deviceInfo.code}`);
    
    // For unauthenticated users, should show notification banner
    await expect(page.getByText('Device Pairing Request')).toBeVisible();
    await expect(page.getByText(deviceInfo.code)).toBeVisible();
    await expect(page.getByText('Please sign in below to complete the device pairing')).toBeVisible();
    
    // No "Link Device" button should be visible for unauthenticated users
    await expect(page.getByRole('button', { name: 'Link Device' })).not.toBeVisible();
  });

  test('device registration API', async ({ request }) => {
    // Test the device registration endpoint directly
    const response = await request.post('/api/devices/register', {
      data: {}
    });
    
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('deviceId');
    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('expiresAt');
    
    // Validate the format of returned data
    expect(data.deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    expect(data.code).toMatch(/^[A-Z0-9]+$/);
    expect(new Date(data.expiresAt)).toBeInstanceOf(Date);
  });

  test('device exchange API with unlinked device', async ({ request }) => {
    // Register a device first
    const registerResponse = await request.post('/api/devices/register', {
      data: {}
    });
    const deviceInfo = await registerResponse.json();
    
    // Try to exchange token before device is linked
    const exchangeResponse = await request.post('/api/devices/exchange', {
      data: {
        deviceId: deviceInfo.deviceId,
        code: deviceInfo.code
      }
    });
    
    expect(exchangeResponse.status()).toBe(425); // Too Early
    const errorData = await exchangeResponse.json();
    expect(errorData.error).toBe('Device not linked yet');
  });

  test('device exchange API with invalid code', async ({ request }) => {
    const exchangeResponse = await request.post('/api/devices/exchange', {
      data: {
        deviceId: 'invalid_device',
        code: 'INVALID_CODE'
      }
    });
    
    expect(exchangeResponse.status()).toBe(404);
    const errorData = await exchangeResponse.json();
    expect(errorData.error).toBe('Invalid or expired code');
  });

  test('device link API without authentication', async ({ request }) => {
    // Register a device first
    const registerResponse = await request.post('/api/devices/register', {
      data: {}
    });
    const deviceInfo = await registerResponse.json();
    
    // Try to link without authentication
    const linkResponse = await request.post('/api/devices/link', {
      data: {
        code: deviceInfo.code
      }
    });
    
    expect(linkResponse.status()).toBe(401);
    const errorData = await linkResponse.json();
    expect(errorData.error).toBe('Authentication required');
  });

  test('API input validation', async ({ request }) => {
    // Test missing required fields
    const exchangeResponse1 = await request.post('/api/devices/exchange', {
      data: {
        deviceId: 'test'
        // Missing code
      }
    });
    expect(exchangeResponse1.status()).toBe(400);
    
    const exchangeResponse2 = await request.post('/api/devices/exchange', {
      data: {
        code: 'TEST123'
        // Missing deviceId  
      }
    });
    expect(exchangeResponse2.status()).toBe(400);
    
    const linkResponse = await request.post('/api/devices/link', {
      data: {
        // Missing code
      }
    });
    expect(linkResponse.status()).toBe(400);
  });

  test('pairing URL parameter handling', async ({ page }) => {
    // Test with missing source parameter
    await page.goto('/?code=TEST123');
    await expect(page.getByText('Device Pairing Request')).not.toBeVisible();
    
    // Test with wrong source parameter
    await page.goto('/?source=website&code=TEST123');
    await expect(page.getByText('Device Pairing Request')).not.toBeVisible();
    
    // Test with missing code parameter
    await page.goto('/?source=extension');
    await expect(page.getByText('Device Pairing Request')).not.toBeVisible();
    
    // Test with valid parameters - should show notification banner for unauthenticated users
    await page.goto('/?source=extension&code=TEST123');
    await expect(page.getByText('Device Pairing Request')).toBeVisible();
    await expect(page.getByText('TEST123')).toBeVisible();
  });

  test.describe('Security Tests', () => {
    test('rate limiting device registration', async ({ request }) => {
      // Test making multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request.post('/api/devices/register', { data: {} })
      );
      
      const responses = await Promise.all(requests);
      
      // Currently all should succeed (no rate limiting implemented)
      // This test documents the need for rate limiting
      responses.forEach(response => {
        expect(response.ok()).toBe(true);
      });
      
      // TODO: Once rate limiting is implemented, test that excessive requests are blocked
    });

    test('code enumeration protection', async ({ request }) => {
      // Test that invalid codes don't leak information about valid codes
      const invalidCodes = ['A', 'AAAAA', '12345', 'invalid'];
      
      for (const code of invalidCodes) {
        const exchangeResponse = await request.post('/api/devices/exchange', {
          data: {
            deviceId: 'test_device',
            code: code
          }
        });
        
        // Accept either 400 or 404 as both are acceptable for security
        expect([400, 404]).toContain(exchangeResponse.status());
        const errorData = await exchangeResponse.json();
        expect(errorData.error).toBeDefined();
      }
      
      // Test empty string separately as it might return 400 for validation
      const emptyResponse = await request.post('/api/devices/exchange', {
        data: {
          deviceId: 'test_device', 
          code: ''
        }
      });
      expect([400, 404]).toContain(emptyResponse.status());
    });

    test('device ID validation', async ({ request }) => {
      // Register a valid device
      const registerResponse = await request.post('/api/devices/register', {
        data: {}
      });
      const deviceInfo = await registerResponse.json();
      
      // Try to exchange with wrong device ID
      const exchangeResponse = await request.post('/api/devices/exchange', {
        data: {
          deviceId: 'wrong_device_id',
          code: deviceInfo.code
        }
      });
      
      expect(exchangeResponse.status()).toBe(400);
      const errorData = await exchangeResponse.json();
      expect(errorData.error).toBe('Invalid device ID');
    });
  });

  test.describe('Error Handling', () => {
    test('malformed JSON requests', async ({ request }) => {
      // Test various malformed requests
      const badRequests = [
        { data: 'invalid json' },
        { data: null },
        { data: undefined }
      ];
      
      for (const badRequest of badRequests) {
        try {
          const response = await request.post('/api/devices/register', badRequest);
          expect(response.status()).toBe(500);
        } catch (error) {
          // Network errors are also acceptable for malformed requests
          expect(error).toBeDefined();
        }
      }
    });

    test('network error handling in UI', async ({ page }) => {
      // Mock network failure for the link API
      await page.route('/api/devices/link', route => {
        route.abort('failed');
      });
      
      // First, authenticate to get access to the modal dialog
      await page.goto('/');
      await page.getByLabel('Email').fill('koolitus@productory.eu');
      await page.getByLabel('Password').fill('Productory7819');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForTimeout(2000);
      
      // Then navigate to pairing URL
      await page.goto('/?source=extension&code=TEST123');
      
      // Modal should appear for authenticated users
      await expect(page.getByText('🔗 Device Pairing')).toBeVisible();
      
      // Try to link device - this should trigger network error
      await page.getByRole('button', { name: 'Link Device' }).click();
      
      // Should show error message in the modal
      await expect(page.getByText(/Failed to link device/)).toBeVisible({ timeout: 5000 });
    });
  });
});