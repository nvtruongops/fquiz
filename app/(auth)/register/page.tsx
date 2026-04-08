'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { RegisterSchema } from '@/lib/schemas'
import { useToast } from '@/lib/store/toast-store'

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
      const res = await fetch('/api/auth/register/send-code', {
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
      const res = await fetch('/api/auth/register', {
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
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return null
    if (p.length < 8) return { label: 'Quá ngắn', color: 'bg-red-400', width: 'w-1/4' }
    if (p.length < 10) return { label: 'Yếu', color: 'bg-orange-400', width: 'w-2/4' }
    if (!/[A-Z]/.test(p) || !/\d/.test(p)) return { label: 'Trung bình', color: 'bg-yellow-400', width: 'w-3/4' }
    return { label: 'Mạnh', color: 'bg-[#A4C3A2]', width: 'w-full' }
  })()

  let sendCodeLabel = 'Gửi mã'
  if (sendingCode) sendCodeLabel = 'Đang gửi...'
  else if (codeSent) sendCodeLabel = 'Gửi lại mã'

  if (success) {
    return (
      <div className="w-full text-center py-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/20 p-7">
          <div className="w-16 h-16 rounded-full bg-[#A4C3A2]/20 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-500">
            <ShieldCheck className="w-8 h-8 text-[#5D7B6F]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Đăng ký thành công!</h2>
          <p className="text-gray-500 font-medium">Chào mừng bạn mới. Đang chuẩn bị cho bạn đăng nhập…</p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#5D7B6F] animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-3xl shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/20 p-5 sm:p-6">
        <div className="mb-4 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[27px] font-extrabold text-gray-900 tracking-tight">Tạo tài khoản</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Bắt đầu hành trình chinh phục kiến thức cùng FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-[13px] font-semibold text-gray-700 ml-1">
              Username
            </label>
            <div className="relative">
              <input
                id="username" name="username" type="text" autoComplete="username"
                value={form.username} onChange={handleChange}
                placeholder="nguyen_van_a"
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200
                  ${errors.username ? 'border-red-100 bg-red-50 focus:border-red-400' : 'border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
            </div>
            {errors.username && <p className="text-red-500 text-[11px] font-medium ml-1">{errors.username}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-gray-700 ml-1">
              Email
            </label>
            <div className="relative flex gap-2">
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange}
                placeholder="you@email.com"
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200
                  ${errors.email ? 'border-red-100 bg-red-50 focus:border-red-400' : 'border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="shrink-0 rounded-2xl border-2 border-[#5D7B6F]/20 px-3 py-2.5 text-[13px] font-bold text-[#5D7B6F] hover:bg-[#5D7B6F]/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sendCodeLabel}
              </button>
            </div>
            {errors.email && <p className="text-red-500 text-[11px] font-medium ml-1">{errors.email}</p>}
            {retryAfterSec !== null && (
              <p className="text-[11px] font-medium text-amber-600 ml-1">Vui lòng thử lại sau {retryAfterSec} giây.</p>
            )}
            {devCode && (
              <p className="text-[11px] font-medium text-[#5D7B6F] ml-1">Mã test (dev): {devCode}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="verificationCode" className="text-[13px] font-semibold text-gray-700 ml-1">
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
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200 placeholder:tracking-normal ${form.verificationCode ? 'tracking-[0.12em]' : 'tracking-normal'}
                  ${errors.verificationCode ? 'border-red-100 bg-red-50 focus:border-red-400' : 'border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
            </div>
            {errors.verificationCode && <p className="text-red-500 text-[11px] font-medium ml-1">{errors.verificationCode}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-semibold text-gray-700 ml-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password} onChange={handleChange}
                placeholder="Tối thiểu 8 ký tự"
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 pr-10 text-[14px] outline-none transition-all duration-200
                  ${errors.password ? 'border-red-100 bg-red-50 focus:border-red-400' : 'border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5D7B6F]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordStrength && (
              <div className="px-1 pt-1 animate-in fade-in duration-300">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${passwordStrength.color} ${passwordStrength.width}`} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1.5 ml-0.5">{passwordStrength.label}</p>
              </div>
            )}
            {errors.password && <p className="text-red-500 text-[11px] font-medium ml-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-gray-700 ml-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                id="confirmPassword" name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword} onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200
                  ${errors.confirmPassword ? 'border-red-100 bg-red-50 focus:border-red-400' : 'border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}
                  ${form.confirmPassword && form.confirmPassword === form.password ? '!border-[#A4C3A2]' : ''}`}
              />
              {form.confirmPassword && form.confirmPassword === form.password && (
                <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D7B6F] animate-in zoom-in" />
              )}
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-[11px] font-medium ml-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-[#5D7B6F]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Đăng ký tài khoản</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-center text-gray-500 font-medium">
            Bạn đã có tài khoản rồi?{' '}
            <Link href="/login" className="text-[#5D7B6F] font-bold hover:underline decoration-2 underline-offset-4">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}


