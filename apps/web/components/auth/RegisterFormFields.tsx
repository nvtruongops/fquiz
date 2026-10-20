'use client'

import React from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { DevCodeAndRetryMessage } from '@/components/shared/auth/AuthFormComponents'
import { GoogleSignInButton } from '@/components/shared/auth/GoogleSignInButton'

interface RegisterFormFieldsProps {
  form: {
    username: string
    email: string
    password: string
    confirmPassword: string
    verificationCode: string
  }
  showPassword: boolean
  onSetShowPassword: (show: boolean) => void
  errors: Record<string, string>
  loading: boolean
  sendingCode: boolean
  codeSent: boolean
  devCode: string
  retryAfterSec: number | null
  passwordStrength: { label: string; color: string; level: number } | null
  sendCodeLabel: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSendCode: () => void
  onSubmit: (e: React.FormEvent) => void
}

function registerInputClasses(error?: string) {
  return cn(
    'w-full rounded-2xl border-2 px-4 py-3 sm:py-3.5 text-[14px] sm:text-[15px] outline-none transition-all duration-300 font-medium',
    error
      ? 'border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-4 focus:ring-destructive/10'
      : 'border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs'
  )
}

function RegisterEmailField({ form, errors, sendingCode, sendCodeLabel, onChange, onSendCode, retryAfterSec, devCode }: Pick<RegisterFormFieldsProps, 'form' | 'errors' | 'sendingCode' | 'sendCodeLabel' | 'onChange' | 'onSendCode' | 'retryAfterSec' | 'devCode'>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="email" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">Email</label>
      <div className="relative flex gap-2 items-center">
        <input
          id="email" name="email" type="email" autoComplete="email" value={form.email}
          onChange={onChange} placeholder="you@email.com" aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={cn(registerInputClasses(errors.email), 'flex-1 min-w-0')}
        />
        <button
          type="button" onClick={onSendCode} disabled={sendingCode}
          className="register-code-button shrink-0 h-12 rounded-2xl bg-card border-2 border-primary/30 px-3 sm:px-4 text-xs sm:text-sm font-bold text-primary hover:bg-primary/10 hover:border-primary/50 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center whitespace-nowrap cursor-pointer active:scale-95"
        >
          {sendingCode ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : sendCodeLabel}
        </button>
      </div>
      {errors.email && <p id="email-error" role="alert" className="text-destructive text-xs font-bold ml-1 mt-1">{errors.email}</p>}
      <DevCodeAndRetryMessage retryAfterSec={retryAfterSec} devCode={devCode} />
    </div>
  )
}

function RegisterIdentityFields({ form, errors, onChange }: Pick<RegisterFormFieldsProps, 'form' | 'errors' | 'onChange'>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="space-y-1.5">
        <label htmlFor="verificationCode" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">Verification Code</label>
        <input
          id="verificationCode" name="verificationCode" type="text" inputMode="numeric" maxLength={6}
          value={form.verificationCode} onChange={onChange} placeholder="6 digits"
          aria-invalid={Boolean(errors.verificationCode)}
          aria-describedby={errors.verificationCode ? 'verification-code-error' : undefined}
          className={cn(registerInputClasses(errors.verificationCode), 'tracking-widest font-mono text-center placeholder:tracking-normal placeholder:font-sans')}
        />
        {errors.verificationCode && <p id="verification-code-error" role="alert" className="text-destructive text-xs font-bold ml-1 mt-1">{errors.verificationCode}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">Username</label>
        <input
          id="username" name="username" type="text" autoComplete="username" value={form.username}
          onChange={onChange} placeholder="fquiz_user" aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? 'username-error' : undefined}
          className={registerInputClasses(errors.username)}
        />
        {errors.username && <p id="username-error" role="alert" className="text-destructive text-xs font-bold ml-1 mt-1">{errors.username}</p>}
      </div>
    </div>
  )
}

