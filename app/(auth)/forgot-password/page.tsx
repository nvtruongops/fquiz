'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, Send, KeyRound } from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [done, setDone] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Vui lòng nhập đúng định dạng email')
      return
    }

    setSendingCode(true)
    setRetryAfterSec(null)
    setDevCode('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 429 && typeof data.retryAfterSec === 'number') {
        setRetryAfterSec(data.retryAfterSec)
        toast.error(`Bạn vừa gửi mã, vui lòng thử lại sau ${data.retryAfterSec}s`)
        return
      }

      if (res.status >= 500) {
        toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
        return
      }

      if (typeof data.dev_code === 'string') setDevCode(data.dev_code)

      setCodeSent(true)
      setVerified(false)
      toast.success('Nếu email tồn tại, mã xác thực đã được gửi.')
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setSendingCode(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()

    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Mã xác thực gồm 6 chữ số')
      return
    }

    setVerifyingCode(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: code.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Xác thực mã không thành công')
        return
      }

      setVerified(true)
      toast.success('Mã xác thực hợp lệ. Bạn có thể đặt mật khẩu mới.')
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setVerifyingCode(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()

    if (!verified) {
      toast.error('Vui lòng xác thực mã trước')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setResetting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim(), password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Đặt lại mật khẩu thất bại')
        return
      }

      setDone(true)
      toast.success('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.')
    } catch {
      toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
    } finally {
      setResetting(false)
    }
  }

  if (done) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/20 p-6 sm:p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-[#D7F9FA] flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-500">
            <Mail className="w-8 h-8 text-[#5D7B6F]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Đặt lại mật khẩu thành công</h2>
          <p className="text-gray-500 font-medium mb-6 max-w-[280px] mx-auto leading-relaxed">
            Mật khẩu của tài khoản <span className="text-gray-900 font-bold">{email}</span> đã được cập nhật.
          </p>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 text-sm text-[#5D7B6F] font-bold hover:text-[#4a6358] transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại đăng nhập</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-3xl shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/20 p-5 sm:p-6">
        <div className="mb-5 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[27px] font-extrabold text-gray-900 tracking-tight">Quên mật khẩu?</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Nhập email để nhận mã xác thực, sau đó đặt mật khẩu mới.
          </p>
        </div>

        <form onSubmit={handleSendCode} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-gray-700 ml-1">
              Email đăng ký
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200 border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10"
              />
            </div>
            {retryAfterSec !== null && (
              <p className="text-[11px] font-medium text-amber-600 ml-1">Vui lòng thử gửi lại sau {retryAfterSec} giây.</p>
            )}
            {devCode && (
              <p className="text-[11px] font-medium text-[#5D7B6F] ml-1">Mã test (dev): {devCode}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={sendingCode}
            className="group relative w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-[#5D7B6F]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {sendingCode ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{codeSent ? 'Gửi lại mã' : 'Gửi mã xác thực'}</span>
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {codeSent && (
          <form onSubmit={handleVerifyCode} noValidate className="space-y-3.5 mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-[13px] font-semibold text-gray-700 ml-1">
                Mã xác thực
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Nhập 6 chữ số"
                className={`w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200 border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 placeholder:tracking-normal ${code ? 'tracking-[0.12em]' : 'tracking-normal'}`}
              />
            </div>

            <button
              type="submit"
              disabled={verifyingCode || verified}
              className="group relative w-full flex items-center justify-center gap-2 bg-[#2f6f58] hover:bg-[#275c49] text-white font-bold py-2.5 rounded-2xl transition-all duration-300 shadow-md shadow-[#2f6f58]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {verifyingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{verified ? 'Mã đã xác thực' : 'Xác thực mã'}</span><KeyRound className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {verified && (
          <form onSubmit={handleResetPassword} noValidate className="space-y-3.5 mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-[13px] font-semibold text-gray-700 ml-1">
                Mật khẩu mới
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200 border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-gray-700 ml-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-2xl border-2 px-3.5 py-2.5 text-[14px] outline-none transition-all duration-200 border-gray-50 bg-gray-50/50 hover:border-gray-100 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10"
              />
            </div>

            <button
              type="submit"
              disabled={resetting}
              className="group relative w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold py-2.5 rounded-2xl transition-all duration-300 shadow-md shadow-[#5D7B6F]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}

        <div className="mt-5 pt-5 border-t border-gray-100">
          <Link
            href="/login"
            className="group flex items-center justify-center gap-2 text-sm text-gray-500 font-bold hover:text-[#5D7B6F] transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại trang đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


