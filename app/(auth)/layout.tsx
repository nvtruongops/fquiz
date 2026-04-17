import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Sparkles } from 'lucide-react'
import { verifySession } from '@/lib/dal'

export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // If already logged in, redirect to dashboard
  const user = await verifySession()
  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="h-[100dvh] bg-[#EAE7D6] relative overflow-hidden flex flex-col items-center justify-center px-3 py-3 sm:px-5 sm:py-4 [@media(max-height:860px)]:justify-start [@media(max-height:860px)]:pt-3">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#A4C3A2]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D7F9FA]/30 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 mb-4 sm:mb-5 animate-in fade-in slide-in-from-top-4 duration-700 [@media(max-height:860px)]:mb-3">
        <Link href="/" className="flex flex-col items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] flex items-center justify-center shadow-xl shadow-[#5D7B6F]/20 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-[#5D7B6F] text-xl tracking-tight">FQuiz</span>
        </Link>
      </div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-[460px] animate-in fade-in zoom-in-95 duration-700 [@media(max-height:860px)]:origin-top [@media(max-height:860px)]:scale-[0.94] [@media(max-height:760px)]:scale-[0.9]">
        {children}
      </div>

      {/* Footer Decoration */}
      <div className="relative z-10 mt-4 sm:mt-5 flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 [@media(max-height:860px)]:hidden">
        <Sparkles className="w-3.5 h-3.5" />
        <span>FQuiz Platform</span>
      </div>
    </div>
  )
}


