import { create } from 'zustand'

export interface AuthPromptOptions {
  title?: string
  description?: string
  featureName?: string
  targetUrl?: string
  /** Open sign-in/register in a new tab so the current page (e.g. an active exam) is never unloaded. */
  newTab?: boolean
}

interface AuthPromptStore {
  isOpen: boolean
  title: string
  description: string
  featureName: string
  targetUrl: string
  newTab: boolean
  openAuthPrompt: (options?: AuthPromptOptions) => void
  closeAuthPrompt: () => void
}

const DEFAULT_TITLE = 'Sign In Required'
const DEFAULT_DESC =
  'Please sign in or create an account to use this feature, track your study progress, and personalize your learning experience.'

export const useAuthPrompt = create<AuthPromptStore>((set) => ({
  isOpen: false,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESC,
  featureName: '',
  targetUrl: '',
  newTab: false,
  openAuthPrompt: (options = {}) =>
    set({
      isOpen: true,
      title: options.title || DEFAULT_TITLE,
      description: options.description || DEFAULT_DESC,
      featureName: options.featureName || '',
      targetUrl: options.targetUrl || '/dashboard',
      newTab: options.newTab ?? false,
    }),
  closeAuthPrompt: () =>
    set({
      isOpen: false,
    }),
}))

/**
 * In-place re-auth for quiz sessions (HTTP 401). Never navigates away from the
 * session page: sign-in opens in a new tab so in-memory answers and timer survive.
 */
export function promptSessionReauth(): void {
  useAuthPrompt.getState().openAuthPrompt({
    title: 'Session Expired',
    description:
      'Your answers on this page are kept. Sign in again in the new tab, then come back here and retry.',
    featureName: 'Session',
    targetUrl: '/dashboard',
    newTab: true,
  })
}
