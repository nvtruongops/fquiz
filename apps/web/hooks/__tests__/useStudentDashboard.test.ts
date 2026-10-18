import { renderHook, resetHooks } from '../../../../test/hookHarness'
import { useStudentDashboard } from '../useStudentDashboard'

let mockQueryResult: Record<string, unknown>

jest.mock('react', () => require('../../../../test/hookHarness').reactHooks)
jest.mock('@tanstack/react-query', () => ({ useQuery: () => mockQueryResult }))
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ data: { user: { name: 'Learner', role: 'student' } } }),
}))

describe('useStudentDashboard', () => {
  beforeEach(() => {
    resetHooks()
    mockQueryResult = {
      data: undefined,
      isLoading: false,
      isRefetching: false,
      isError: true,
      error: new Error('dashboard request failed'),
      refetch: jest.fn(),
    }
  })

  afterEach(resetHooks)

  it('exposes a failed initial dashboard request separately from empty data', () => {
    const dashboard = renderHook(useStudentDashboard)

    expect(dashboard.isError).toBe(true)
    expect(dashboard.recentActivities).toEqual([])
  })
})
