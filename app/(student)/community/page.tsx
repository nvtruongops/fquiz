'use client'

import React from 'react'
import { 
  Users, 
  MessageCircle, 
  Share2, 
  Sparkles, 
  Search,
  ArrowRight,
  Globe,
  Ghost,
  BookOpen,
  Trophy,
  Rocket
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function CommunityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Community Header */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#5D7B6F]/5 border border-[#5D7B6F]/10 text-[#5D7B6F] font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">
           <Sparkles className="w-4 h-4" /> Không gian kết nối trí tuệ
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-[#5D7B6F] tracking-tight leading-tight">
          Cộng đồng <span className="text-[#A4C3A2]">FQuiz</span>
        </h1>
        <p className="text-lg font-bold text-gray-400 leading-relaxed">
          Nơi các thành viên chia sẻ kiến thức, thảo luận về các bộ đề khó và cùng nhau chinh phục mục tiêu học tập.
        </p>
      </section>

      {/* Feature Highlights - Coming Soon Style */}
      <section className="grid md:grid-cols-3 gap-8">
        <Card className="rounded-[40px] border-none shadow-2xl shadow-[#5D7B6F]/5 overflow-hidden bg-white p-8 group hover:-translate-y-2 transition-all duration-500">
           <CardContent className="p-0 space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                 <Share2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-gray-800">Chia sẻ đề thi</h3>
                 <p className="text-sm font-bold text-gray-400 leading-relaxed">
                    Giúp đỡ bạn bè bằng cách công khai các bộ đề tự soạn tâm huyết của bạn.
                 </p>
              </div>
           </CardContent>
        </Card>

        <Card className="rounded-[40px] border-none shadow-2xl shadow-[#5D7B6F]/5 overflow-hidden bg-white p-8 group hover:-translate-y-2 transition-all duration-500">
           <CardContent className="p-0 space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                 <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-gray-800">Thảo luận & Hỏi đáp</h3>
                 <p className="text-sm font-bold text-gray-400 leading-relaxed">
                    Trao đổi về các câu hỏi hóc búa và nhận giải đáp từ các "siêu nhân" trong cộng đồng.
                 </p>
              </div>
           </CardContent>
        </Card>

        <Card className="rounded-[40px] border-none shadow-2xl shadow-[#5D7B6F]/5 overflow-hidden bg-white p-8 group hover:-translate-y-2 transition-all duration-500">
           <CardContent className="p-0 space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-yellow-50 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
                 <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-gray-800">Bảng xếp hạng</h3>
                 <p className="text-sm font-bold text-gray-400 leading-relaxed">
                    Vinh danh những cá nhân đóng góp tích cực và có thành tích học tập xuất sắc nhất.
                 </p>
              </div>
           </CardContent>
        </Card>
      </section>

      {/* Main Focus: Coming Soon Call to Action */}
      <div className="relative rounded-[48px] bg-white border-2 border-dashed border-[#5D7B6F]/10 p-12 md:p-24 overflow-hidden text-center space-y-8 shadow-2xl shadow-[#5D7B6F]/5">
         <div className="relative z-10 space-y-8 flex flex-col items-center">
            <div className="w-24 h-24 rounded-[36px] bg-[#5D7B6F] flex items-center justify-center text-white shadow-2xl shadow-[#5D7B6F]/30 animate-bounce">
               <Rocket className="w-12 h-12" />
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-black text-[#5D7B6F] uppercase tracking-tighter">Tính năng đang được phát triển</h2>
               <p className="text-gray-400 font-bold max-w-md mx-auto">
                  Cảm ơn bạn đã quan tâm. Chúng tôi đang nỗ lực hoàn thiện không gian Cộng đồng để sớm ra mắt trong phiên bản tiếp theo.
               </p>
            </div>
            <Button asChild variant="outline" className="h-14 px-10 rounded-2xl border-[#5D7B6F] text-[#5D7B6F] font-black hover:bg-[#5D7B6F] hover:text-white transition-all active:scale-95">
               <Link href="/dashboard">Quay lại Tổng quan để ôn luyện trước nhé!</Link>
            </Button>
         </div>
         
         {/* Decorative background icons */}
         <Users className="absolute -top-10 -left-10 w-64 h-64 text-[#5D7B6F]/5 -rotate-12" />
         <Globe className="absolute -bottom-20 -right-20 w-80 h-80 text-[#A4C3A2]/5 rotate-12" />
      </div>

      {/* Community Stats Peek */}
      <section className="flex flex-wrap items-center justify-center gap-12 py-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
         <div className="text-center">
            <p className="text-3xl font-black text-gray-800 tracking-tighter">2,400+</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thành viên</p>
         </div>
         <div className="text-center">
            <p className="text-3xl font-black text-gray-800 tracking-tighter">1,200+</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bộ đề công khai</p>
         </div>
         <div className="text-center">
            <p className="text-3xl font-black text-gray-800 tracking-tighter">15,000+</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lượt thảo luận</p>
         </div>
      </section>
    </div>
  )
}
