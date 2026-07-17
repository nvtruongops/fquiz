'use client'

import { useState, useEffect } from 'react'

const ANIMATION_PREF_KEY = 'fquiz_enable_animation'

export function useAnimationPreference(initialValue: boolean = true) {
  const [enableAnimation, setEnableAnimationState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const saved = localStorage.getItem(ANIMATION_PREF_KEY)
      return saved !== null ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  const setEnableAnimation = (value: boolean | ((prev: boolean) => boolean)) => {
    setEnableAnimationState((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value
      try {
        localStorage.setItem(ANIMATION_PREF_KEY, JSON.stringify(nextValue))
      } catch (err) {
        console.error('Failed to save animation preference:', err)
      }
      return nextValue
    })
  }

  // Listen for storage changes across tabs or windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ANIMATION_PREF_KEY && e.newValue !== null) {
        try {
          setEnableAnimationState(JSON.parse(e.newValue))
        } catch {
          // ignore error
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return [enableAnimation, setEnableAnimation] as const
}
