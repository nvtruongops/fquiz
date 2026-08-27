'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, Send, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/core/utils/cn'
import { DevCodeAndRetryMessage } from '@/components/shared/auth/AuthFormComponents'
import { EMAIL_REGEX } from '@/lib/core/schemas/common'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [done, setDone] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resetting, setResetting] = useState(false)

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

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !EMAIL_REGEX.test(email)) {
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

      if (!res.ok) {
        if (res.status === 429) {
          if (typeof data.retryAfterSec === 'number') {
            setRetryAfterSec(data.retryAfterSec)
            toast.error(`Bạn vừa gửi mã, vui lòng thử lại sau ${data.retryAfterSec}s`)
          } else {
            toast.error('Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.')
          }
          return
        }

        if (res.status >= 500) {
          toast.error('Hệ thống đang bận, vui lòng thử lại sau.')
          return
        }

        toast.error(typeof data.error === 'string' ? data.error : 'Không thể gửi mã xác thực')
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

  const inputClasses = "w-full rounded-2xl border-2 px-4 py-3.5 text-[14px] outline-none transition-all duration-300 font-medium border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs"

  if (done) {
    return (
      <div className="w-full text-center py-8">
        <div className="bg-card/80 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-border p-10">
          <div className="w-20 h-20 rounded-full bg-info-bg flex items-center justify-center mx-auto mb-6 shadow-inner border border-info-border">
            <Mail className="w-10 h-10 text-info-fg" />
          </div>
          <h2 className="text-2xl font-black text-card-foreground mb-3 tracking-tight">Cập nhật thành công</h2>
          <p className="text-muted-foreground font-medium mb-8 max-w-[280px] mx-auto leading-relaxed">
            Mật khẩu của tài khoản <br/><span className="text-card-foreground font-black">{email}</span><br/> đã được thiết lập lại.
          </p>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-full shadow-2xs text-sm text-primary font-black hover:text-primary/90 hover:shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Đăng nhập ngay</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={cardRef} className="w-full relative group opacity-0">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[32px] font-black text-card-foreground tracking-tight leading-tight">Khôi phục mật khẩu</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            Điền email để nhận mã xác thực và thiết lập mật khẩu mới.
          </p>
        </div>

        <form onSubmit={handleSendCode} noValidate className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
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
                disabled={verified}
                className={cn(inputClasses, verified && "opacity-60 cursor-not-allowed bg-muted")}
              />
            </div>
            <DevCodeAndRetryMessage retryAfterSec={retryAfterSec} devCode={devCode} />
          </div>

          {!codeSent && (
            <button
              type="submit"
              disabled={sendingCode}
              className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-2 cursor-pointer active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              {sendingCode ? (
                <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" />
              ) : (
                <>
                  <span className="tracking-wide drop-shadow-2xs">Gửi mã xác thực</span>
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform drop-shadow-2xs" />
                </>
              )}
            </button>
          )}
        </form>

        {codeSent && !verified && (
          <form 
            onSubmit={handleVerifyCode} 
            noValidate 
            className="space-y-4 pt-4 mt-4 border-t border-border"
          >
            <div className="space-y-1">
              <label htmlFor="code" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Mã xác thực
              </label>
              <div className="relative">
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Nhập 6 chữ số"
                  className={cn(
                    inputClasses,
                    "placeholder:tracking-normal font-mono",
                    code ? "tracking-[0.5em] text-center text-xl py-3" : "tracking-normal"
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="flex-1 shrink-0 rounded-2xl bg-card border border-primary/30 px-4 py-3.5 text-sm font-bold text-primary hover:bg-primary/5 hover:border-primary/50 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {sendingCode ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Gửi lại mã'}
              </button>
              <button
                type="submit"
                disabled={verifyingCode}
                className="flex-[2] group relative flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 rounded-2xl transition-all duration-300 shadow-md border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                {verifyingCode ? <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" /> : <>
                  <span className="drop-shadow-2xs">Xác thực mã</span>
                  <KeyRound className="w-4 h-4 drop-shadow-2xs" />
                </>}
              </button>
            </div>
          </form>
        )}

        {verified && (
          <form 
            onSubmit={handleResetPassword} 
            noValidate 
            className="space-y-4 pt-4 mt-4 border-t border-border"
          >
            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className={cn(inputClasses, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className={cn(inputClasses, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={resetting}
              className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-2 cursor-pointer active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              {resetting ? <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" /> : <span className="tracking-wide drop-shadow-2xs">Cập nhật mật khẩu</span>}
            </button>
          </form>
        )}

        <div className="mt-8 pt-5 border-t border-border">
          <Link
            href="/login"
            className="group flex items-center justify-center gap-2 text-sm text-muted-foreground font-bold hover:text-primary transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại trang đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
