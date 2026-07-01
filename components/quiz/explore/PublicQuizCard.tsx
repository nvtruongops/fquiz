import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'

export function PublicQuizCard({ quiz }: { quiz: any }) {
  const normTitle = (quiz.title || '').trim()
  
  return (
    <Link href={`/quiz/${quiz._id.toString()}`} className="group block h-full">
      <Card className="h-full rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(93,123,111,0.12)] flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#A4C3A2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-6 flex flex-col h-full flex-1 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <Badge className="bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase w-fit hover:bg-[#5D7B6F]/20 transition-colors">
              {quiz.category_id?.name || 'Khác'}
            </Badge>
          </div>

          <div className="flex-1 flex flex-col mt-2">
            <h4 className="text-[19px] font-bold text-slate-800 mb-3 leading-snug group-hover:text-[#5D7B6F] transition-colors break-words">
              {normTitle.replaceAll('_', '_\u200B')}
            </h4>

            <div className="mt-auto pt-5 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[17px] font-black text-[#5D7B6F] leading-none">{quiz.questions?.length || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">Câu hỏi</span>
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center group-hover:bg-[#5D7B6F] group-hover:text-white transition-all shadow-sm">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
