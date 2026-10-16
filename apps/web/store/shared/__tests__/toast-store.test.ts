import { useToast } from '../toast-store'

// Mock setTimeout to avoid timers
jest.useFakeTimers()

describe('Toast Store', () => {
  beforeEach(() => {
    useToast.getState().clearToasts()
    jest.clearAllTimers()
  })

  it('should add a success toast', () => {
    useToast.getState().toast.success('Operation successful')
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Operation successful')
    expect(toasts[0].id).toMatch(/^toast-/)
  })

  it('should add an error toast with string message', () => {
    useToast.getState().toast.error('Something went wrong')
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('error')
    expect(toasts[0].message).toBe('Something went wrong')
  })

  it('should add an error toast with Error object', () => {
    useToast.getState().toast.error(new Error('Custom error'))
    const toasts = useToast.getState().toasts
    expect(toasts[0].message).toBe('Custom error')
  })

  it('should handle unknown error types with fallback message', () => {
    useToast.getState().toast.error(12345)
    const toasts = useToast.getState().toasts
    expect(toasts[0].message).toBe('An unexpected error occurred. Please try again.')
  })

  it('should add an info toast', () => {
    useToast.getState().toast.info('Info message')
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('info')
    expect(toasts[0].message).toBe('Info message')
  })

  it('should add a warning toast with options', () => {
    const onClick = jest.fn()
    useToast.getState().toast.warning('Warning message', {
      title: 'Warning',
      duration: 8000,
      action: { label: 'Retry', onClick },
    })
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('warning')
    expect(toasts[0].title).toBe('Warning')
    expect(toasts[0].duration).toBe(8000)
    expect(toasts[0].action?.label).toBe('Retry')
    toasts[0].action?.onClick()
    expect(onClick).toHaveBeenCalled()
  })

  it('should remove a toast by id', () => {
    useToast.getState().toast.success('Toast to remove')
    const toastId = useToast.getState().toasts[0].id
    useToast.getState().removeToast(toastId)
    expect(useToast.getState().toasts).toHaveLength(0)
  })

  it('should support multiple toasts up to MAX_TOASTS limit', () => {
    useToast.getState().toast.success('First')
    useToast.getState().toast.info('Second')
    useToast.getState().toast.error('Third')
    useToast.getState().toast.warning('Fourth')
    expect(useToast.getState().toasts).toHaveLength(4)

    // Adding 5th toast should keep maximum 4 (FIFO)
    useToast.getState().toast.info('Fifth')
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(4)
    expect(toasts[0].message).toBe('Second')
    expect(toasts[3].message).toBe('Fifth')
  })

  it('should deduplicate identical toasts within dedupe interval', () => {
    useToast.getState().toast.success('Duplicated message')
    useToast.getState().toast.success('Duplicated message')
    expect(useToast.getState().toasts).toHaveLength(1)
  })

  it('should auto-dismiss toast after duration expires', () => {
    useToast.getState().toast.info('Auto dismiss test', { duration: 3000 })
    expect(useToast.getState().toasts).toHaveLength(1)

    jest.advanceTimersByTime(3000)
    expect(useToast.getState().toasts).toHaveLength(0)
  })

  it('should clear all toasts with clearToasts()', () => {
    useToast.getState().toast.success('Toast 1')
    useToast.getState().toast.info('Toast 2')
    expect(useToast.getState().toasts).toHaveLength(2)

    useToast.getState().clearToasts()
    expect(useToast.getState().toasts).toHaveLength(0)
  })
})
