import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { useLoginForm } from '../useLoginForm'

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { error: jest.fn(), info: jest.fn() } }) }))
jest.mock('@gsap/react', () => ({ useGSAP: jest.fn() }))
jest.mock('@/components/shared/ui/page-transition-loader', () => ({ startGlobalPageLoader: jest.fn() }))

describe('useLoginForm validation focus', () => {
  beforeEach(() => resetHooks())

  it('focuses identifier before password when both fields are invalid', async () => {
    const identifier = { focus: jest.fn() }
    const password = { focus: jest.fn() }
    const form = renderHook(useLoginForm)
    const event = {
      preventDefault: jest.fn(),
      currentTarget: { elements: { namedItem: (name: string) => name === 'identifier' ? identifier : password } },
    } as unknown as React.FormEvent<HTMLFormElement>

    await form.handleSubmit(event)

    expect(identifier.focus).toHaveBeenCalledTimes(1)
    expect(password.focus).not.toHaveBeenCalled()
  })

  it('focuses password when identifier is valid', async () => {
    const identifier = { focus: jest.fn() }
    const password = { focus: jest.fn() }
    let form = renderHook(useLoginForm)
    form.setIdentifier('student@example.com')
    form = renderHook(useLoginForm)
    const event = {
      preventDefault: jest.fn(),
      currentTarget: { elements: { namedItem: (name: string) => name === 'identifier' ? identifier : password } },
    } as unknown as React.FormEvent<HTMLFormElement>

    await form.handleSubmit(event)

    expect(identifier.focus).not.toHaveBeenCalled()
    expect(password.focus).toHaveBeenCalledTimes(1)
  })
})
