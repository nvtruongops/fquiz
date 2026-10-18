import React from 'react'
import { renderHook, resetHooks } from '../../../../../../test/hookHarness'
import AdminUsersPage from '../page'

const retry = jest.fn()
const failure = new Error('Failed to load user list')
const setPage = jest.fn()
const setSearch = jest.fn()

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../../test/hookHarness').reactHooks }))
jest.mock('@/hooks/users/useAdminUsers', () => ({
  useAdminUsers: () => ({
    page: 3, setPage, search: '', setSearch, role: '', setRole: jest.fn(), status: '', setStatus: jest.fn(),
    data: undefined, isLoading: false, isFetching: false, isSearchPending: true, isError: true, error: failure, refetch: retry,
    updateMutation: { mutate: jest.fn() }, deleteMutation: { mutate: jest.fn(), isPending: false },
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

it('connects the query failure and retry to the user table', () => {
  resetHooks()
  const page = renderHook(() => AdminUsersPage())
  const table = descendants(page).find((node) => typeof node.type === 'function' && node.type.name === 'UserTable')
  expect(table.props.isError).toBe(true)
  expect(table.props.error).toBe(failure)
  expect(table.props.onRetry).toBe(retry)
})

it('marks the user results busy while a search is waiting for debounce', () => {
  resetHooks()
  const page = renderHook(() => AdminUsersPage())
  const resultContainer = descendants(page).find((node) => node.type === 'div' && node.props['aria-busy'] !== undefined)
  expect(resultContainer.props['aria-busy']).toBe(true)
})

it('does not reset the user page on each keystroke', () => {
  resetHooks()
  const page = renderHook(() => AdminUsersPage())
  const searchInput = descendants(page).find((node) => node.props.placeholder === 'Search by username or email...')
  searchInput.props.onChange({ target: { value: 'marina' } })
  expect(setSearch).toHaveBeenCalledWith('marina')
  expect(setPage).not.toHaveBeenCalled()
})
