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

const DEFAULT_TITLE = 'Yêu cầu Đăng nhập'
const DEFAULT_DESC =
  'Vui lòng đăng nhập hoặc tạo tài khoản để sử dụng tính năng này, lưu trữ tiến độ ôn thi và cá nhân hóa trải nghiệm học tập của bạn.'

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
