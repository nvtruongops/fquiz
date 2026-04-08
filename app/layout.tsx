import type { Metadata } from 'next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import ToastProvider from '@/components/ui/toast-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'FQuiz - Nền tảng ôn tập thông minh',
  description: 'Online Quiz Platform for students',
  icons: {
    icon: 'https://res.cloudinary.com/nvtruongops/image/upload/v1775506955/fquiz/favicon.png',
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
