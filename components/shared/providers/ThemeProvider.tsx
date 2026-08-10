'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

import { useAuth } from '@/hooks/auth/useAuth'
import { useTheme } from 'next-themes'

function ThemeSync() {
  const { data: authData } = useAuth()
  const { theme, setTheme } = useTheme()
  const syncedUserThemeRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const userTheme = authData?.user?.themePreference || authData?.user?.theme_preference
    if (
      userTheme &&
      ['light', 'dark', 'green', 'pink'].includes(userTheme) &&
      syncedUserThemeRef.current !== userTheme &&
      theme !== userTheme
    ) {
      syncedUserThemeRef.current = userTheme
      setTheme(userTheme)
    }
  }, [authData?.user?.themePreference, authData?.user?.theme_preference, theme, setTheme])

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
