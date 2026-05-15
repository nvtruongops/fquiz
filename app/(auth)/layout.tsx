import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Sparkles, ArrowLeft } from 'lucide-react'
import { verifySession } from '@/lib/modules/auth/dal'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // If already logged in, redirect to dashboard
  const user = await verifySession()
  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] relative overflow-hidden flex flex-col items-center justify-center px-4 py-8">
      {/* Floating Back to Home Button */}
      <div className="absolute top-6 left-6 z-50">
        <Link 
          href="/" 
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm text-gray-500 hover:text-slate-900 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Trang chủ
        </Link>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#5D7B6F]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#A4C3A2]/10 blur-[120px] rounded-full" />
      </div>

      {/* Brand Header with 3D Effect */}
      <div className="relative z-10 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <Link href="/" className="flex flex-col items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-[#5D7B6F]/20 rounded-2xl translate-y-1.5 transition-transform group-hover:translate-y-2" />
            <div className="relative w-14 h-14 rounded-2xl bg-[#5D7B6F] flex items-center justify-center shadow-xl group-hover:-translate-y-0.5 transition-all">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-center">
            <span className="font-black text-[#5D7B6F] text-2xl tracking-tighter block">FQuiz</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Hệ thống luyện thi</span>
          </div>
        </Link>
      </div>

      {/* Form Container - Enhanced 3D Glassmorphism */}
      <div className="relative z-10 w-full max-w-[480px] animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute inset-0 bg-[#5D7B6F]/5 blur-3xl -z-10 rounded-full scale-150 opacity-50" />
        {children}
      </div>

      {/* Footer Decoration */}
      <div className="relative z-10 mt-10 flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
        <Sparkles className="w-4 h-4" />
        <span>Tương lai trong tầm tay</span>
      </div>
    </div>
  )
}
