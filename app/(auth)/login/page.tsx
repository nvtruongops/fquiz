'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { LoginSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import type { AuthResponse, AuthUser } from '@/hooks/auth/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/core/utils/cn'
import { GoogleSignInButton } from '@/components/shared/auth/GoogleSignInButton'

function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

  // Handle URL params on client side only
  useEffect(() => {
    const reason = searchParams.get('reason')
    
    if (reason === 'account_banned') {
      toast.error('Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.')
    } else if (reason === 'session_expired') {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }

    // Parse callback URL
    const raw = searchParams.get('callbackUrl') || searchParams.get('redirect')
    if (raw) {
      let decoded = raw
      try { decoded = decodeURIComponent(decoded) } catch {}
      try { decoded = decodeURIComponent(decoded) } catch {}
      
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        setCallbackUrl(decoded)
      }
    }
  }, [searchParams, toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = LoginSchema.safeParse({ identifier, password })
    if (!result.success) {
      const identifierError = result.error.issues.find((i) => i.path[0] === 'identifier')?.message
      const passwordError = result.error.issues.find((i) => i.path[0] === 'password')?.message
      setErrors({ identifier: identifierError, password: passwordError })
      return
    }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      toast.success('Đăng nhập thành công! Đang chuyển hướng...')
      if (data.user) {
        queryClient.setQueryData<AuthResponse>(['auth-user'], { user: data.user })
      } else {
        await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      }
      router.push(callbackUrl || (data.role === 'admin' ? '/admin' : '/dashboard'))
      router.refresh()
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full relative group">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/20 to-[#A4C3A2]/20 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[32px] font-black text-slate-800 tracking-tight leading-tight">Đăng nhập</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Chào mừng bạn quay lại với FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Identifier Field */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-sm font-bold text-slate-700 ml-1">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative">
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="VD: you@example.com"
                className={cn(
                  "w-full rounded-2xl border-2 px-4 py-3.5 text-[15px] outline-none transition-all duration-300 font-medium",
                  errors.identifier 
                    ? "border-[#EF9A9A] bg-[#EF9A9A]/10 text-slate-900 placeholder:text-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10" 
                    : "border-white/80 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm"
                )}
              />
            </div>
            <AnimatePresence>
              {errors.identifier && (
                <motion.p 
                  initial={{ opacity: 0, maxHeight: 0, marginTop: 0 }}
                  animate={{ opacity: 1, maxHeight: 40, marginTop: 6 }}
                  exit={{ opacity: 0, maxHeight: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#dc2626] text-xs font-bold ml-1 overflow-hidden"
                >
                  {errors.identifier}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="password" className="text-sm font-bold text-slate-700">
                Mật khẩu
              </label>
              <Link href="/forgot-password" className="text-xs font-black text-[#5D7B6F] hover:text-[#4a6358] transition-colors">
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
                    ? "border-[#EF9A9A] bg-[#EF9A9A]/10 text-slate-900 placeholder:text-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10" 
                    : "border-white/80 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5D7B6F] transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, maxHeight: 0, marginTop: 0 }}
                  animate={{ opacity: 1, maxHeight: 40, marginTop: 6 }}
                  exit={{ opacity: 0, maxHeight: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[#dc2626] text-xs font-bold ml-1 overflow-hidden"
                >
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] hover:from-[#5D7B6F] hover:to-[#4A6359] text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-[#7BA090]/50 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-4"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin drop-shadow-sm" />
            ) : (
              <>
                <span className="tracking-wide drop-shadow-sm">Đăng nhập</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform drop-shadow-sm" />
              </>
            )}
          </motion.button>
        </form>

        <GoogleSignInButton callbackUrl={callbackUrl} />

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-slate-200/50">
          <p className="text-center text-slate-500 font-medium text-sm">
            Bạn chưa có tài khoản?{' '}
            <Link 
              href={callbackUrl ? `/register?redirect=${encodeURIComponent(callbackUrl)}` : '/register'}
              className="text-[#5D7B6F] font-black hover:text-[#4A6359] transition-colors hover:underline decoration-2 underline-offset-4"
            >
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/10 to-[#A4C3A2]/10 rounded-[2.5rem] blur-xl opacity-60" />
        <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-8 sm:p-10 shadow-lg">
          <div className="mb-8 text-center sm:text-left">
            <div className="h-8 w-40 bg-slate-200/50 animate-pulse rounded-lg mb-4" />
            <div className="h-4 w-60 bg-slate-200/50 animate-pulse rounded-md" />
          </div>
          <div className="space-y-6">
            <div className="h-14 bg-slate-100/50 animate-pulse rounded-2xl" />
            <div className="h-14 bg-slate-100/50 animate-pulse rounded-2xl" />
            <div className="h-14 bg-[#5D7B6F]/20 animate-pulse rounded-2xl mt-4" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
