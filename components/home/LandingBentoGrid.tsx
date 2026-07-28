import Link from 'next/link'
import { 
  Map, 
  Zap, 
  Bot, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  Keyboard, 
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import { Card } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { InteractiveFlashcardPreview } from './InteractiveFlashcardPreview'

export function LandingBentoGrid() {
  return (
    <section className="space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="text-xs font-black uppercase tracking-[0.25em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          Kiến trúc Hệ thống 2026
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Hệ Sinh Thái Học Tập Bento Grid
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Tích hợp công nghệ AI toàn diện cho cả nhu cầu tự học ngôn ngữ và ôn luyện trắc nghiệm chống gian lận.
        </p>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {/* Tile 1: AI Language & FSRS Flashcard Engine (Span 2x2) */}
        <Card className="md:col-span-2 lg:col-span-2 p-6 sm:p-8 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Map className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                Mô-đun 01
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                Học Ngôn Ngữ với AI & FSRS
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Cấu trúc cây bài học bài bản, tự động đo lường độ quên từ vựng theo thuật toán lặp lại ngắt quãng (FSRS v4).
              </p>
            </div>

            {/* Interactive Component Demo */}
            <div className="pt-2">
              <InteractiveFlashcardPreview />
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>4 Mức độ đánh giá bộ nhớ</span>
            </div>
            <Button asChild size="sm" className="rounded-lg font-bold">
              <Link href="/roadmap">
                Học ngay <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Tile 2: Smart Quiz & Anti-Cheat Exam Engine (Span 2x1) */}
        <Card className="md:col-span-1 lg:col-span-2 p-6 sm:p-8 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">
                Mô-đun 02
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                Thi Trắc Nghiệm Thông Minh
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Trộn đề ngẫu nhiên, chấm điểm server-side chống gian lận, và tối ưu điều hướng phím tắt siêu tốc.
              </p>
            </div>

            {/* Keyboard Shortcuts Demo Card */}
            <div className="bg-muted/50 border border-border/60 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Keyboard className="w-4 h-4 text-primary" />
                <span>Phím tắt làm bài thần tốc:</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2 py-1 rounded bg-card border border-border text-foreground font-bold shadow-xs">1 - 4</span>
                <span className="px-2 py-1 rounded bg-card border border-border text-foreground font-bold shadow-xs">A - D</span>
                <span className="text-muted-foreground self-center">Chọn đáp án</span>
                <span className="px-2 py-1 rounded bg-card border border-border text-foreground font-bold shadow-xs">Enter</span>
                <span className="text-muted-foreground self-center">Nộp bài</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Chống gian lận Race Condition</span>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-lg font-bold">
              <Link href="/explore">
                Khám phá đề thi <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Tile 3: AI Contextual Tutor Widget (Span 1x1) */}
        <Card className="p-6 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-black text-foreground tracking-tight">AI Trợ Lý Ngữ Pháp</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Giải thích chi tiết ngữ cảnh, sắc thái từ vựng và ví dụ minh họa bằng công nghệ AI sinh tự động.
            </p>
          </div>

          {/* AI Streaming Indicator */}
          <div className="bg-muted/40 border border-border/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>AI Trả lời tức thì</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-primary/20 rounded animate-pulse w-full" />
              <div className="h-2 bg-primary/20 rounded animate-pulse w-4/5" />
            </div>
          </div>
        </Card>

        {/* Tile 4: Memory Retention & Statistics (Span 1x1) */}
        <Card className="p-6 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-black text-foreground tracking-tight">Đường Cong Quên FSRS</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tối ưu lịch ôn tập để từ vựng khắc sâu vào trí nhớ dài hạn mà không tốn sức.
            </p>
          </div>

          {/* Stat Circular Metric */}
          <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <div>
              <div className="text-xl font-black text-foreground">88.4%</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Tỷ lệ nhớ từ</div>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
              +12% / tuần
            </span>
          </div>
        </Card>

      </div>
    </section>
  )
}
