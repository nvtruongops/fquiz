'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { clearAllUserCache } from '@/lib/core/utils/cache-invalidation'
import { startGlobalPageLoader, finishGlobalPageLoader } from '@/components/shared/ui/page-transition-loader'

export function useLogout() {
  const queryClient = useQueryClient()

  const handleLogout = useCallback(async (redirectUrl: string = '/login') => {
    // Trigger the single SHARED PageTransitionLoader
    startGlobalPageLoader('ĐANG ĐĂNG XUẤT...', 'Đang dọn dẹp phiên làm việc • Closing Session')

    const startTime = Date.now()

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, {
        method: 'POST',
      })
      clearAllUserCache(queryClient)
    } catch (e) {
      console.error('Logout error', e)
    }

    const elapsed = Date.now() - startTime
    const remainingDelay = Math.max(0, 1000 - elapsed)

    setTimeout(() => {
      finishGlobalPageLoader()
      setTimeout(() => {
        globalThis.location.href = redirectUrl
      }, 500)
    }, remainingDelay)
  }, [queryClient])

  return { handleLogout }
}
