'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { LoginSchema } from '@/lib/schemas'
import { useToast } from '@/lib/store/toast-store'

function parseSafeCallbackUrl(search: string) {
  // Support both 'callbackUrl' and 'redirect' params
  const params = new URLSearchParams(search)
  const raw = params.get('callbackUrl') || params.get('redirect')
  if (!raw) return null

  // Support previously double-encoded callback values, e.g. %252Fadmin.
  let decoded = raw
  try { decoded = decodeURIComponent(decoded) } catch {}
  try { decoded = decodeURIComponent(decoded) } catch {}

  if (!decoded.startsWith('/')) return null
  if (decoded.startsWith('//')) return null
  return decoded
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  // Show message based on URL params
  useState(() => {
    const params = new URLSearchParams(globalThis.location?.search || '')
    const reason = params.get('reason')
    
    if (reason === 'account_banned') {
      toast.error('Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.')
    } else if (reason === 'session_expired') {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
  })

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
      const data = (await res.json().catch(() => ({}))) as { error?: string; role?: string }

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
      const callbackUrl = parseSafeCallbackUrl(globalThis.location.search)
      router.push(callbackUrl || (data.role === 'admin' ? '/admin' : '/dashboard'))
      router.refresh()
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-3xl shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/20 p-6 sm:p-7">
        <div className="mb-7 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-gray-900 tracking-tight">Đăng nhập</h1>
          <p className="text-gray-500 mt-1.5 text-sm font-medium">Chào mừng bạn quay lại với hệ thống FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4.5">
          {/* Identifier Field */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-semibold text-gray-700 ml-1">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative group">
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="VD: you@example.com"
                className={`w-full rounded-2xl border-2 px-4 py-3 text-[15px] outline-none transition-all duration-200
                  ${errors.identifier 
                    ? 'border-red-200 bg-red-50 focus:border-red-400' 
                    : 'border-gray-100 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
            </div>
            {errors.identifier && (
              <p className="text-red-500 text-xs font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.identifier}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Mật khẩu
              </label>
              <Link href="/forgot-password" className="text-xs font-bold text-[#5D7B6F] hover:text-[#4a6358] transition-colors">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative group">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                className={`w-full rounded-2xl border-2 px-4 py-3 pr-12 text-[15px] outline-none transition-all duration-200
                  ${errors.password 
                    ? 'border-red-200 bg-red-50 focus:border-red-400' 
                    : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5D7B6F] transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs font-medium ml-1 animate-in fade-in slide-in-from-left-1">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-[#5D7B6F]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-center text-gray-500 font-medium">
            Bạn chưa có tài khoản?{' '}
            <Link 
              href={`/register${parseSafeCallbackUrl(globalThis.location?.search || '') ? `?redirect=${encodeURIComponent(parseSafeCallbackUrl(globalThis.location?.search || '') || '')}` : ''}`}
              className="text-[#5D7B6F] font-bold hover:underline decoration-2 underline-offset-4"
            >
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
