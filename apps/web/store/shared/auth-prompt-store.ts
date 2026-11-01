import { create } from 'zustand'

export interface AuthPromptOptions {
  title?: string
  description?: string
  titleKey?: string
  descriptionKey?: string
  featureNameKey?: string
  featureName?: string
  targetUrl?: string
  /** Open sign-in/register in a new tab so the current page (e.g. an active exam) is never unloaded. */
  newTab?: boolean
}

interface AuthPromptStore {
  isOpen: boolean
  title: string
  description: string
  titleKey: string
  descriptionKey: string
  featureNameKey: string
  featureName: string
  targetUrl: string
  newTab: boolean
  openAuthPrompt: (options?: AuthPromptOptions) => void
  closeAuthPrompt: () => void
}

export const useAuthPrompt = create<AuthPromptStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  titleKey: 'auth.signInRequired',
  descriptionKey: 'auth.useFeaturePrompt',
  featureNameKey: '',
  featureName: '',
  targetUrl: '',
  newTab: false,
  openAuthPrompt: (options = {}) =>
    set({
      isOpen: true,
      title: options.title || '',
      description: options.description || '',
      titleKey: options.titleKey || 'auth.signInRequired',
      descriptionKey: options.descriptionKey || 'auth.useFeaturePrompt',
      featureNameKey: options.featureNameKey || '',
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
    titleKey: 'auth.quizSessionExpired',
    descriptionKey: 'auth.quizSessionExpiredDescription',
    featureNameKey: 'auth.sessionFeature',
    targetUrl: '/dashboard',
    newTab: true,
  })
}
