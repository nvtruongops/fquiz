'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

import { useAuth } from '@/hooks/auth/useAuth'
import { useTheme } from 'next-themes'

function ThemeSync() {
  const { data: authData } = useAuth()
  const { theme, setTheme } = useTheme()
  const lastSyncedKeyRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const userId = authData?.user?._id
    const userTheme = authData?.user?.themePreference || authData?.user?.theme_preference

    if (!userId || !userTheme) {
      lastSyncedKeyRef.current = null
      return
    }

    const syncKey = `${userId}:${userTheme}`
    if (
      ['light', 'dark', 'green', 'pink'].includes(userTheme) &&
      lastSyncedKeyRef.current !== syncKey
    ) {
      lastSyncedKeyRef.current = syncKey
      if (theme !== userTheme) {
        setTheme(userTheme)
      }
    }
  }, [authData?.user?._id, authData?.user?.themePreference, authData?.user?.theme_preference, theme, setTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
}
