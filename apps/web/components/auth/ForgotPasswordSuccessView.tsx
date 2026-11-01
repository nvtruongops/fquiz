'use client'

import React from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { useTranslations } from '@fquiz/ui/i18n'

interface ForgotPasswordSuccessViewProps {
  email: string
}

export function ForgotPasswordSuccessView({ email }: ForgotPasswordSuccessViewProps) {
  const t = useTranslations()
  return (
    <div className="w-full text-center py-8">
      <div className="bg-card/80 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-border p-10">
        <div className="w-20 h-20 rounded-full bg-info-bg flex items-center justify-center mx-auto mb-6 shadow-inner border border-info-border">
          <Mail className="w-10 h-10 text-info-fg" />
        </div>
        <h2 className="text-2xl font-black text-card-foreground mb-3 tracking-tight">
          {t('auth.passwordResetSuccessful')}
        </h2>
        <p className="text-muted-foreground font-medium mb-8 max-w-[280px] mx-auto leading-relaxed">
          {t('auth.passwordResetAccountPrefix')} <br />
          <span className="text-card-foreground font-black">{email}</span>
          <br /> {t('auth.passwordResetAccountSuffix')}
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-full shadow-2xs text-sm text-primary font-black hover:text-primary/90 hover:shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{t('auth.signInNow')}</span>
        </Link>
      </div>
    </div>
  )
}
