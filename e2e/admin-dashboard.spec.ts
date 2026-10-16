import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Dashboard & Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should display dashboard overview and key metrics', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Metric cards
    await expect(page.getByText(/Categories/i).first()).toBeVisible()
    await expect(page.getByText(/Quizzes/i).first()).toBeVisible()
    await expect(page.getByText(/Students|Users/i).first()).toBeVisible()
    await expect(page.getByText(/Exam Attempts|Attempts/i).first()).toBeVisible()

    // Recent registered users section
    await expect(page.getByText(/Recent Registrations|Recent Users/i)).toBeVisible()
  })

  test('should navigate across sidebar links properly', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/`)

    // Navigate to Users
    await page.getByRole('link', { name: /Users|Students/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/users`)
    await expect(page.getByRole('heading', { name: /User Management|Users/i })).toBeVisible()

    // Navigate to Categories
    await page.getByRole('link', { name: /Categories/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/categories`)
    await expect(page.getByRole('heading', { name: /Category.*Management|Categories/i })).toBeVisible()

    // Navigate to Quizzes
    await page.getByRole('link', { name: /Quizzes/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/quizzes`)
    await expect(page.getByRole('heading', { name: /Quiz Management|Quizzes/i })).toBeVisible()

    // Navigate to Question Bank
    await page.getByRole('link', { name: /Question Bank/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/question-bank`)
    await expect(page.getByRole('heading', { name: /Question Bank/i })).toBeVisible()

    // Navigate to Feedback
    await page.getByRole('link', { name: /Feedback/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/feedback`)
    await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible()

    // Navigate to Settings
    await page.getByRole('link', { name: /Settings/i }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/settings`)
    await expect(page.getByRole('heading', { name: /System Settings|Settings/i })).toBeVisible()
  })
})
