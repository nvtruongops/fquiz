/**
 * Forgot Password page test
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('next/link', () => ({ default: ({ children }: any) => children }))
jest.mock('@/store/shared/toast-store', () => ({
  useToast: () => ({ toast: { success: jest.fn(), error: jest.fn() } }),
}))
jest.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', form: 'form' },
  AnimatePresence: ({ children }: any) => children,
}))
jest.mock('@/lib/core/utils/cn', () => ({ cn: (...args: any[]) => args.join(' ') }))
jest.mock('@/components/shared/auth/AuthFormComponents', () => ({
  DevCodeAndRetryMessage: () => null,
}))

import ForgotPasswordPage from '../page'

describe('ForgotPasswordPage', () => {
  it('should be defined as a component', () => {
    expect(ForgotPasswordPage).toBeDefined()
    expect(typeof ForgotPasswordPage).toBe('function')
  })
})
