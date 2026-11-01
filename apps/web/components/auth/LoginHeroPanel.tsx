'use client'

import React from 'react'
import { Sparkles, CheckCircle2, Shield, Zap, GraduationCap } from 'lucide-react'
import { useTranslations } from '@fquiz/ui/i18n'

export function LoginHeroPanel() {
  const t = useTranslations()
  return (
    <div className="hidden lg:flex flex-col justify-between p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-border text-card-foreground flex-1 self-stretch">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('auth.platform')}</span>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight text-card-foreground">
            {t('auth.heroTitle')}
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">
            {t('auth.heroDescription')}
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">{t('auth.adaptivePractice')}</h4>
              <p className="text-xs text-muted-foreground font-medium">{t('auth.instantExplanations')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">{t('auth.examIntegrity')}</h4>
              <p className="text-xs text-muted-foreground font-medium">{t('auth.sessionSecurity')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">{t('auth.comprehensiveAnalytics')}</h4>
              <p className="text-xs text-muted-foreground font-medium">{t('auth.scoreBreakdown')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border mt-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>{t('auth.trustedLearners')}</span>
        </div>
      </div>
    </div>
  )
}
