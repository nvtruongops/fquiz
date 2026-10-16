'use client'

import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoginHeroPanel } from '@/components/auth/LoginHeroPanel'

export default function LoginPage() {
  return (
    <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8">
      <LoginHeroPanel />
      <Suspense
        fallback={
          <div className="w-full relative group max-w-[440px]">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/10 rounded-[2.5rem] blur-xl opacity-60" />
            <div className="relative bg-card/70 backdrop-blur-2xl rounded-[2.5rem] border border-border p-8 sm:p-10 shadow-lg">
              <div className="mb-8 text-center sm:text-left">
                <div className="h-8 w-40 bg-muted animate-pulse rounded-lg mb-4" />
                <div className="h-4 w-60 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="space-y-6">
                <div className="h-14 bg-muted animate-pulse rounded-2xl" />
                <div className="h-14 bg-muted animate-pulse rounded-2xl" />
                <div className="h-14 bg-primary/20 animate-pulse rounded-2xl mt-4" />
              </div>
            </div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
