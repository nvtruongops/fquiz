import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  toast: {
    success: (message: string) => void
    error: (error: any) => void
    info: (message: string) => void
  }
  removeToast: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  toast: {
    success: (message: string) => {
      const id = Math.random().toString(36).substring(2, 9)
      set((state) => ({
        toasts: [...state.toasts, { id, message, type: 'success' }],
      }))
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, 5000)
    },
    error: (error: any) => {
      const id = Math.random().toString(36).substring(2, 9)
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra, vui lòng thử lại'
      set((state) => ({
        toasts: [...state.toasts, { id, message, type: 'error' }],
      }))
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, 5000)
    },
    info: (message: string) => {
      const id = Math.random().toString(36).substring(2, 9)
      set((state) => ({
        toasts: [...state.toasts, { id, message, type: 'info' }],
      }))
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, 5000)
    },
  },
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
