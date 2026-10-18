import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { MobileNavExamSheet } from '../MobileNavExamSheet'
import { MobileNavUserSheet } from '../MobileNavUserSheet'

const mockOpenAuthPrompt = jest.fn()
jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('@/store/shared/auth-prompt-store', () => ({ useAuthPrompt: () => ({ openAuthPrompt: mockOpenAuthPrompt }) }))

describe('mobile sheet close focus', () => {
  beforeEach(() => {
    resetHooks()
    jest.clearAllMocks()
  })

  it('restores focus to the practice trigger after closing', () => {
    const focus = jest.fn()
    const onClose = jest.fn()
    const dialog = renderHook(() => MobileNavExamSheet({
      open: true,
      pathname: '/explore',
      onClose,
      triggerRef: { current: { focus, getClientRects: () => [{}] } } as any,
    })) as any

    dialog.props.onOpenChange(false)
    const preventDefault = jest.fn()
    dialog.props.children.props.onCloseAutoFocus({ preventDefault })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('leaves focus for the auth prompt when guest history opens it', () => {
    const focus = jest.fn()
    const onClose = jest.fn()
    const dialog = renderHook(() => MobileNavExamSheet({
      open: true,
      pathname: '/explore',
      onClose,
      triggerRef: { current: { focus, getClientRects: () => [{}] } } as any,
    })) as any
    const historyLink = dialog.props.children.props.children[2].props.children[1]
    const preventNavigation = jest.fn()

    historyLink.props.onClick({ preventDefault: preventNavigation })
    dialog.props.children.props.onCloseAutoFocus({ preventDefault: jest.fn() })

    expect(preventNavigation).toHaveBeenCalledTimes(1)
    expect(mockOpenAuthPrompt).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(focus).not.toHaveBeenCalled()
  })

  it('restores focus to the account trigger after closing', () => {
    const focus = jest.fn()
    const onClose = jest.fn()
    const dialog = renderHook(() => MobileNavUserSheet({
      open: true,
      user: null,
      mounted: true,
      onThemeChange: jest.fn(),
      onLogout: jest.fn(),
      onClose,
      triggerRef: { current: { focus, getClientRects: () => [{}] } } as any,
    })) as any

    dialog.props.onOpenChange(false)
    dialog.props.children.props.onCloseAutoFocus({ preventDefault: jest.fn() })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('moves practice focus to visible desktop navigation after a breakpoint change', () => {
    const mobileFocus = jest.fn()
    const desktopFocus = jest.fn()
    const previousDocument = global.document
    global.document = { querySelector: jest.fn(() => ({ focus: desktopFocus })) } as any
    try {
      const dialog = renderHook(() => MobileNavExamSheet({
        open: true,
        pathname: '/explore',
        onClose: jest.fn(),
        triggerRef: { current: { focus: mobileFocus, getClientRects: () => [] } } as any,
      })) as any

      dialog.props.children.props.onCloseAutoFocus({ preventDefault: jest.fn() })

      expect(mobileFocus).not.toHaveBeenCalled()
      expect(desktopFocus).toHaveBeenCalledTimes(1)
    } finally {
      global.document = previousDocument
    }
  })

  it('moves account focus to visible desktop navigation after a breakpoint change', () => {
    const mobileFocus = jest.fn()
    const desktopFocus = jest.fn()
    const previousDocument = global.document
    global.document = { querySelector: jest.fn(() => ({ focus: desktopFocus })) } as any
    try {
      const dialog = renderHook(() => MobileNavUserSheet({
        open: true,
        user: null,
        mounted: true,
        onThemeChange: jest.fn(),
        onLogout: jest.fn(),
        onClose: jest.fn(),
        triggerRef: { current: { focus: mobileFocus, getClientRects: () => [] } } as any,
      })) as any

      dialog.props.children.props.onCloseAutoFocus({ preventDefault: jest.fn() })

      expect(mobileFocus).not.toHaveBeenCalled()
      expect(desktopFocus).toHaveBeenCalledTimes(1)
    } finally {
      global.document = previousDocument
    }
  })
})
