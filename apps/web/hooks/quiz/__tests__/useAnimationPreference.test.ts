jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)

import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { useAnimationPreference } from '../useAnimationPreference'

describe('useAnimationPreference', () => {
  let originalWindow: typeof globalThis.window | undefined
  let originalLocalStorage: Storage | undefined
  let savedPreference: string | null

  beforeEach(() => {
    resetHooks()
    originalWindow = globalThis.window
    originalLocalStorage = globalThis.localStorage
    savedPreference = null
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    })
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => savedPreference,
        setItem: jest.fn(),
      },
    })
  })

  afterEach(() => {
    resetHooks()
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    } else {
      delete (globalThis as any).window
    }
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage })
    } else {
      delete (globalThis as any).localStorage
    }
  })

  it('defaults to lite motion when no preference is saved', () => {
    const [enabled] = renderHook(() => useAnimationPreference())

    expect(enabled).toBe(false)
  })

  it('preserves an explicitly saved animation preference', () => {
    savedPreference = 'true'

    const [enabled] = renderHook(() => useAnimationPreference())

    expect(enabled).toBe(true)
  })
})
