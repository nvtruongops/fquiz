import { renderHook, resetHooks } from '../../../../../test/hookHarness'

const mockRouter = { push: jest.fn(), refresh: jest.fn() }
const mockQueryClient = { invalidateQueries: jest.fn() }
const mockToast = jest.fn()
const mockDiagnostics = { isValid: true, errors: [] }

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }))
jest.mock('@/hooks/useToast', () => ({ toast: mockToast }), { virtual: true })
jest.mock('../useCourseCodeCheck', () => ({
  useCourseCodeCheck: () => ({ courseCode: 'test-quiz', setCourseCode: jest.fn(), isCheckingCode: false, codeDuplicateInfo: null }),
}))
jest.mock('../useQuizDiagnostics', () => ({ useQuizDiagnostics: () => mockDiagnostics }))

const { useQuizEditorForm } = require('../useQuizEditorForm') as typeof import('../useQuizEditorForm')

const originalFetch = global.fetch

function renderEditor() {
  return renderHook(() => useQuizEditorForm({ initialData: { category_id: 'category-1', course_code: 'test-quiz' } }))
}

beforeEach(() => {
  resetHooks()
  mockRouter.push.mockReset()
  mockRouter.refresh.mockReset()
  mockQueryClient.invalidateQueries.mockReset()
  mockToast.mockReset()
  mockDiagnostics.isValid = true
  mockDiagnostics.errors = []
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})

afterEach(() => {
  resetHooks()
  global.fetch = originalFetch
})

it('invalidates the admin quiz list before navigating after a successful save', async () => {
  const events: string[] = []
  let resolveInvalidation!: () => void
  mockQueryClient.invalidateQueries.mockImplementation(() => {
    events.push('invalidate')
    return new Promise<void>((resolve) => { resolveInvalidation = resolve })
  })
  mockRouter.push.mockImplementation(() => events.push('push'))

  const editor = renderEditor()
  const submission = editor.handleSubmit('draft')
  await Promise.resolve()
  await Promise.resolve()

  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin', 'quizzes'] })
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(mockRouter.refresh).not.toHaveBeenCalled()

  resolveInvalidation()
  await submission
  expect(events).toEqual(['invalidate', 'push'])
  expect(mockRouter.refresh).not.toHaveBeenCalled()
})

it('does not invalidate or navigate when validation prevents publishing', async () => {
  mockDiagnostics.isValid = false
  mockDiagnostics.errors = [{ message: 'Complete the questions first' }]

  const editor = renderEditor()
  await editor.handleSubmit('published')

  expect(global.fetch).not.toHaveBeenCalled()
  expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(mockRouter.refresh).not.toHaveBeenCalled()
})

it('does not invalidate or navigate when the save request fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Save failed' }) })

  const editor = renderEditor()
  await editor.handleSubmit('draft')

  expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(mockRouter.refresh).not.toHaveBeenCalled()
})
