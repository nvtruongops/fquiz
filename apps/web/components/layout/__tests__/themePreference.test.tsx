import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { MobileNav } from '../MobileNav'
import { UserDropdown } from '../UserDropdown'

const mockSetTheme = jest.fn((theme: string) => {
  mockCurrentTheme = theme
})
const mockSetQueryData = jest.fn()
const mockInvalidateQueries = jest.fn()
const mockToastError = jest.fn()
let mockCurrentTheme = 'light'
let mockFetch: jest.Mock

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('next-themes', () => ({ useTheme: () => ({ theme: mockCurrentTheme, setTheme: mockSetTheme }) }))
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: mockSetQueryData, invalidateQueries: mockInvalidateQueries }),
}))
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { error: mockToastError } }) }))
jest.mock('@/lib/core/security/csrf', () => ({ withCsrfHeaders: (headers: Record<string, string>) => headers }))
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => ({ handleLogout: jest.fn() }) }))
jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('next/link', () => ({ __esModule: true, default: jest.fn(() => null) }))
jest.mock('next/dynamic', () => jest.fn(() => () => null))

function findNode(node: any, predicate: (candidate: any) => boolean): any {
  if (!node || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNode(child, predicate)
      if (match) return match
    }
    return undefined
  }
  if (predicate(node)) return node
  return findNode(node.props?.children, predicate)
}

function nodeText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(' ')
  return nodeText(node?.props?.children)
}

function renderUserDropdownHandler() {
  const tree = renderHook(() => UserDropdown({ user: { name: 'Learner', role: 'student' } }))
  const label = (theme: string) => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    if (theme === 'green') return 'Green Theme'
    if (theme === 'pink') return 'Pink Theme'
    throw new Error(`Unsupported theme: ${theme}`)
  }
  return (theme: string) => {
    const item = findNode(tree, (node) => typeof node.props?.onClick === 'function' && nodeText(node).includes(label(theme)))
    if (!item) throw new Error(`Could not find the ${theme} theme menu item`)
    return item.props.onClick() as Promise<void>
  }
}

function renderMobileNavHandler() {
  const tree = renderHook(() => MobileNav({ user: { name: 'Learner', role: 'student' } }))
  const sheet = findNode(tree, (node) => typeof node.props?.onThemeChange === 'function')
  if (!sheet) throw new Error('Could not find the mobile theme handler')
  return sheet.props.onThemeChange as (theme: string) => Promise<void>
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

async function changeTheme(handler: (theme: string) => Promise<void>, theme: string) {
  await handler(theme)
  await Promise.resolve()
}

function testThemeHandler(label: string, renderHandler: () => (theme: string) => Promise<void>) {
  describe(`${label} theme preference`, () => {
    beforeEach(() => {
      resetHooks()
      mockCurrentTheme = 'light'
      mockSetTheme.mockClear()
      mockSetQueryData.mockReset()
      mockInvalidateQueries.mockReset()
      mockToastError.mockReset()
      mockFetch = jest.fn()
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, themePreference: 'dark', theme: 'dark' }) })
      globalThis.fetch = mockFetch as any
      ;(globalThis as any).window = { matchMedia: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })) }
    })

    it('does nothing when the selected theme is already active', async () => {
      await changeTheme(renderHandler(), 'light')

      expect(mockSetTheme).not.toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends one theme PUT without invalidating the auth-user query', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, themePreference: 'dark', theme: 'dark' }) })

      await changeTheme(renderHandler(), 'dark')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/user/theme', expect.objectContaining({ method: 'PUT' }))
      expect(mockInvalidateQueries).not.toHaveBeenCalled()
    })

    it('merges the returned theme into the existing auth-user cache', async () => {
      const current = { user: { name: 'Learner', email: 'learner@example.com', role: 'student', avatarUrl: '/avatar.png' }, banned: false }
      let updated: unknown
      mockSetQueryData.mockImplementation((_key, updater) => { updated = updater(current) })
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, themePreference: 'pink', theme: 'pink' }) })

      await changeTheme(renderHandler(), 'dark')

      expect(mockSetQueryData).toHaveBeenCalledWith(['auth-user'], expect.any(Function))
      expect(updated).toEqual({
        user: { ...current.user, themePreference: 'pink', theme_preference: 'pink' },
        banned: false,
      })
    })

    it('rolls back the optimistic theme and shows an error toast on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 })

      await changeTheme(renderHandler(), 'dark')

      expect(mockSetTheme.mock.calls.map(([theme]) => theme)).toEqual(['dark', 'light'])
      expect(mockToastError).toHaveBeenCalledTimes(1)
      expect(mockSetQueryData).not.toHaveBeenCalled()
    })

    it('ignores a stale response after a newer theme selection', async () => {
      const first = deferred<any>()
      const second = deferred<any>()
      mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

      const saveDark = changeTheme(renderHandler(), 'dark')
      const savePink = changeTheme(renderHandler(), 'pink')
      first.resolve({ ok: true, json: async () => ({ success: true, themePreference: 'dark', theme: 'dark' }) })
      await saveDark

      expect(mockSetQueryData).not.toHaveBeenCalled()
      expect(mockSetTheme.mock.calls.map(([theme]) => theme)).toEqual(['dark', 'pink'])

      second.resolve({ ok: true, json: async () => ({ success: true, themePreference: 'pink', theme: 'pink' }) })
      await savePink

      expect(mockSetQueryData).toHaveBeenCalledTimes(1)
      expect(mockToastError).not.toHaveBeenCalled()
      expect(mockSetTheme.mock.calls.map(([theme]) => theme)).toEqual(['dark', 'pink'])
    })
  })
}

describe('theme preference handlers', () => {
  testThemeHandler('UserDropdown', renderUserDropdownHandler)
  testThemeHandler('MobileNav', renderMobileNavHandler)
})
