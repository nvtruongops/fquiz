'use client'

import React from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Send, KeyRound, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { DevCodeAndRetryMessage } from '@/components/shared/auth/AuthFormComponents'

interface ForgotPasswordFormFieldsProps {
  email: string
  onSetEmail: (email: string) => void
  code: string
  onSetCode: (code: string) => void
  newPassword: string
  onSetNewPassword: (pass: string) => void
  confirmPassword: string
  onSetConfirmPassword: (pass: string) => void
  showNewPassword: boolean
  onSetShowNewPassword: (show: boolean) => void
  showConfirmPassword: boolean
  onSetShowConfirmPassword: (show: boolean) => void
  codeSent: boolean
  verified: boolean
  devCode: string
  retryAfterSec: number | null
  sendingCode: boolean
  verifyingCode: boolean
  resetting: boolean
  onSendCode: (e: React.FormEvent) => void
  onVerifyCode: (e: React.FormEvent) => void
  onResetPassword: (e: React.FormEvent) => void
}

export function ForgotPasswordFormFields({
  email,
  onSetEmail,
  code,
  onSetCode,
  newPassword,
  onSetNewPassword,
  confirmPassword,
  onSetConfirmPassword,
  showNewPassword,
  onSetShowNewPassword,
  showConfirmPassword,
  onSetShowConfirmPassword,
  codeSent,
  verified,
  devCode,
  retryAfterSec,
  sendingCode,
  verifyingCode,
  resetting,
  onSendCode,
  onVerifyCode,
  onResetPassword,
}: ForgotPasswordFormFieldsProps) {
  const inputClasses =
    'w-full rounded-2xl border-2 px-4 py-3.5 text-[14px] outline-none transition-all duration-300 font-medium border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs'

  return (
    <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl sm:text-[32px] font-black text-card-foreground tracking-tight leading-tight">
          Reset Password
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Enter your email to receive a verification code and set a new password.
        </p>
      </div>

      {/* Step 1: Send Email Code Form */}
      <form onSubmit={onSendCode} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
            Registered Email
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => onSetEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={verified}
              className={cn(inputClasses, verified && 'opacity-60 cursor-not-allowed bg-muted')}
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
                <span className="tracking-wide drop-shadow-2xs">Send Verification Code</span>
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform drop-shadow-2xs" />
              </>
            )}
          </button>
        )}
      </form>

      {/* Step 2: Verify Code Form */}
      {codeSent && !verified && (
        <form onSubmit={onVerifyCode} noValidate className="mt-4 space-y-4 pt-4 border-t border-border">
          <div className="space-y-1">
            <label htmlFor="code" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
              Verification Code (6 digits)
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => onSetCode(e.target.value)}
              placeholder="123456"
              className={cn(inputClasses, 'tracking-widest font-mono text-center')}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSendCode}
              disabled={sendingCode}
              className="flex-1 py-3 bg-muted text-foreground hover:bg-muted/80 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
            >
              {sendingCode ? 'Resending...' : 'Resend Code'}
            </button>
            <button
              type="submit"
              disabled={verifyingCode}
              className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
            >
              {verifyingCode ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Reset Password Form */}
      {verified && (
        <form onSubmit={onResetPassword} noValidate className="mt-4 space-y-4 pt-4 border-t border-border">
          <div className="space-y-1">
            <label htmlFor="newPassword" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => onSetNewPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClasses, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => onSetShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground p-1 transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onSetConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClasses, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => onSetShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground p-1 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={resetting}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl transition-all duration-300 shadow-md cursor-pointer active:scale-[0.98]"
          >
            {resetting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Back link */}
      <div className="mt-8 pt-6 border-t border-border/80 flex items-center justify-between text-xs">
        <Link
          href="/login"
          className="group inline-flex items-center gap-1.5 text-muted-foreground font-bold hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Sign In</span>
        </Link>
        <Link href="/register" className="font-bold text-primary hover:underline transition-colors">
          Create New Account
        </Link>
      </div>
    </div>
  )
}
