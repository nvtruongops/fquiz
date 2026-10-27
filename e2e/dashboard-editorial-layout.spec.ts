import { expect, test } from '@playwright/test'
import { setStudentAuthCookie } from './helpers/auth'

const dashboardData = {
  recentActivities: [
    {
      id: 'active-session',
      quizId: 'quiz-active',
      activeSessionId: 'active-session',
      quizTitle: 'VNR202_SU26_B5_FE',
      quizCode: 'VNR202_SU26_B5_FE',
      status: 'active',
      mode: 'quiz',
      activeAnsweredCount: 12,
      activeTotalCount: 60,
      activityAt: '2026-10-18T10:00:00.000Z',
    },
    {
      id: 'completed-session',
      quizId: 'quiz-completed',
      quizTitle: 'VNR202_SU26_FE_C1',
      quizCode: 'VNR202_SU26_FE_C1',
      status: 'completed',
      mode: 'quiz',
      score: 7,
      correctCount: 4,
      totalCount: 60,
      activityAt: '2026-10-18T09:00:00.000Z',
    },
    {
      id: 'older-session',
      quizId: 'quiz-older',
      quizTitle: 'VNR202_SU26_B5_RE',
      quizCode: 'VNR202_SU26_B5_RE',
      status: 'completed',
      mode: 'quiz',
      score: 0,
      correctCount: 0,
      totalCount: 60,
      activityAt: '2026-10-16T09:00:00.000Z',
    },
  ],
  pinnedCategories: [{ id: 'category-vnr202', name: 'VNR202', quizCount: 47 }],
}

test('dashboard keeps the resume action unique and reflows at narrow widths', async ({ page, context }) => {
  await setStudentAuthCookie(context, { baseURL: 'http://localhost:3000' })
  await context.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          _id: '69d7441dff42ce4f938bd488',
          name: 'FQuiz Student',
          email: 'student@example.test',
          role: 'student',
        },
      }),
    })
  })
  await context.route('**/api/student/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardData),
    })
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'VNR202_SU26_B5_FE' })).toHaveCount(1)
  await expect(page.getByRole('link', { name: /Resume quiz/ })).toHaveAttribute(
    'href',
    '/quiz/quiz-active/session/active-session'
  )
  await expect(page.getByRole('heading', { name: 'Pinned subjects' })).toBeVisible()
  await page.screenshot({ path: 'test-results/dashboard-editorial-1440.png', fullPage: true })

  for (const width of [390, 320]) {
    const mobilePage = await context.newPage()
    await mobilePage.setViewportSize({ width, height: 844 })
    await mobilePage.goto('/dashboard')
    await expect(mobilePage.getByRole('heading', { name: 'Recent activity' })).toBeVisible()
    await expect(mobilePage.getByRole('heading', { name: 'VNR202_SU26_B5_FE' })).toHaveCount(1)
    await expect.poll(() => mobilePage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const layout = await mobilePage.evaluate(() => {
      const heading = document.querySelector('h1')
      const primaryAction = document.getElementById('resume-quiz-title')?.closest('section')
      return {
        headingLeft: heading?.getBoundingClientRect().left ?? Infinity,
        primaryWidth: primaryAction?.getBoundingClientRect().width ?? 0,
      }
    })
    expect(layout.headingLeft).toBeLessThan(40)
    expect(layout.primaryWidth).toBeGreaterThan(width - 80)
    await mobilePage.screenshot({ path: `test-results/dashboard-editorial-${width}.png`, fullPage: true })
    await mobilePage.close()
  }
})
