import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { cookies } from 'next/headers'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const UMAMI_ADMIN_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_ADMIN_WEBSITE_ID

export async function generateMetadata(): Promise<Metadata> {
  const isEnglish = (await cookies()).get('fquiz-locale')?.value === 'en'
  return {
    title: isEnglish ? 'FQuiz Admin Portal' : 'Cổng quản trị FQuiz',
    description: isEnglish ? 'Administration console for the FQuiz platform.' : 'Bảng điều khiển quản trị nền tảng FQuiz.',
    robots: 'noindex, nofollow',
    icons: { icon: '/favicon.ico', shortcut: '/favicon.ico', apple: '/favicon.ico' },
  }
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
        {UMAMI_SCRIPT_URL && UMAMI_ADMIN_WEBSITE_ID && (
          <Script defer src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_ADMIN_WEBSITE_ID} strategy="afterInteractive" />
        )}
      </body>
    </html>
  )
}
