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
          const loginUri = `${origin}/api/auth/google${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`

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
  }, [clientId, callbackUrl, btnWidth, handleGoogleResponse])

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

      <div ref={containerRef} className="relative w-full min-h-[48px] flex items-center justify-center">
        {loading ? (
          <div className="w-full h-12 rounded-2xl bg-white/95 border border-[#5D7B6F]/30 shadow-xs flex items-center justify-center gap-2.5 text-xs font-bold text-[#5D7B6F]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xác thực tài khoản Google...</span>
          </div>
        ) : (
          <div className="relative w-full flex justify-center">
            {/* Styled Visual Google Button Matching Form Elements */}
            <div className="w-full h-12 rounded-2xl border-2 border-slate-200/90 hover:border-[#5D7B6F]/50 bg-white/90 hover:bg-white text-slate-800 font-bold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all duration-300 pointer-events-none">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </div>

            {/* Invisible Google Native GSI Button Overlaid for Native Security & OAuth Trigger */}
            <div
              id="google-signin-btn-container"
              className="absolute inset-0 w-full h-full opacity-0 overflow-hidden cursor-pointer flex justify-center [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!max-w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
