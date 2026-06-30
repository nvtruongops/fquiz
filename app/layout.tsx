import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/shared/providers/QueryProvider'
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
      <body className="antialiased min-h-screen bg-[#F0F0EB] font-sans" suppressHydrationWarning>
        <NextTopLoader color="#5D7B6F" height={3} showSpinner={false} shadow={false} />
        <QueryProvider>
          <div className="mx-auto w-[94%] xl:w-[92%] min-h-screen flex flex-col bg-white relative shadow-[0_0_120px_rgba(0,0,0,0.06)] border-x border-gray-100">
            {children}
          </div>
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  )
}
