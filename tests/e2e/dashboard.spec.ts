import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display beautiful landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check main elements
    await expect(page.locator('h1')).toContainText('Gamma Timetable');
    await expect(page.locator('text=Transform your Gamma presentations')).toBeVisible();
    
    // Check login button
    const loginBtn = page.locator('#main-login-btn');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toContainText('Sign In with Clerk');
    
    // Check features section
    await expect(page.locator('text=Chrome extension')).toBeVisible();
    await expect(page.locator('text=Cross-device synchronization')).toBeVisible();
    await expect(page.locator('text=Export to Excel')).toBeVisible();
  });

  test('should handle login button click', async ({ page }) => {
    await page.goto('/');
    
    const loginBtn = page.locator('#main-login-btn');
    await loginBtn.click();
    
    // Should redirect to sign-in page with mock session
    await expect(page).toHaveURL(/.*__session=mock-clerk-session.*/);
  });
});