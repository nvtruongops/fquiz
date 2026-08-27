"use client"

import * as React from "react"

export interface ToastMessage {
  id: string
  title?: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning'
}

type ToastListener = (toasts: ToastMessage[]) => void

let toasts: ToastMessage[] = []
const listeners = new Set<ToastListener>()

function emit() {
  listeners.forEach(l => l([...toasts]))
}

export function toast(msg: Omit<ToastMessage, 'id'> | string) {
  const id = Math.random().toString(36).substring(2, 9)
  const item: ToastMessage = typeof msg === 'string' 
    ? { id, description: msg, type: 'default' }
    : { id, ...msg }
  
  toasts = [...toasts, item]
  emit()

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    emit()
  }, 4000)
}

export function useToast() {
  const [items, setItems] = React.useState<ToastMessage[]>(toasts)

  React.useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return { toasts: items, toast }
}
