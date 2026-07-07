'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { RegisterSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/core/utils/cn'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', verificationCode: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)

  // Get callback URL from query params
  function getCallbackUrl() {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return redirect
    }
    return null
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
  }

  async function handleSendCode() {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
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
    if (p.length < 8) return { label: 'Quá ngắn', color: 'bg-red-400', level: 1 }
    if (p.length < 10) return { label: 'Yếu', color: 'bg-orange-400', level: 2 }
    if (!/[A-Z]/.test(p) || !/\d/.test(p)) return { label: 'Trung bình', color: 'bg-yellow-400', level: 3 }
    return { label: 'Mạnh', color: 'bg-[#166534]', level: 4 } // Success foreground from ui-colors.md
  })()

  let sendCodeLabel = 'Gửi mã'
  if (sendingCode) sendCodeLabel = 'Đang gửi...'
  else if (codeSent) sendCodeLabel = 'Gửi lại mã'

  if (success) {
    return (
      <div className="w-full text-center py-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/60 p-10"
        >
          <div className="w-20 h-20 rounded-full bg-[#B0D4B8]/50 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-10 h-10 text-[#166534]" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Đăng ký thành công!</h2>
          <p className="text-slate-500 font-medium">Chào mừng bạn mới. Hệ thống đang tự động đăng nhập…</p>
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin drop-shadow-sm" />
          </div>
        </motion.div>
      </div>
    )
  }

  const inputClasses = (error?: string) => cn(
    "w-full rounded-2xl border-2 px-4 py-3 text-[14px] outline-none transition-all duration-300 font-medium",
    error 
      ? "border-[#EF9A9A] bg-[#EF9A9A]/10 text-slate-900 placeholder:text-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10" 
      : "border-white/80 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm"
  )

  const ErrorMsg = ({ msg }: { msg?: string }) => (
    <AnimatePresence>
      {msg && (
        <motion.p 
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="text-[#dc2626] text-xs font-bold ml-1"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  )

  return (
    <div className="w-full relative group">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/20 to-[#A4C3A2]/20 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[32px] font-black text-slate-800 tracking-tight leading-tight">Tạo tài khoản</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Bắt đầu hành trình chinh phục kiến thức cùng FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="username" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
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
            <ErrorMsg msg={errors.username} />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
              Email
            </label>
            <div className="relative flex gap-2">
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange}
                placeholder="you@email.com"
                className={inputClasses(errors.email)}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="shrink-0 rounded-2xl bg-white border border-[#5D7B6F]/30 px-4 py-2 text-sm font-bold text-[#5D7B6F] hover:bg-[#5D7B6F]/5 hover:border-[#5D7B6F]/50 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed w-[110px] flex justify-center items-center"
              >
                {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : sendCodeLabel}
              </motion.button>
            </div>
            <ErrorMsg msg={errors.email} />
            <AnimatePresence>
              {retryAfterSec !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-[#d97706] ml-1 mt-1">
                  Vui lòng thử lại sau {retryAfterSec} giây.
                </motion.p>
              )}
              {devCode && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-[#5D7B6F] ml-1 mt-1">
                  Mã test (dev): {devCode}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Verification Code */}
          <div className="space-y-1">
            <label htmlFor="verificationCode" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
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
                placeholder="Nhập mã 6 chữ số"
                className={cn(
                  inputClasses(errors.verificationCode),
                  "placeholder:tracking-normal font-mono",
                  form.verificationCode ? "tracking-[0.2em] text-lg py-2.5" : "tracking-normal"
                )}
              />
            </div>
            <ErrorMsg msg={errors.verificationCode} />
          </div>

            </div>
            <div className="space-y-4 flex flex-col justify-end">
          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password} onChange={handleChange}
                placeholder="Tối thiểu 8 ký tự"
                className={cn(inputClasses(errors.password), "pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5D7B6F] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Segmented Password Strength */}
            <AnimatePresence>
              {passwordStrength && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="px-1 pt-2 pb-1 overflow-hidden"
                >
                  <div className="flex gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className="flex-1 rounded-full bg-slate-200 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: passwordStrength.level >= level ? '100%' : '0%' }}
                          transition={{ duration: 0.3 }}
                          className={cn("h-full rounded-full", passwordStrength.color)} 
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 ml-1">
                    Mức độ: <span className={cn("transition-colors", passwordStrength.level === 4 ? "text-[#166534]" : "")}>{passwordStrength.label}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <ErrorMsg msg={errors.password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
              Xác nhận mật khẩu
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
                  form.confirmPassword && form.confirmPassword === form.password ? '!border-[#166534] !bg-[#B0D4B8]/10' : ''
                )}
              />
              <AnimatePresence>
                {form.confirmPassword && form.confirmPassword === form.password && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-5 h-5 text-[#166534]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ErrorMsg msg={errors.confirmPassword} />
          </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] hover:from-[#5D7B6F] hover:to-[#4A6359] text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-[#7BA090]/50 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-6"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin drop-shadow-sm" />
            ) : (
              <>
                <span className="tracking-wide drop-shadow-sm">Đăng ký tài khoản</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform drop-shadow-sm" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200/50">
          <p className="text-center text-slate-500 font-medium text-sm">
            Bạn đã có tài khoản rồi?{' '}
            <Link 
              href={`/login${getCallbackUrl() ? `?redirect=${encodeURIComponent(getCallbackUrl()!)}` : ''}`}
              className="text-[#5D7B6F] font-black hover:text-[#4A6359] transition-colors hover:underline decoration-2 underline-offset-4"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
