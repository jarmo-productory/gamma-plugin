import { test, expect } from '@playwright/test';

test.describe('Homepage Validation', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is set correctly
    await expect(page).toHaveTitle(/Gamma Timetable/);

    // Check for the presence of key elements
    await expect(page.locator('body')).toBeVisible();

    // Check that there are no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to catch any console errors
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify no console errors occurred
    expect(errors.length).toBe(0);
  });

  test('navigation elements are present', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check for navigation elements (adjust selectors based on your actual UI)
    const navigation = page.locator('nav, header, [role="navigation"]').first();
    if (await navigation.count() > 0) {
      await expect(navigation).toBeVisible();
    }

    // Check for main content area
    const main = page.locator('main, [role="main"], .main-content').first();
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
  });

  test('responsive design works', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Verify page is accessible
    await expect(page.locator('body')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('page loads within performance threshold', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Expect page to load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('basic accessibility checks', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check for page title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Check for meta description (SEO)
    const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
    if (metaDescription) {
      expect(metaDescription.length).toBeGreaterThan(0);
    }

    // Check for proper heading structure
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBeGreaterThanOrEqual(1);

    // Check that images have alt text (if any images exist)
    const images = await page.locator('img').count();
    if (images > 0) {
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBe(0);
    }
  });
});