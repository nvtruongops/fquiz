/**
 * Register page test
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('next/link', () => ({ default: ({ children }: any) => children }))
jest.mock('@/store/shared/toast-store', () => ({
  useToast: () => ({ toast: { success: jest.fn(), error: jest.fn() } }),
}))
jest.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: any) => children,
}))
jest.mock('@/lib/core/utils/cn', () => ({ cn: (...args: any[]) => args.join(' ') }))
jest.mock('@/components/shared/auth/AuthFormComponents', () => ({
  DevCodeAndRetryMessage: () => null,
}))

import RegisterPage from '../page'

describe('RegisterPage', () => {
  it('should be defined as a component', () => {
    expect(RegisterPage).toBeDefined()
    expect(typeof RegisterPage).toBe('function')
  })
})
