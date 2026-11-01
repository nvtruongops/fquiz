import type { LucideIcon } from 'lucide-react'
import { ShieldCheck, Copyright, AlertTriangle, RefreshCw, Lock, Cookie, UserCheck } from 'lucide-react'

export interface LegalSection {
  id: string
  number: string
  titleKey: string
  shortTitleKey: string
  icon: LucideIcon
  iconColorClass?: string
  iconBgClass?: string
  iconBorderClass?: string
  itemKeys?: string[]
  paragraphKey?: string
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'account', number: '01', titleKey: 'legal.terms.account.title', shortTitleKey: 'legal.terms.account.short',
    icon: ShieldCheck, iconColorClass: 'text-primary', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    itemKeys: ['legal.terms.account.item1', 'legal.terms.account.item2', 'legal.terms.account.item3'],
  },
  {
    id: 'copyright', number: '02', titleKey: 'legal.terms.copyright.title', shortTitleKey: 'legal.terms.copyright.short',
    icon: Copyright, iconColorClass: 'text-success-fg', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    itemKeys: ['legal.terms.copyright.item1', 'legal.terms.copyright.item2'],
  },
  {
    id: 'disclaimer', number: '03', titleKey: 'legal.terms.disclaimer.title', shortTitleKey: 'legal.terms.disclaimer.short',
    icon: AlertTriangle, iconColorClass: 'text-warning-fg', iconBgClass: 'bg-warning-bg', iconBorderClass: 'border-warning-border',
    itemKeys: ['legal.terms.disclaimer.item1', 'legal.terms.disclaimer.item2'],
  },
  {
    id: 'changes', number: '04', titleKey: 'legal.terms.changes.title', shortTitleKey: 'legal.terms.changes.short',
    icon: RefreshCw, iconColorClass: 'text-primary', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    paragraphKey: 'legal.terms.changes.paragraph',
  },
]

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'minimization', number: '01', titleKey: 'legal.privacy.minimization.title', shortTitleKey: 'legal.privacy.minimization.short',
    icon: ShieldCheck, iconColorClass: 'text-primary', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    itemKeys: ['legal.privacy.minimization.item1', 'legal.privacy.minimization.item2'],
  },
  {
    id: 'security', number: '02', titleKey: 'legal.privacy.security.title', shortTitleKey: 'legal.privacy.security.short',
    icon: Lock, iconColorClass: 'text-success-fg', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    itemKeys: ['legal.privacy.security.item1', 'legal.privacy.security.item2'],
  },
  {
    id: 'cookies', number: '03', titleKey: 'legal.privacy.cookies.title', shortTitleKey: 'legal.privacy.cookies.short',
    icon: Cookie, iconColorClass: 'text-warning-fg', iconBgClass: 'bg-warning-bg', iconBorderClass: 'border-warning-border',
    itemKeys: ['legal.privacy.cookies.item1', 'legal.privacy.cookies.item2'],
  },
  {
    id: 'rights', number: '04', titleKey: 'legal.privacy.rights.title', shortTitleKey: 'legal.privacy.rights.short',
    icon: UserCheck, iconColorClass: 'text-primary', iconBgClass: 'bg-primary/10', iconBorderClass: 'border-primary/20',
    paragraphKey: 'legal.privacy.rights.paragraph',
  },
]
