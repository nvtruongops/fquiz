'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Library, FolderTree, Plus } from 'lucide-react'

interface MyQuizzesHeaderProps {
  onOpenManageCategories: () => void
}

export const MyQuizzesHeader = React.memo(function MyQuizzesHeader({
  onOpenManageCategories,
}: MyQuizzesHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5D7B6F] to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
          <Library className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Kho Đề Của Tôi</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100">
              Library
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Quản lý bộ đề tự tạo, quiz lưu từ Explore và bài thi trộn ngẫu nhiên.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onOpenManageCategories}
          variant="outline"
          className="rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <FolderTree className="w-4 h-4 mr-1.5 text-[#5D7B6F]" /> Quản lý danh mục
        </Button>

        <Link href="/create">
          <Button className="bg-gradient-to-r from-emerald-800 to-[#5D7B6F] hover:from-emerald-900 hover:to-[#4a6358] text-white text-xs font-bold rounded-2xl shadow-md px-5">
            <Plus className="w-4 h-4 mr-1.5" /> Tạo Quiz mới
          </Button>
        </Link>
      </div>
    </div>
  )
})
