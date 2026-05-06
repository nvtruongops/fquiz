import type { Metadata } from 'next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import ToastProvider from '@/components/ui/toast-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'FQuiz - Nền tảng ôn tập thông minh',
  description: 'Online Quiz Platform for students',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.ico',
    apple: '/favicon.webp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased square-ui">
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  )
}
