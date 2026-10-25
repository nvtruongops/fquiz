import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || 'https://example.invalid/script.js'
const UMAMI_ADMIN_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_ADMIN_WEBSITE_ID || '003664de-f392-4938-8250-de7824fcf25a'

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
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased selection:bg-primary/20 selection:text-primary`}>
        <Providers>
          {children}
        </Providers>
        <Script
          defer
          src={UMAMI_SCRIPT_URL}
          data-website-id={UMAMI_ADMIN_WEBSITE_ID}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
