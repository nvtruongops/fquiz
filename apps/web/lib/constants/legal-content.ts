import type { LucideIcon } from 'lucide-react'
import {
  ShieldCheck,
  Copyright,
  AlertTriangle,
  RefreshCw,
  Lock,
  Cookie,
  UserCheck,
} from 'lucide-react'

export interface LegalSection {
  id: string
  number: string
  title: string
  shortTitle: string
  icon: LucideIcon
  iconColorClass?: string
  iconBgClass?: string
  iconBorderClass?: string
  items?: string[]
  paragraph?: string
}

export const TERMS_INTRODUCTION =
  'Welcome to FQuiz. By accessing and using our platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, please discontinue using the service immediately.'

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'account',
    number: 'Section 01',
    title: 'Account Registration & Security',
    shortTitle: '1. Registration & Security',
    icon: ShieldCheck,
    iconColorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    items: [
      'You are responsible for maintaining the confidentiality of your login credentials (username and password).',
      'Do not share accounts. You are solely responsible for all activities and submissions conducted under your account.',
      'FQuiz reserves the right to suspend or terminate accounts engaging in fraudulent activities, abuse, or unauthorized exploitation.',
    ],
  },
  {
    id: 'copyright',
    number: 'Section 02',
    title: 'Intellectual Property & Content',
    shortTitle: '2. Intellectual Property',
    icon: Copyright,
    iconColorClass: 'text-success-fg',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    items: [
      'All quiz questions, learning materials, algorithms, and interface designs on FQuiz are the intellectual property of FQuiz.',
      'Unauthorized copying, distribution, automated scraping, or commercialization of content without prior written consent is strictly prohibited.',
    ],
  },
  {
    id: 'disclaimer',
    number: 'Section 03',
    title: 'Educational Disclaimer',
    shortTitle: '3. Disclaimer',
    icon: AlertTriangle,
    iconColorClass: 'text-warning-fg',
    iconBgClass: 'bg-warning-bg',
    iconBorderClass: 'border-warning-border',
    items: [
      'FQuiz is an educational technology platform providing simulated practice environments. We do not guarantee that practice questions will mirror actual official examinations.',
      "FQuiz is not responsible for academic standing or official test outcomes. Users must adhere to their educational institution's academic integrity policies.",
    ],
  },
  {
    id: 'changes',
    number: 'Section 04',
    title: 'Modifications to Terms',
    shortTitle: '4. Modifications',
    icon: RefreshCw,
    iconColorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    paragraph:
      'FQuiz reserves the right to update these Terms of Service at any time to reflect platform improvements or regulatory compliance. Continued use of the platform constitutes acceptance of revised terms.',
  },
]

export const PRIVACY_INTRODUCTION =
  'FQuiz is committed to protecting your privacy and personal data. Please read the sections below to understand how we collect, store, and safeguard your information.'

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'minimization',
    number: 'Section 01',
    title: 'Data Minimization',
    shortTitle: '1. Data Minimization',
    icon: ShieldCheck,
    iconColorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    items: [
      'We collect only essential information required to operate the platform: Username, Email address, and Quiz history & results.',
      'We never collect sensitive personal identifiers, precise geographic locations, or unnecessary device data.',
    ],
  },
  {
    id: 'security',
    number: 'Section 02',
    title: 'Password Security',
    shortTitle: '2. Password Security',
    icon: Lock,
    iconColorClass: 'text-success-fg',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    items: [
      'Your password is cryptographically hashed using industry-standard one-way algorithms before database persistence.',
      'No one (including FQuiz administrators and engineers) can access or view your plaintext password.',
    ],
  },
  {
    id: 'cookies',
    number: 'Section 03',
    title: 'Cookies & Sessions',
    shortTitle: '3. Cookies & Sessions',
    icon: Cookie,
    iconColorClass: 'text-warning-fg',
    iconBgClass: 'bg-warning-bg',
    iconBorderClass: 'border-warning-border',
    items: [
      'FQuiz uses secure authentication tokens (JWT) stored in HTTP-only cookies to manage your active session.',
      'These cookies are strictly used for security and authentication purposes, with zero third-party ad tracking.',
    ],
  },
  {
    id: 'rights',
    number: 'Section 04',
    title: 'User Rights & Data Control',
    shortTitle: '4. User Rights',
    icon: UserCheck,
    iconColorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
    iconBorderClass: 'border-primary/20',
    paragraph:
      'You have the right to request an export of your quiz history or permanently delete your account at any time. Upon deletion, all associated quiz records and personal data are purged completely from our database.',
  },
]
