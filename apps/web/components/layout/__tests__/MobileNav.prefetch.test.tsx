import Link from 'next/link'
import { MobileNav } from '../MobileNav'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('next/link', () => ({ __esModule: true, default: jest.fn(() => null) }))
jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: jest.fn() }) }))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { error: jest.fn() } }) }))
jest.mock('next/dynamic', () => jest.fn(() => () => null))
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => ({ handleLogout: jest.fn() }) }))

function findLinks(node: any): Array<{ href: string; prefetch?: boolean }> {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(findLinks)
  if (node.type === Link) return [node.props]
  return findLinks(node.props?.children)
}

describe('MobileNav route prefetching', () => {
  beforeEach(() => {
    resetHooks()
    ;(globalThis as any).window = { matchMedia: jest.fn(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) }
  })

  it('disables prefetch for Home, Classroom, and Community navigation links', () => {
    const nav = renderHook(() => MobileNav({ user: null }))
    const routeLinks = findLinks(nav)

    expect(routeLinks.map(({ href }) => href)).toEqual(['/', '/student/classrooms', '/community'])
    expect(routeLinks.every(({ prefetch }) => prefetch === false)).toBe(true)
  })
})
