import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { QueryProvider } from '@/components/shared/providers/QueryProvider'
import { ThemeProvider } from '@/components/shared/providers/ThemeProvider'
import ToastProvider from '@/components/shared/ui/toast-provider'
import { NetworkStatusNotification } from '@/components/shared/ui/network-status-notification'
import PageTransitionLoader from '@/components/shared/ui/page-transition-loader'
import { resolveAppBaseUrl } from '@/lib/core/utils/url-utils'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
})

const APP_URL = resolveAppBaseUrl()
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | FQuiz',
    default: 'FQuiz — Smart Practice & Quiz Platform',
  },
  description:
    'Online quiz platform with 3 learning modes: Instant Quiz, Practice, and Flashcards. Create quizzes, practice, and track mastery progress.',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.ico',
    apple: '/favicon.webp',
  },
  openGraph: {
    type: 'website',
    siteName: 'FQuiz',
    title: 'FQuiz — Smart Practice & Quiz Platform',
    description:
      'Online quiz platform with 3 learning modes: Instant Quiz, Practice, and Flashcards.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary',
    title: 'FQuiz — Smart Practice & Quiz Platform',
    description:
      'Online quiz platform with 3 learning modes: Instant Quiz, Practice, and Flashcards.',
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          // ponytail: allow-dangerouslySetInnerHTML
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  if (
                    args[0] &&
                    typeof args[0] === 'string' &&
                    (args[0].includes('Hydration') || args[0].includes('did not match')) &&
                    (args.some(arg => typeof arg === 'string' && (arg.includes('bis_skin_checked') || arg.includes('bis_register') || arg.includes('extension'))))
                  ) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-app-bg text-foreground font-sans" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" themes={['light', 'dark', 'green', 'pink']} enableSystem={false}>
            <NetworkStatusNotification />
            <PageTransitionLoader />
            <div className="w-full min-h-screen flex flex-col bg-background relative">
              {children}
            </div>
            <ToastProvider />
          </ThemeProvider>
        </QueryProvider>
        {UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID && (
          <Script defer src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_WEBSITE_ID} strategy="afterInteractive" />
        )}
      </body>
    </html>
  )
}
