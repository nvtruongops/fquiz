'use client'

import { TERMS_SECTIONS, PRIVACY_SECTIONS, type LegalSection } from '@/lib/constants/legal-content'
import { useTranslations } from '@fquiz/ui/i18n'

export function LegalDocumentContent({ type }: { type: 'terms' | 'privacy' }) {
  const t = useTranslations()
  const isTerms = type === 'terms'
  const sections: LegalSection[] = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS

  return (
    <div className="lg:col-span-8 space-y-6">
      <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-primary">
          {t(isTerms ? 'legal.introduction' : 'legal.commitmentSummary')}
        </p>
        <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
          {t(isTerms ? 'legal.terms.introduction' : 'legal.privacy.introduction')}
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${section.iconBgClass ?? 'bg-primary/10'} ${section.iconColorClass ?? 'text-primary'} flex items-center justify-center shrink-0 border ${section.iconBorderClass ?? 'border-primary/20'}`}>
              <section.icon className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${section.iconColorClass ?? 'text-primary'}`}>
                {t('legal.sectionNumber', { number: section.number })}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-foreground">{t(section.titleKey as never)}</h2>
            </div>
          </div>
          {section.itemKeys ? (
            <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              {section.itemKeys.map((key) => <li key={key}>{t(key as never)}</li>)}
            </ul>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              {section.paragraphKey ? t(section.paragraphKey as never) : ''}
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
