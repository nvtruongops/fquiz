import { renderHook, resetHooks } from '../../../../test/hookHarness'
import { AdminSidebar } from '../AdminSidebar'

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../test/hookHarness').reactHooks }))
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

describe('admin mobile drawer focus', () => {
  beforeEach(() => {
    resetHooks()
    global.window = {
      matchMedia: () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
    } as any
  })

  it('focuses visible desktop navigation when the mobile trigger becomes hidden', () => {
    const mobileFocus = jest.fn()
    const desktopFocus = jest.fn()
    const previousDocument = global.document
    global.document = { querySelector: jest.fn(() => ({ focus: desktopFocus })) } as any
    try {
      const tree = renderHook(() => AdminSidebar({})) as any
      const mobileButton = tree.props.children[1].props.children[1]
      mobileButton.ref.current = { focus: mobileFocus, getClientRects: () => [] }
      const dialog = tree.props.children[2]

      dialog.props.children.props.onCloseAutoFocus({ preventDefault: jest.fn() })

      expect(mobileFocus).not.toHaveBeenCalled()
      expect(desktopFocus).toHaveBeenCalledTimes(1)
    } finally {
      global.document = previousDocument
    }
  })
})
