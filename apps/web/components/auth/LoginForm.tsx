'use client'

import React from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { GoogleSignInButton } from '@/components/shared/auth/GoogleSignInButton'
import { useLoginForm } from '@/hooks/auth/useLoginForm'

export function LoginForm() {
  const {
    cardRef,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    errors,
    loading,
    callbackUrl,
    handleSubmit,
  } = useLoginForm()

  return (
    <div ref={cardRef} className="w-full relative group opacity-0 flex-1 max-w-[440px]">
      {/* Glow behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      
      <div className="relative bg-card/80 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        {/* Top inner highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl sm:text-[32px] font-black text-card-foreground tracking-tight leading-tight">Sign in</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">Welcome back to FQuiz</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Identifier Field */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-sm font-bold text-card-foreground ml-1">
              Email or Username
            </label>
            <div className="relative">
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                className={cn(
                  'w-full rounded-2xl border-2 px-4 py-3.5 text-[15px] outline-none transition-all duration-300 font-medium',
                  errors.identifier 
                    ? 'border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-4 focus:ring-destructive/10' 
                    : 'border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs'
                )}
              />
            </div>
            {errors.identifier && (
              <p className="text-destructive text-xs font-bold ml-1 mt-1">
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="password" className="text-sm font-bold text-card-foreground">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-black text-primary hover:text-primary/90 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={cn(
                  'w-full rounded-2xl border-2 px-4 py-3.5 pr-12 text-[15px] outline-none transition-all duration-300 font-medium',
                  errors.password 
                    ? 'border-destructive/60 bg-incorrect-bg/50 text-card-foreground placeholder:text-destructive/50 focus:border-destructive focus:ring-4 focus:ring-destructive/10' 
                    : 'border-border bg-card/80 text-card-foreground placeholder:text-muted-foreground hover:border-border/80 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 shadow-2xs'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs font-bold ml-1 mt-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-primary/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-primary-foreground/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin drop-shadow-2xs" />
            ) : (
              <>
                <span className="tracking-wide drop-shadow-2xs">Sign in</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform drop-shadow-2xs" />
              </>
            )}
          </button>
        </form>

        <GoogleSignInButton callbackUrl={callbackUrl} text="Sign in with Google" />

        {/* Footer Links */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs">
          <p className="text-muted-foreground font-medium">
            Don&apos;t have an account?{' '}
            <Link 
              href={callbackUrl ? `/register?redirect=${encodeURIComponent(callbackUrl)}` : '/register'}
              className="text-primary font-bold hover:underline"
            >
              Sign up
            </Link>
          </p>

          <a 
            href={process.env.NEXT_PUBLIC_ADMIN_URL || 'https://fquiz-admin.vercel.app/login'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-muted-foreground transition-colors inline-flex items-center gap-1 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
            Admin Portal
          </a>
        </div>
      </div>
    </div>
  )
}
