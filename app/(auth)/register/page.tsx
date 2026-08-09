'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react'
import { RegisterSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/core/utils/cn'
import { DevCodeAndRetryMessage } from '@/components/shared/auth/AuthFormComponents'
import { EMAIL_REGEX } from '@/lib/core/schemas/common'
import { GoogleSignInButton } from '@/components/shared/auth/GoogleSignInButton'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', verificationCode: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)

  // GSAP entrance animation
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      toast.error(decodeURIComponent(error))
    }
  }, [toast])

  function getCallbackUrl() {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('callbackUrl') || params.get('redirect')
    if (raw) {
      let decoded = raw
      try { decoded = decodeURIComponent(decoded) } catch {}
      try { decoded = decodeURIComponent(decoded) } catch {}
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        const isAuthOrRoot = ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(decoded)
        if (!isAuthOrRoot) {
          return decoded
        }
      }
    }
    return null
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
  }

  async function handleSendCode() {
    if (!form.email || !EMAIL_REGEX.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: 'Vui lòng nhập email hợp lệ trước khi gửi mã' }))
      return
    }

    setSendingCode(true)
    setRetryAfterSec(null)
    setDevCode('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/register/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 429 && typeof data.retryAfterSec === 'number') {
        setRetryAfterSec(data.retryAfterSec)
        toast.error(`Bạn vừa gửi mã, vui lòng thử lại sau ${data.retryAfterSec}s`)
        return
      }

      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Không thể gửi mã xác thực')
        return
      }

      setCodeSent(true)
      if (typeof data.dev_code === 'string') setDevCode(data.dev_code)
      toast.success('Mã xác thực đã được gửi đến email của bạn')
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setSendingCode(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = RegisterSchema.safeParse(form)
    if (!result.success) {
      const mapped: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!mapped[key]) mapped[key] = issue.message
      }
      setErrors(mapped)
      return
    }

    if (!/^\d{6}$/.test(form.verificationCode.trim())) {
      setErrors((prev) => ({ ...prev, verificationCode: 'Mã xác thực gồm 6 chữ số' }))
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          verificationCode: form.verificationCode.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Đăng ký không thành công. Thông tin tài khoản hoặc email không hợp lệ.')
        return
      }

      toast.success('Đăng ký thành công! Chào mừng bạn.')
      setSuccess(true)
      const callbackUrl = getCallbackUrl()
      setTimeout(() => router.push(callbackUrl || '/login'), 2000)
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return null
    if (p.length < 8) return { label: 'Quá ngắn', color: 'bg-destructive', level: 1 }
    if (p.length < 10) return { label: 'Yếu', color: 'bg-warning-fg', level: 2 }
    if (!/[A-Z]/.test(p) || !/\d/.test(p)) return { label: 'Trung bình', color: 'bg-warning-fg', level: 3 }
    return { label: 'Mạnh', color: 'bg-success-fg', level: 4 }
  })()

  let sendCodeLabel = 'Gửi mã'
  if (sendingCode) sendCodeLabel = 'Đang gửi'
  else if (codeSent) sendCodeLabel = 'Gửi lại'

  if (success) {
    return (
      <div className="w-full text-center py-6 sm:py-8">
        <div className="bg-card/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-border p-6 sm:p-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-success-fg" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-card-foreground mb-2 sm:mb-3 tracking-tight">Đăng ký thành công!</h2>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Chào mừng bạn mới. Hệ thống đang tự động đăng nhập…</p>
          <div className="mt-6 sm:mt-8 flex justify-center">
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-spin drop-shadow-2xs" />
          </div>
        </div>
      </div>
    )
  }

  const inputClasses = (error?: string) => cn(
    "w-full rounded-xl sm:rounded-2xl border-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[14px] outline-none transition-all duration-300 font-medium",
    error 
      ? "border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-2 focus:ring-destructive/10" 
      : "border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10 shadow-2xs"
  )

  return (
    <div ref={cardRef} className="w-full relative group opacity-0">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2rem] sm:rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] border border-border p-5 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-4 sm:mb-6 text-center sm:text-left">
          <h1 className="text-xl sm:text-[30px] font-black text-card-foreground tracking-tight leading-tight">Tạo tài khoản</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm font-medium">Bắt đầu hành trình chinh phục kiến thức cùng FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3 sm:space-y-4">
          {/* Email - Full Width */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-[11px] sm:text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
              Email
            </label>
            <div className="relative flex gap-2 items-center">
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange}
                placeholder="you@email.com"
                className={cn(inputClasses(errors.email), "flex-1 min-w-0")}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="shrink-0 rounded-xl sm:rounded-2xl bg-card border border-primary/30 px-2 sm:px-3 py-2 sm:py-2.5 text-xs font-bold text-primary hover:bg-primary/5 hover:border-primary/50 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed min-w-[65px] sm:min-w-[76px] flex justify-center items-center whitespace-nowrap cursor-pointer active:scale-95"
              >
                {sendingCode ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : sendCodeLabel}
              </button>
            </div>
            {errors.email && <p className="text-destructive text-[11px] sm:text-xs font-bold ml-1 mt-1">{errors.email}</p>}
            <DevCodeAndRetryMessage retryAfterSec={retryAfterSec} devCode={devCode} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Verification Code */}
            <div className="space-y-1">
              <label htmlFor="verificationCode" className="text-[11px] sm:text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Mã xác thực
              </label>
              <div className="relative">
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.verificationCode}
                  onChange={handleChange}
                  placeholder="Mã 6 số"
                  className={cn(
                    inputClasses(errors.verificationCode),
                    "placeholder:tracking-normal font-mono",
                    form.verificationCode ? "tracking-[0.15em] sm:tracking-[0.2em] text-sm sm:text-base font-black" : "tracking-normal"
                  )}
                />
              </div>
              {errors.verificationCode && <p className="text-destructive text-[11px] sm:text-xs font-bold ml-1 mt-1">{errors.verificationCode}</p>}
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label htmlFor="username" className="text-[11px] sm:text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <div className="relative">
                <input
                  id="username" name="username" type="text" autoComplete="username"
                  value={form.username} onChange={handleChange}
                  placeholder="nguyen_van_a"
                  className={inputClasses(errors.username)}
                />
              </div>
              {errors.username && <p className="text-destructive text-[11px] sm:text-xs font-bold ml-1 mt-1">{errors.username}</p>}
            </div>
          </div>

          {/* Password & Confirm Password Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-[11px] sm:text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password} onChange={handleChange}
                  placeholder="Tối thiểu 8 ký tự"
                  className={cn(inputClasses(errors.password), "pr-8 sm:pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Segmented Password Strength */}
              {passwordStrength && (
                <div className="px-0.5 pt-1.5 pb-0.5">
                  <div className="flex gap-1 h-1 sm:h-1.5 w-full">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className="flex-1 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-300", passwordStrength.level >= level ? passwordStrength.color : "w-0")} 
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 ml-0.5">
                    Độ mạnh: <span className={cn("transition-colors", passwordStrength.level === 4 ? "text-success-fg" : "")}>{passwordStrength.label}</span>
                  </p>
                </div>
              )}
              {errors.password && <p className="text-destructive text-[11px] sm:text-xs font-bold ml-1 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-[11px] sm:text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Xác nhận MK
              </label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="Nhập lại mật khẩu"
                  className={cn(
                    inputClasses(errors.confirmPassword),
                    form.confirmPassword && form.confirmPassword === form.password ? '!border-success-border !bg-success-bg/10' : ''
                  )}
                />
                {form.confirmPassword && form.confirmPassword === form.password && (
                  <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-success-fg" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && <p className="text-destructive text-[11px] sm:text-xs font-bold ml-1 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3 sm:py-3.5 text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-300 shadow-[0_6px_16px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-3 sm:mt-5 cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {loading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin drop-shadow-2xs" />
            ) : (
              <>
                <span className="tracking-wide drop-shadow-2xs">Đăng ký tài khoản</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform drop-shadow-2xs" />
              </>
            )}
          </button>
        </form>

        <GoogleSignInButton callbackUrl={getCallbackUrl()} />

        <div className="mt-3.5 sm:mt-5 pt-3 border-t border-border">
          {(() => {
            const cb = getCallbackUrl()
            const redirectParam = cb ? `?redirect=${encodeURIComponent(cb)}` : ''
            return (
              <p className="text-center text-muted-foreground font-medium text-xs sm:text-sm">
                Bạn đã có tài khoản rồi?{' '}
                <Link 
                  href={`/login${redirectParam}`}
                  className="text-primary font-black hover:text-primary/90 transition-colors hover:underline decoration-2 underline-offset-4"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
