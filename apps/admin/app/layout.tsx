import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FQuiz Admin Portal',
  description: 'Enterprise Administration Console for FQuiz Platform',
  robots: 'noindex, nofollow',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased selection:bg-primary/20 selection:text-primary`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
