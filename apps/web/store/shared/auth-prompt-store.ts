import { create } from 'zustand'

export interface AuthPromptOptions {
  title?: string
  description?: string
  featureName?: string
  targetUrl?: string
}

interface AuthPromptStore {
  isOpen: boolean
  title: string
  description: string
  featureName: string
  targetUrl: string
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
  openAuthPrompt: (options = {}) =>
    set({
      isOpen: true,
      title: options.title || DEFAULT_TITLE,
      description: options.description || DEFAULT_DESC,
      featureName: options.featureName || '',
      targetUrl: options.targetUrl || '/dashboard',
    }),
  closeAuthPrompt: () =>
    set({
      isOpen: false,
    }),
}))
