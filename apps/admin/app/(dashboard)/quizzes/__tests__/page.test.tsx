import React from 'react'
import { renderHook, resetHooks } from '../../../../../../test/hookHarness'
import AdminQuizzesPage from '../page'

const setPage = jest.fn()
const setSearch = jest.fn()

jest.mock('@/hooks/quizzes/useAdminQuizzes', () => ({
  useAdminQuizzes: () => ({
    page: 3,
    setPage,
    search: '',
    setSearch,
    category: 'all',
    setCategory: jest.fn(),
    deleteTarget: null,
    setDeleteTarget: jest.fn(),
    categories: [],
    data: { quizzes: [], total: 0 },
    isLoading: false,
    isFetching: false,
    isSearchPending: true,
    totalPages: 1,
    updateStatusMutation: { mutate: jest.fn() },
    deleteMutation: { mutate: jest.fn(), isPending: false },
  }),
}))

function descendants(node: any): any[] {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(descendants)]
}

beforeEach(() => {
  setPage.mockClear()
  setSearch.mockClear()
})

it('marks quiz results busy while a search is waiting for debounce', () => {
  resetHooks()
  const page = renderHook(() => AdminQuizzesPage())
  const resultContainer = descendants(page).find((node) => node.type === 'div' && node.props['aria-busy'] !== undefined)
  expect(resultContainer.props['aria-busy']).toBe(true)
})

it('does not reset the quiz page on each keystroke', () => {
  resetHooks()
  const page = renderHook(() => AdminQuizzesPage())
  const searchInput = descendants(page).find((node) => node.props.placeholder === 'Search by title or category...')
  searchInput.props.onChange({ target: { value: 'history' } })
  expect(setSearch).toHaveBeenCalledWith('history')
  expect(setPage).not.toHaveBeenCalled()
})