function PasswordVisibilityInput({ id, label, value, visible, onToggle, onChange, error, errorId }: {
  id: string
  label: string
  value: string
  visible: boolean
  onToggle: (visible: boolean) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  errorId: string
}) {
  return (
    <div className="relative">
      <input
        id={id} name={id} type={visible ? 'text' : 'password'} autoComplete="new-password"
        value={value} onChange={onChange} placeholder="••••••••" aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(registerInputClasses(error), 'pr-11')}
      />
      <button
        type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
        onClick={() => onToggle(!visible)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground p-1 transition-colors cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function PasswordStrengthMeter({ strength }: { strength: RegisterFormFieldsProps['passwordStrength'] }) {
  if (!strength) return null
  return (
    <div className="flex items-center gap-2 mt-1.5 ml-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className={cn('flex-1 h-full transition-all duration-300', level <= strength.level ? strength.color : 'bg-transparent')} />
        ))}
      </div>
      <span className="text-[11px] font-bold text-muted-foreground">{strength.label}</span>
    </div>
  )
}

function RegisterPasswordField({ form, errors, showPassword, onSetShowPassword, onChange, passwordStrength }: Pick<RegisterFormFieldsProps, 'form' | 'errors' | 'showPassword' | 'onSetShowPassword' | 'onChange' | 'passwordStrength'>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="password" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">Password</label>
      <PasswordVisibilityInput id="password" label="password" value={form.password} visible={showPassword} onToggle={onSetShowPassword} onChange={onChange} error={errors.password} errorId="password-error" />
      {errors.password && <p id="password-error" role="alert" className="text-destructive text-xs font-bold ml-1 mt-1">{errors.password}</p>}
      <PasswordStrengthMeter strength={passwordStrength} />
    </div>
  )
}

function RegisterConfirmPasswordField({ form, errors, showPassword, onSetShowPassword, onChange }: Pick<RegisterFormFieldsProps, 'form' | 'errors' | 'onChange'> & { showPassword: boolean; onSetShowPassword: (value: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="confirmPassword" className="text-xs font-bold text-card-foreground ml-1 uppercase tracking-wider">Confirm Password</label>
      <PasswordVisibilityInput id="confirmPassword" label="password confirmation" value={form.confirmPassword} visible={showPassword} onToggle={onSetShowPassword} onChange={onChange} error={errors.confirmPassword} errorId="confirm-password-error" />
      {errors.confirmPassword && <p id="confirm-password-error" role="alert" className="text-destructive text-xs font-bold ml-1 mt-1">{errors.confirmPassword}</p>}
    </div>
  )
}

function RegisterSubmitButton({ loading }: { loading: boolean }) {
  return (
    <button type="submit" disabled={loading} className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 sm:py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-3 sm:mt-4 cursor-pointer active:scale-[0.98]">
      <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      {loading ? <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" /> : <>
        <span className="tracking-wide drop-shadow-2xs">Complete Registration</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform drop-shadow-2xs" />
      </>}
    </button>
  )
}

export function RegisterFormFields({ form, showPassword, onSetShowPassword, errors, loading, sendingCode, devCode, retryAfterSec, passwordStrength, sendCodeLabel, onChange, onSendCode, onSubmit }: RegisterFormFieldsProps) {
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  return (
    <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2.5rem] border border-border p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight leading-tight">Create Account</h1>
        <p className="text-muted-foreground mt-1.5 text-xs sm:text-sm font-medium">
          Start your learning journey with FQuiz
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <RegisterEmailField form={form} errors={errors} sendingCode={sendingCode} sendCodeLabel={sendCodeLabel} onChange={onChange} onSendCode={onSendCode} retryAfterSec={retryAfterSec} devCode={devCode} />
        <RegisterIdentityFields form={form} errors={errors} onChange={onChange} />
        <RegisterPasswordField form={form} errors={errors} showPassword={showPassword} onSetShowPassword={onSetShowPassword} onChange={onChange} passwordStrength={passwordStrength} />
        <RegisterConfirmPasswordField form={form} errors={errors} showPassword={showConfirmPassword} onSetShowPassword={setShowConfirmPassword} onChange={onChange} />
        <RegisterSubmitButton loading={loading} />
      </form>

      {/* Google Sign In */}
      <GoogleSignInButton text="Sign up with Google" />

      {/* Footer */}
      <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-muted-foreground font-medium">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-primary hover:underline transition-colors">
          Sign in now
        </Link>
      </p>
    </div>
  )
}
