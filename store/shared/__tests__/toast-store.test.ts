import { useToast } from '../toast-store'

// Mock setTimeout to avoid timers
jest.useFakeTimers()

describe('Toast Store', () => {
  beforeEach(() => {
    useToast.setState({ toasts: [] })
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
    expect(toasts[0].message).toBe('Có lỗi xảy ra, vui lòng thử lại')
  })

  it('should add an info toast', () => {
    useToast.getState().toast.info('Info message')
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('info')
    expect(toasts[0].message).toBe('Info message')
  })

  it('should remove a toast by id', () => {
    useToast.getState().toast.success('Toast to remove')
    const toastId = useToast.getState().toasts[0].id
    useToast.getState().removeToast(toastId)
    expect(useToast.getState().toasts).toHaveLength(0)
  })

  it('should support multiple toasts', () => {
    useToast.getState().toast.success('First')
    useToast.getState().toast.info('Second')
    useToast.getState().toast.error('Third')
    expect(useToast.getState().toasts).toHaveLength(3)
  })
})

