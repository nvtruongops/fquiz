/**
 * @jest-environment node
 */
import { useQuizKeyboardNavigation } from '../useQuizKeyboardNavigation'

let focusedOptionState: number | null = null
const setFocusedOptionMock = jest.fn((val: any) => {
  if (typeof val === 'function') {
    focusedOptionState = val(focusedOptionState)
  } else {
    focusedOptionState = val
  }
})

jest.mock('react', () => {
  const original = jest.requireActual('react')
  return {
    ...original,
    useState: (initial: any) => [focusedOptionState ?? initial, setFocusedOptionMock],
    useRef: (initial: any) => ({ current: initial }),
    useEffect: (fn: any) => {
      try {
        fn()
      } catch {
        // ignore
      }
    },
  }
})

describe('useQuizKeyboardNavigation Hook Test Suite', () => {
  let listeners: Record<string, (e: any) => void> = {}

  beforeEach(() => {
    listeners = {}
    focusedOptionState = null
    jest.clearAllMocks()
    global.window = {
      addEventListener: jest.fn((event: string, cb: any) => {
        listeners[event] = cb
      }),
      removeEventListener: jest.fn((event: string) => {
        delete listeners[event]
      }),
    } as any
  })

  test('attaches keydown listener and handles ArrowDown and ArrowUp', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 0,
      totalQuestions: 5,
      optionCount: 4,
      disabled: false,
      onNavigate,
      onSelectOption,
    })

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    const handleKeyDown = listeners.keydown
    expect(handleKeyDown).toBeDefined()

    const preventDefault = jest.fn()
    handleKeyDown({ key: 'ArrowDown', preventDefault, target: {} })
    expect(preventDefault).toHaveBeenCalled()
    expect(setFocusedOptionMock).toHaveBeenCalled()
  })

  test('ignores direct letter A-D and number 1-4 keys (arrow keys only)', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 0,
      totalQuestions: 5,
      optionCount: 4,
      disabled: false,
      onNavigate,
      onSelectOption,
    })

    const handleKeyDown = listeners.keydown
    const preventDefault = jest.fn()

    // Test 'a' -> should NOT select option directly
    handleKeyDown({ key: 'a', preventDefault, target: {} })
    expect(onSelectOption).not.toHaveBeenCalled()

    // Test '3' -> should NOT select option directly
    handleKeyDown({ key: '3', preventDefault, target: {} })
    expect(onSelectOption).not.toHaveBeenCalled()
  })

  test('navigates to next question on ArrowRight', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 1,
      totalQuestions: 5,
      optionCount: 4,
      disabled: false,
      onNavigate,
      onSelectOption,
    })

    const handleKeyDown = listeners.keydown
    const preventDefault = jest.fn()

    handleKeyDown({ key: 'ArrowRight', preventDefault, target: {} })
    expect(onNavigate).toHaveBeenCalledWith(2)
  })

  test('allows arrow navigation when focused target is a checkbox input', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 1,
      totalQuestions: 5,
      optionCount: 4,
      disabled: false,
      onNavigate,
      onSelectOption,
    })

    const handleKeyDown = listeners.keydown
    const preventDefault = jest.fn()

    handleKeyDown({ key: 'ArrowRight', preventDefault, target: { tagName: 'INPUT', type: 'checkbox' } })
    expect(onNavigate).toHaveBeenCalledWith(2)
  })

  test('blocks arrow navigation when focused target is a text input', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 1,
      totalQuestions: 5,
      optionCount: 4,
      disabled: false,
      onNavigate,
      onSelectOption,
    })

    const handleKeyDown = listeners.keydown
    const preventDefault = jest.fn()

    handleKeyDown({ key: 'ArrowRight', preventDefault, target: { tagName: 'INPUT', type: 'text' } })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  test('allows ArrowLeft and ArrowRight navigation even when disabled is true (submitted question)', () => {
    const onNavigate = jest.fn()
    const onSelectOption = jest.fn()

    useQuizKeyboardNavigation({
      currentIndex: 1,
      totalQuestions: 5,
      optionCount: 4,
      disabled: true, // Submitted question
      onNavigate,
      onSelectOption,
    })

    const handleKeyDown = listeners.keydown
    const preventDefault = jest.fn()

    // ArrowRight should STILL navigate to question 2
    handleKeyDown({ key: 'ArrowRight', preventDefault, target: {} })
    expect(onNavigate).toHaveBeenCalledWith(2)

    setFocusedOptionMock.mockClear()

    // ArrowUp should NOT focus option when disabled
    handleKeyDown({ key: 'ArrowUp', preventDefault, target: {} })
    expect(setFocusedOptionMock).not.toHaveBeenCalled()
  })
})
