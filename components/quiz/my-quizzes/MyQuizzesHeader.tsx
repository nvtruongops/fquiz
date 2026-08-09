import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Library, FolderTree, Plus, HardDrive } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface MyQuizzesHeaderProps {
  onOpenManageCategories: () => void
  ownQuizTotal?: number
}

export const MyQuizzesHeader = React.memo(function MyQuizzesHeader({
  onOpenManageCategories,
  ownQuizTotal = 0,
}: MyQuizzesHeaderProps) {
  const isFull = ownQuizTotal >= 10
  const isWarning = ownQuizTotal >= 8 && ownQuizTotal < 10

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
          <Library className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Kho Đề Của Tôi</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Library
            </span>
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs",
              isFull ? "bg-destructive/10 text-destructive border-destructive/20" : isWarning ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"
            )}>
              <HardDrive className="w-3 h-3 shrink-0" />
              <span>Dung lượng: {ownQuizTotal}/10 bộ đề</span>
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Quản lý bộ đề tự tạo, quiz lưu từ Explore và bài thi trộn ngẫu nhiên.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onOpenManageCategories}
          variant="outline"
          className="rounded-2xl text-xs font-bold border-border text-foreground hover:bg-muted"
        >
          <FolderTree className="w-4 h-4 mr-1.5 text-primary" /> Quản lý danh mục
        </Button>

        <Link href="/create">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-2xl shadow-md px-5">
            <Plus className="w-4 h-4 mr-1.5" /> Tạo Quiz mới
          </Button>
        </Link>
      </div>
    </div>
  )
})
