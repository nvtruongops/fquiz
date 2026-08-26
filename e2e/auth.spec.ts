import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should display login page with form elements', async ({ page }) => {
    await page.goto('/login');
    // Check that login form exists
    const emailInput = page.locator('input[type="email"], input[name="username"], input[name="email"]');
    await expect(emailInput.first()).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/.*register/);
  });
});
