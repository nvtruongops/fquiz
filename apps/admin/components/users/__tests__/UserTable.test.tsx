import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UserTable } from '../UserTable'
import type { UsersResponse } from '../../../hooks/users/useAdminUsers'

jest.mock('@/components/ui/card', () => ({ Card: ({ children }: any) => <section>{children}</section>, CardContent: ({ children }: any) => <div>{children}</div> }), { virtual: true })
jest.mock('@/components/ui/button', () => ({ Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button> }), { virtual: true })
jest.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }), { virtual: true })
jest.mock('@/components/ui/select', () => ({ Select: ({ children }: any) => <div>{children}</div>, SelectContent: ({ children }: any) => <div>{children}</div>, SelectItem: ({ children }: any) => <div>{children}</div>, SelectTrigger: ({ children }: any) => <div>{children}</div>, SelectValue: () => null }), { virtual: true })

const baseProps = {
  isLoading: false,
  page: 1,
  onPageChange: jest.fn(),
  onUpdateRole: jest.fn(),
  onUpdateStatus: jest.fn(),
  onDeleteUser: jest.fn(),
}

const staleData: UsersResponse = {
  users: [{ _id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', status: 'active', created_at: '2026-01-01' }],
  total: 1, page: 1, totalPages: 1,
}

describe('UserTable load feedback', () => {
  it('distinguishes a failed initial load from a successful empty result', () => {
    const onRetry = jest.fn()
    const error = renderToStaticMarkup(<UserTable {...baseProps} isError error={new Error('Failed to load user list')} onRetry={onRetry} />)
    expect(error).toContain('Failed to load user list')
    expect(error).toContain('Retry')
    expect(error).not.toContain('No matching accounts found')

    const empty = renderToStaticMarkup(<UserTable {...baseProps} data={{ users: [], total: 0, page: 1, totalPages: 1 }} isError={false} onRetry={onRetry} />)
    expect(empty).toContain('No matching accounts found')
  })

  it('retains stale rows and shows retry feedback after a refetch error', () => {
    const onRetry = jest.fn()
    const tree = UserTable({ ...baseProps, data: staleData, isError: true, error: new Error('Failed to load user list'), onRetry })
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('admin@example.com')
    expect(html).toContain('Failed to load user list')
    expect(html).toContain('Retry')
    const retryButton = React.Children.toArray(tree.props.children).flatMap((child: any) => React.isValidElement(child) ? React.Children.toArray(child.props.children) : [])
      .find((child: any) => React.isValidElement(child) && child.props.children === 'Retry') as any
    expect(retryButton.props.onClick).toBe(onRetry)
  })

  it('does not call a stale empty result a successful search after a refetch error', () => {
    const html = renderToStaticMarkup(<UserTable {...baseProps} data={{ users: [], total: 0, page: 1, totalPages: 1 }} isError error={new Error('Failed to load user list')} onRetry={jest.fn()} />)
    expect(html).toContain('Failed to load user list')
    expect(html).not.toContain('No matching accounts found')
  })
})
