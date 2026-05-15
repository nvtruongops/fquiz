import type { Metadata } from 'next'
import { QueryProvider } from '@/components/shared/providers/QueryProvider'
import ToastProvider from '@/components/shared/ui/toast-provider'
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
    <html lang="vi" suppressHydrationWarning>
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
      <body className="antialiased square-ui min-h-screen bg-[#F0F0EB]" suppressHydrationWarning>
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
