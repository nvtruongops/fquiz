import { test, expect } from '@playwright/test';

test.describe('Home and Public Navigation', () => {
  test('should load the home or login page successfully', async ({ page }) => {
    await page.goto('/');
    // Check page title or essential UI presence
    await expect(page).toHaveTitle(/FQuiz|Quiz|Đăng nhập/i);
  });

  test('should navigate to explore page', async ({ page }) => {
    await page.goto('/explore');
    await expect(page).toHaveURL(/.*explore|.*login/);
  });

  test('should render 404 page for nonexistent routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-route-123');
    expect(response?.status()).toBe(404);
  });
});
