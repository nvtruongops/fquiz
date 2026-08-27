'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export interface AppThemeProviderProps extends ThemeProviderProps {
  userTheme?: string | null
}

function ThemeSync({ userTheme }: { userTheme?: string | null }) {
  const { theme, setTheme } = useTheme()
  const lastSyncedKeyRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!userTheme) {
      lastSyncedKeyRef.current = null
      return
    }

    if (
      ['light', 'dark', 'green', 'pink'].includes(userTheme) &&
      lastSyncedKeyRef.current !== userTheme
    ) {
      lastSyncedKeyRef.current = userTheme
      if (theme !== userTheme) {
        setTheme(userTheme)
      }
    }
  }, [userTheme, theme, setTheme])

  return null
}

export function ThemeProvider({ children, userTheme, ...props }: AppThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'green', 'pink']}
      {...props}
    >
      <ThemeSync userTheme={userTheme} />
      {children}
    </NextThemesProvider>
  )
}

export { useTheme }
