'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { WifiOff } from 'lucide-react'
import { useTranslations } from '@fquiz/ui/i18n'

export function NetworkStatusNotification() {
  const { toast } = useToast()
  const t = useTranslations()
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOffline = () => {
      setIsOffline(true)
      toast.warning(
        t('network.offlineMessage'),
        {
          title: t('network.offlineTitle'),
          duration: 10000,
        }
      )
    }

    const handleOnline = () => {
      setIsOffline(false)
      toast.success(t('network.onlineMessage'), {
        title: t('network.onlineTitle'),
        duration: 4000,
      })
    }

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [toast, t])

  if (!isOffline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-3 inset-x-0 mx-auto w-fit max-w-[92vw] px-4 py-2 rounded-full bg-amber-500/95 text-white backdrop-blur-xl shadow-xl border border-amber-400/40 flex items-center gap-2.5 z-[120] text-xs font-black tracking-tight animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" aria-hidden="true" />
      <span>{t('network.offlineBanner')}</span>
    </div>
  )
}
