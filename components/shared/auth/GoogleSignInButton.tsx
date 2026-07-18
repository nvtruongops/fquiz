'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { cn } from '@/lib/core/utils/cn'
import type { AuthResponse, AuthUser } from '@/hooks/auth/useAuth'

interface GoogleSignInButtonProps {
  callbackUrl?: string | null
  className?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (parent: HTMLElement, options: any) => void
          prompt: (notification?: any) => void
        }
      }
    }
  }
}

export function GoogleSignInButton({ callbackUrl, className }: GoogleSignInButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  const handleGoogleResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        toast.error('Không nhận được thông tin xác thực từ Google.')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ credential: response.credential }),
        })

        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          role?: string
          user?: AuthUser
        }

        if (!res.ok) {
          toast.error(data.error || 'Đăng nhập Google không thành công.')
          setLoading(false)
          return
        }

        toast.success('Đăng nhập Google thành công!')

        if (data.user) {
          queryClient.setQueryData<AuthResponse>(['auth-user'], { user: data.user })
        } else {
          await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
        }

        router.push(callbackUrl || (data.role === 'admin' ? '/admin' : '/dashboard'))
        router.refresh()
      } catch {
        toast.error('Có lỗi xảy ra khi kết nối tới máy chủ.')
        setLoading(false)
      }
    },
    [callbackUrl, queryClient, router, toast]
  )

  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!clientId) return

    // Load Google One Tap / GSI script dynamically
    const scriptId = 'google-gsi-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const initializeGsi = () => {
      if (window.google?.accounts?.id) {
        if (!isInitializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleResponse,
            auto_select: false,
          })
          isInitializedRef.current = true
        }

        const buttonContainer = document.getElementById('google-signin-btn-container')
        if (buttonContainer) {
          buttonContainer.innerHTML = ''
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            width: '360',
            text: 'signin_with',
            shape: 'pill',
            locale: 'vi',
          })
        }
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeGsi
      document.head.appendChild(script)
    } else {
      initializeGsi()
    }
  }, [clientId, handleGoogleResponse])

  if (!clientId) {
    return null
  }

  return (
    <div className={className}>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
          <span className="bg-white px-3 text-slate-400">hoặc tiếp tục với</span>
        </div>
      </div>

      <div className="min-h-[44px] relative flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2.5 rounded-full bg-white/95 border border-[#5D7B6F]/30 shadow-sm text-xs font-bold text-[#5D7B6F] backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xác thực tài khoản Google...</span>
          </div>
        )}
        <div
          id="google-signin-btn-container"
          className={cn('w-full flex justify-center min-h-[44px]', loading && 'opacity-30 pointer-events-none')}
        />
      </div>
    </div>
  )
}
