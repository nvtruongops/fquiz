'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Link không hợp lệ</h2>
          <p className="text-sm text-gray-500 mb-4">Token đặt lại mật khẩu bị thiếu hoặc không hợp lệ.</p>
          <Link href="/forgot-password" className="text-sm text-[#5D7B6F] font-medium hover:underline">
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const errs: typeof errors = {}

    if (password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự'
    if (password !== confirm) errs.confirm = 'Mật khẩu xác nhận không khớp'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error ?? 'Có lỗi xảy ra')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setServerError('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#A4C3A2]/30 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#A4C3A2]/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#5D7B6F]" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đặt lại thành công!</h2>
          <p className="text-sm text-gray-500">Đang chuyển hướng đến trang đăng nhập…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-[#A4C3A2]/30 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Đặt lại mật khẩu</h1>
          <p className="text-sm text-gray-500 mt-1">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-[#5D7B6F]/30 focus:border-[#5D7B6F]
                  ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors
                focus:ring-2 focus:ring-[#5D7B6F]/30 focus:border-[#5D7B6F]
                ${errors.confirm ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
            />
            {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md bg-white rounded-2xl p-8 animate-pulse h-64" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
