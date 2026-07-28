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
  const [btnWidth, setBtnWidth] = useState(340)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // Measure container width for Google GSI renderButton
  useEffect(() => {
    if (!containerRef.current) return
    const updateWidth = () => {
      if (containerRef.current) {
        const measured = containerRef.current.offsetWidth
        if (measured > 0) {
          setBtnWidth(Math.min(Math.max(measured, 200), 400))
        }
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!clientId) return

    const scriptId = 'google-gsi-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const initializeGsi = () => {
      if (window.google?.accounts?.id) {
        if (!isInitializedRef.current) {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          const queryParam = callbackUrl ? '?callbackUrl=' + encodeURIComponent(callbackUrl) : ''
          const loginUri = `${origin}/api/auth/google${queryParam}`

          window.google.accounts.id.initialize({
            client_id: clientId,
            ux_mode: 'redirect',
            login_uri: loginUri,
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
            width: String(btnWidth),
            text: 'signin_with',
            shape: 'rectangular',
            locale: 'vi',
            logo_alignment: 'center',
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
  }, [clientId, callbackUrl, btnWidth])

  if (!clientId) {
    return null
  }

  return (
    <div className={className}>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80" />
        </div>
        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
          <span className="bg-white/90 backdrop-blur-md px-3 text-slate-400">hoặc tiếp tục với</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full min-h-[44px] flex items-center justify-center"
      >
        {loading ? (
          <div className="w-full h-11 rounded-xl bg-white/95 border border-[#5D7B6F]/30 shadow-xs flex items-center justify-center gap-2.5 text-xs font-bold text-[#5D7B6F]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xác thực tài khoản Google...</span>
          </div>
        ) : (
          <div
            id="google-signin-btn-container"
            className="w-full flex justify-center items-center [&_iframe]:!w-full [&_iframe]:!max-w-full"
          />
        )}
      </div>
    </div>
  )
}
