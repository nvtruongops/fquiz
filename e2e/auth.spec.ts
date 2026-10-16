import { test, expect } from '@playwright/test'
import { DEFAULT_TEST_EMAIL } from './helpers/auth'

test.describe('Authentication & Password Recovery Flows', () => {
  test.describe('Login Page (/login)', () => {
    test('should display login form elements properly', async ({ page }) => {
      await page.goto('/login')

      // Check header and titles
      await expect(page.getByRole('heading', { name: /Sign In/i })).toBeVisible()

      // Inputs
      const identifierInput = page.locator('#identifier')
      const passwordInput = page.locator('#password')
      const submitButton = page.locator('button[type="submit"]')

      await expect(identifierInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
      await expect(submitButton).toBeVisible()

      // Navigation links
      await expect(page.getByRole('link', { name: /Create account|Sign Up/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Forgot password\?/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Admin Portal/i })).toBeVisible()
    })

    test('should validate empty fields when submitted', async ({ page }) => {
      await page.goto('/login')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Identifier and password validation errors should appear
      await expect(page.getByText(/Please enter your email or username/i)).toBeVisible()
      await expect(page.getByText(/Please enter your password/i)).toBeVisible()
    })

    test('should toggle password visibility on click', async ({ page }) => {
      await page.goto('/login')

      const passwordInput = page.locator('#password')
      await passwordInput.fill('Student@123456')

      // Initially password type
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Toggle button
      const toggleBtn = page.locator('button[aria-label="Show password"]')
      await toggleBtn.click()

      // Now text type
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // Toggle back
      const hideBtn = page.locator('button[aria-label="Hide password"]')
      await hideBtn.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should handle invalid login credentials with error toast', async ({ page }) => {
      // Mock login rejection
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Incorrect username/email or password' }),
        })
      })

      await page.goto('/login')
      await page.locator('#identifier').fill('wronguser@fquiz.vn')
      await page.locator('#password').fill('wrongpassword123')

      await page.locator('button[type="submit"]').click()

      // Expect error toast/message
      await expect(page.getByText(/Incorrect username\/email or password/i)).toBeVisible()
    })

    test('should redirect on successful login', async ({ page }) => {
      // Mock login success
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Set-Cookie': 'auth-token=mock-jwt-token; Path=/; HttpOnly; SameSite=Strict',
          },
          body: JSON.stringify({
            message: 'Login successful',
            role: 'student',
            user: {
              _id: '69d7441dff42ce4f938bd488',
              name: 'FQuiz Student',
              email: DEFAULT_TEST_EMAIL,
              role: 'student',
            },
          }),
        })
      })

      await page.goto('/login?callbackUrl=%2Fexplore')
      await page.locator('#identifier').fill(DEFAULT_TEST_EMAIL)
      await page.locator('#password').fill('Student@123456')

      await page.locator('button[type="submit"]').click()

      // Transition to explore or dashboard
      await expect(page).toHaveURL(/.*explore|.*dashboard/, { timeout: 10000 })
    })
  })

  test.describe('Register Page (/register)', () => {
    test('should display register form with all required inputs', async ({ page }) => {
      await page.goto('/register')

      await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible()
      await expect(page.locator('input[name="username"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
      await expect(page.locator('input[name="verificationCode"]')).toBeVisible()
      await expect(page.getByRole('button', { name: /Send Code/i })).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show error when sending verification code without valid email', async ({ page }) => {
      await page.goto('/register')

      const sendCodeBtn = page.getByRole('button', { name: /Send Code/i })
      await sendCodeBtn.click()

      await expect(page.getByText(/Please enter a valid email address before requesting a code/i)).toBeVisible()
    })
  })

  test.describe('Forgot Password Page (/forgot-password)', () => {
    test('should display forgot password form and validate email format', async ({ page }) => {
      await page.goto('/forgot-password')

      await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible()
      const emailInput = page.locator('input#email')
      await expect(emailInput).toBeVisible()

      // Submit invalid email
      await emailInput.fill('notanemail')
      await page.locator('button[type="submit"]').click()

      await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible()
    })
  })

  test.describe('Restore Account Page (/restore-account)', () => {
    test('should show error message when visited without token parameter', async ({ page }) => {
      await page.goto('/restore-account')
      await expect(page.getByText(/Account recovery token not found in link/i)).toBeVisible()
    })
  })
})
