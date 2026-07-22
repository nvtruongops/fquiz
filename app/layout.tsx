import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/shared/providers/QueryProvider'
import { ThemeProvider } from '@/components/shared/providers/ThemeProvider'
import ToastProvider from '@/components/shared/ui/toast-provider'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
}

import PageTransitionLoader from '@/components/shared/ui/page-transition-loader'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
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
        <NextTopLoader color="#5D7B6F" height={3} showSpinner={false} shadow={false} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <QueryProvider>
            <PageTransitionLoader />
            <div className="w-full min-h-screen flex flex-col bg-background relative">
              {children}
            </div>
            <ToastProvider />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
