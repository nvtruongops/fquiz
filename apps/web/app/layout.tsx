import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/shared/providers/QueryProvider'
import { ThemeProvider } from '@/components/shared/providers/ThemeProvider'
import ToastProvider from '@/components/shared/ui/toast-provider'
import { resolveAppBaseUrl } from '@/lib/core/utils/url-utils'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
})

const APP_URL = resolveAppBaseUrl()

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | FQuiz',
    default: 'FQuiz — Nền tảng ôn tập thông minh',
  },
  description:
    'Nền tảng thi trắc nghiệm online với 3 chế độ: trắc nghiệm tức thì, ôn tập, và flashcard. Tạo quiz, luyện tập, và theo dõi tiến độ.',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.ico',
    apple: '/favicon.webp',
  },
  openGraph: {
    type: 'website',
    siteName: 'FQuiz',
    title: 'FQuiz — Nền tảng ôn tập thông minh',
    description:
      'Nền tảng thi trắc nghiệm online với 3 chế độ: trắc nghiệm tức thì, ôn tập, và flashcard.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary',
    title: 'FQuiz — Nền tảng ôn tập thông minh',
    description:
      'Nền tảng thi trắc nghiệm online với 3 chế độ: trắc nghiệm tức thì, ôn tập, và flashcard.',
  },
  verification: {
    google: 'Ebe9Yn8_Zc1Z9DhhnuKIqcjqBlpD6WTdmlyRvepZp9Y',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

import PageTransitionLoader from '@/components/shared/ui/page-transition-loader'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
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
            <PageTransitionLoader />
            <div className="w-full min-h-screen flex flex-col bg-background relative">
              {children}
            </div>
            <ToastProvider />
          </ThemeProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
