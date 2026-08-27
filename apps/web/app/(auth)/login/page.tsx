'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { LoginSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import type { AuthResponse, AuthUser } from '@/hooks/auth/useAuth'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/core/utils/cn'
import { GoogleSignInButton } from '@/components/shared/auth/GoogleSignInButton'
import { startGlobalPageLoader } from '@/components/shared/ui/page-transition-loader'

function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

  // GSAP Entrance animation with reduced motion support
  useGSAP(
    () => {
      if (!cardRef.current) return
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          cardRef.current,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
        )
      })
    },
    { scope: cardRef }
  )

  // Handle URL params on client side only
  useEffect(() => {
    const error = searchParams.get('error')
    const reason = searchParams.get('reason')
    const message = searchParams.get('message')

    if (error) {
      toast.error(decodeURIComponent(error))
    } else if (reason === 'account_banned') {
      toast.error('Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.')
    } else if (reason === 'session_expired') {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    } else if (message === 'deletion_requested') {
      toast.info('Yêu cầu xóa tài khoản đã được ghi nhận. Vui lòng kiểm tra email để khôi phục tài khoản nếu muốn.')
    }

    // Parse callback URL
    const raw = searchParams.get('callbackUrl') || searchParams.get('redirect')
    if (raw) {
      let decoded = raw
      try { decoded = decodeURIComponent(decoded) } catch (_err) { /* ignore URI malformed */ }
      try { decoded = decodeURIComponent(decoded) } catch (_err) { /* ignore URI malformed */ }
      
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        const isAuthOrRoot = ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(decoded)
        if (!isAuthOrRoot) {
          setCallbackUrl(decoded)
        }
      }
    }
  }, [searchParams, toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = LoginSchema.safeParse({ identifier, password })
    if (!result.success) {
      const mapped: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!mapped[key]) mapped[key] = issue.message
      }
      setErrors(mapped as { identifier?: string; password?: string })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; role?: string; user?: AuthUser }

      if (!res.ok) {
        if (res.status === 403) {
          toast.error(data.error || 'Tài khoản đã bị khóa bởi quản trị viên.')
          return
        }

        if (res.status === 429) {
          toast.error(data.error || 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.')
          return
        }

        if (res.status >= 500) {
          toast.error('Hệ thống đang bận hoặc gặp lỗi. Vui lòng thử lại sau.')
          return
        }

        toast.error(data.error || 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.')
        return
      }

      toast.success('Đăng nhập thành công!')
      startGlobalPageLoader('THÀNH CÔNG!', 'Đang chuyển hướng...')
      setIsRedirecting(true)
      
      if (data.user) {
        queryClient.setQueryData<AuthResponse>(['auth-user'], { user: data.user })
      } else {
        await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['student'] })

      setTimeout(() => {
        if (data.role === 'admin') {
          const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://fquiz-admin.vercel.app/login'
          window.location.href = adminUrl
          return
        }

        router.push(callbackUrl || '/dashboard')
        router.refresh()
      }, 100)
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={cardRef} className="w-full relative group opacity-0">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[32px] font-black text-card-foreground tracking-tight leading-tight">Đăng nhập</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">Chào mừng bạn quay lại với FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Identifier Field */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-sm font-bold text-card-foreground ml-1">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative">
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email hoặc tên đăng nhập của bạn"
                className={cn(
                  "w-full rounded-2xl border-2 px-4 py-3.5 text-[15px] outline-none transition-all duration-300 font-medium",
                  errors.identifier 
                    ? "border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-4 focus:ring-destructive/10" 
                    : "border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs"
                )}
              />
            </div>
            {errors.identifier && (
              <p className="text-destructive text-xs font-bold ml-1 mt-1">
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="password" className="text-sm font-bold text-card-foreground">
                Mật khẩu
              </label>
              <Link href="/forgot-password" className="text-xs font-black text-primary hover:text-primary/90 transition-colors">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                className={cn(
                  "w-full rounded-2xl border-2 px-4 py-3.5 pr-12 text-[15px] outline-none transition-all duration-300 font-medium",
                  errors.password 
                    ? "border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-4 focus:ring-destructive/10" 
                    : "border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs font-bold ml-1 mt-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" />
            ) : (
              <>
                <span className="tracking-wide drop-shadow-2xs">Đăng nhập</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform drop-shadow-2xs" />
              </>
            )}
          </button>
        </form>

        <GoogleSignInButton callbackUrl={callbackUrl} text="Đăng nhập với Google" />

        {/* Footer Links */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs">
          <p className="text-muted-foreground font-medium">
            Chưa có tài khoản?{' '}
            <Link 
              href={callbackUrl ? `/register?redirect=${encodeURIComponent(callbackUrl)}` : '/register'}
              className="text-primary font-bold hover:underline"
            >
              Đăng ký
            </Link>
          </p>

          <a 
            href={process.env.NEXT_PUBLIC_ADMIN_URL || 'https://fquiz-admin.vercel.app/login'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-muted-foreground transition-colors inline-flex items-center gap-1 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
            Cổng Quản trị
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/10 rounded-[2.5rem] blur-xl opacity-60" />
        <div className="relative bg-card/70 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-lg">
          <div className="mb-8 text-center sm:text-left">
            <div className="h-8 w-40 bg-muted animate-pulse rounded-lg mb-4" />
            <div className="h-4 w-60 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-6">
            <div className="h-14 bg-muted animate-pulse rounded-2xl" />
            <div className="h-14 bg-muted animate-pulse rounded-2xl" />
            <div className="h-14 bg-primary/20 animate-pulse rounded-2xl mt-4" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
