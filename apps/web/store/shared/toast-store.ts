import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title?: string
  duration?: number
  action?: ToastAction
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  title?: string
  duration?: number
  action?: ToastAction
  createdAt: number
}

export interface ToastStore {
  toasts: Toast[]
  toast: {
    success: (message: string, options?: ToastOptions) => string
    error: (error: any, options?: ToastOptions) => string
    info: (message: string, options?: ToastOptions) => string
    warning: (message: string, options?: ToastOptions) => string
  }
  removeToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_DURATION = 5000
const MAX_TOASTS = 4
const DEDUPE_INTERVAL_MS = 1500

let toastIdCounter = 0
const recentToasts = new Map<string, number>()

function addToastItem(
  set: any,
  get: any,
  type: ToastType,
  message: string,
  options?: ToastOptions
): string {
  const now = Date.now()
  const dedupeKey = `${type}:${message}`
  const lastTime = recentToasts.get(dedupeKey)

  // Deduplication check: prevent duplicate toasts within short window
  if (lastTime && now - lastTime < DEDUPE_INTERVAL_MS) {
    return ''
  }
  recentToasts.set(dedupeKey, now)

  // Clean old dedupe entries
  if (recentToasts.size > 50) {
    for (const [key, time] of recentToasts.entries()) {
      if (now - time > 10000) {
        recentToasts.delete(key)
      }
    }
  }

  const id = `toast-${++toastIdCounter}`
  const duration = typeof options?.duration === 'number' && options.duration > 0
    ? options.duration
    : DEFAULT_DURATION

  const newToast: Toast = {
    id,
    message,
    type,
    title: options?.title,
    duration,
    action: options?.action,
    createdAt: now,
  }

  set((state: ToastStore) => {
    const nextToasts = [...state.toasts, newToast]
    if (nextToasts.length > MAX_TOASTS) {
      return { toasts: nextToasts.slice(-MAX_TOASTS) }
    }
    return { toasts: nextToasts }
  })

  // Auto-dismiss timeout
  setTimeout(() => {
    get().removeToast(id)
  }, duration)

  return id
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  toast: {
    success: (message: string, options?: ToastOptions) => {
      return addToastItem(set, get, 'success', message, options)
    },
    error: (error: any, options?: ToastOptions) => {
      const message =
        typeof error === 'string'
          ? error
          : error?.message || 'An unexpected error occurred. Please try again.'
      return addToastItem(set, get, 'error', message, options)
    },
    info: (message: string, options?: ToastOptions) => {
      return addToastItem(set, get, 'info', message, options)
    },
    warning: (message: string, options?: ToastOptions) => {
      return addToastItem(set, get, 'warning', message, options)
    },
  },
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
  clearToasts: () => {
    set({ toasts: [] })
  },
}))
