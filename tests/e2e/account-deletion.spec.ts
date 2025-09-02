import { test, expect } from '@playwright/test'

// This test creates a disposable user via UI sign-up (no email validation assumed),
// signs in, then deletes the account via the settings page.

test.describe('Account deletion flow (UI signup → delete)', () => {
  test('sign up, sign in if needed, delete account', async ({ page }) => {
    const email = `e2e-delete-${Date.now()}@example.com`
    const password = 'TestPwd!1234'

    // 1) Go to homepage and open Create account tab
    await page.goto('/')
    await page.getByRole('tab', { name: 'Create account' }).click({ trial: true }).catch(async () => {
      // Fallback selector if role not available
      await page.locator('button:has-text("Create account")').click()
    })

    // 2) Fill sign-up form
    await page.getByLabel('First name').fill('E2E')
    await page.getByLabel('Last name').fill('Delete')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByLabel('Confirm password').fill(password)
    await page.locator('#terms').check()
    await page.getByRole('button', { name: 'Create account' }).click()

    // If project requires no email confirmation, user might be auto-signed in;
    // otherwise, proceed to sign-in explicitly.
    await page.waitForTimeout(500)

    // 3) Ensure we are signed in; if not, sign in via UI
    if (!page.url().includes('/dashboard')) {
      await page.getByRole('tab', { name: 'Sign in' }).click({ trial: true }).catch(() => {})
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password').fill(password)
      await page.getByRole('button', { name: 'Sign in' }).click()
    }

    await page.waitForURL('**/dashboard', { timeout: 20000 })

    // 4) Navigate to Account settings
    await page.goto('/settings/account')

    // 5) Perform deletion with strong confirmation
    await page.getByLabel('Type DELETE to confirm').fill('DELETE')
    await page.getByRole('button', { name: 'Delete my account' }).click()
    await expect(page.getByText('Your account is about to be deleted')).toBeVisible()

    // 6) Expect redirect to home after short delay and signed out state visible
    await page.waitForURL('**/', { timeout: 25000 })
    await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible()
  })
})

