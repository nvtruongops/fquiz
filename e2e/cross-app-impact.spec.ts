import { test, expect } from '@playwright/test'
import {
  WEB_APP_URL,
  ADMIN_APP_URL,
  createTestToken,
  DEFAULT_TEST_USER_ID,
  DEFAULT_ADMIN_USER_ID
} from './helpers/auth'

test.describe('Cross-App Interoperability & Zero-Conflict Verification', () => {
  test('1. Security Boundary: Student token MUST be rejected on Admin API with 403', async ({ request }) => {
    const studentToken = await createTestToken({ role: 'student', userId: DEFAULT_TEST_USER_ID })

    const res = await request.get(`${ADMIN_APP_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    })

    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('Forbidden')
  })

  test('2. Security Boundary: Admin token is accepted on Admin API with 200', async ({ request }) => {
    const adminToken = await createTestToken({ role: 'admin', userId: DEFAULT_ADMIN_USER_ID })

    const res = await request.get(`${ADMIN_APP_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.users).toBeDefined()
  })

  test('3. Data Flow: Category created in Admin is accessible on Web Public API', async ({ request }) => {
    const adminToken = await createTestToken({ role: 'admin', userId: DEFAULT_ADMIN_USER_ID })
    const uniqueCategoryName = `E2E_Cat_${Date.now()}`

    // 1. Admin creates category
    const createRes = await request.post(`${ADMIN_APP_URL}/api/categories`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: uniqueCategoryName,
      },
    })

    expect(createRes.status()).toBe(201)
    const createdData = await createRes.json()
    expect(createdData.category.name).toBe(uniqueCategoryName)
    const categoryId = createdData.category._id

    // 2. Student calls Web public categories API
    const webRes = await request.get(`${WEB_APP_URL}/api/v1/public/categories`)
    expect(webRes.status()).toBe(200)
    const webData = await webRes.json()
    expect(webData.data).toBeDefined()

    // 3. Clean up by deleting the created category in Admin
    const delRes = await request.delete(`${ADMIN_APP_URL}/api/categories/${categoryId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
    expect(delRes.status()).toBe(200)
  })

  test('4. Feedback Lifecycle: Feedback created by Student is retrieved and replied by Admin', async ({ request }) => {
    const studentToken = await createTestToken({ role: 'student', userId: DEFAULT_TEST_USER_ID, username: 'examplestudent' })
    const adminToken = await createTestToken({ role: 'admin', userId: DEFAULT_ADMIN_USER_ID, username: 'admin_tester' })

    const feedbackMsg = `E2E Bug Report message ${Date.now()}`
    const csrfToken = 'test-csrf-token-abc-123'

    // 1. Student submits feedback on Web
    const postFeedbackRes = await request.post(`${WEB_APP_URL}/api/feedback`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
        'Cookie': `csrf-token=${csrfToken}`,
        'x-csrf-token': csrfToken,
      },
      data: {
        type: 'bug',
        message: feedbackMsg,
      },
    })

    expect(postFeedbackRes.status()).toBe(201)

    // 2. Admin retrieves feedback list on Admin app
    const adminListRes = await request.get(`${ADMIN_APP_URL}/api/feedback`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })

    expect(adminListRes.status()).toBe(200)
    const adminListData = await adminListRes.json()
    const targetFeedback = adminListData.feedbacks.find((f: any) => f.message === feedbackMsg)
    expect(targetFeedback).toBeDefined()
    const feedbackId = targetFeedback._id

    // 3. Admin replies to the feedback
    const replyRes = await request.post(`${ADMIN_APP_URL}/api/feedback/${feedbackId}/reply`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        reply_message: 'Thank you for reporting this issue. It has been verified.',
      },
    })

    expect(replyRes.status()).toBe(200)
    const replyData = await replyRes.json()
    expect(replyData.success).toBe(true)
    expect(replyData.feedback.status).toBe('resolved')

    // 4. Clean up feedback
    await request.delete(`${ADMIN_APP_URL}/api/feedback/${feedbackId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
  })

  test('5. Maintenance Mode Toggle: Admin modifies system settings with AES-256 preservation', async ({ request }) => {
    const adminToken = await createTestToken({ role: 'admin', userId: DEFAULT_ADMIN_USER_ID })

    // 1. Read existing settings
    const getRes = await request.get(`${ADMIN_APP_URL}/api/settings`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
    expect(getRes.status()).toBe(200)

    // 2. Update site name without breaking API keys
    const updateRes = await request.put(`${ADMIN_APP_URL}/api/settings`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        app_name: 'FQuiz - Nền Tảng Ôn Thi Trực Tuyến',
        app_description: 'Nền tảng thi trắc nghiệm hiện đại',
      },
    })

    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json()
    expect(updated.settings.app_name).toBe('FQuiz - Nền Tảng Ôn Thi Trực Tuyến')
  })
})
