'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  Library,
  GraduationCap, 
  Users, 
   Clock3,
  Download, 
  AlertCircle,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'

interface Category {
  id: string
  _id?: string
  name: string
  publishedQuizCount?: number
  type?: 'private' | 'public'
}

interface QuizMeta {
  id: string
  title: string
  course_code: string
   source_type: 'explore_public'
   source_label: string
   source_creator_name?: string | null
  questionCount: number
  studentCount: number
  categoryId: string
  categoryName: string
   latestCorrectCount?: number | null
   latestTotalCount?: number | null
   latestScoreOnTen?: number | null
   totalStudyMinutes?: number | null
}

function formatStudyDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (remainMinutes === 0) return `${hours} giờ`
  return `${hours} giờ ${remainMinutes} phút`
}

async function fetchCategories(): Promise<{ data: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchQuizzes(categoryId: string, search: string): Promise<{ data: QuizMeta[], pagination: any }> {
  const params = new URLSearchParams()
  if (categoryId && categoryId !== 'all') params.set('category_id', categoryId)
  if (search) params.set('search', search)
  params.set('sort', 'popular')
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/quizzes?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

export default function ExploreContent() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [isCatPickerOpen, setIsCatPickerOpen] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`).then(res => {
      if (res.ok) res.json().then(data => setUser(data.user))
    })
  }, [])

   const { data: catData } = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: fetchCategories,
  })

  const { data: quizData, isLoading: isQuizzesLoading } = useQuery({
    queryKey: ['public', 'quizzes', categoryId, debouncedSearch],
    queryFn: () => fetchQuizzes(categoryId, debouncedSearch),
    enabled: true // Always fetch to show popular quizzes by default
  })

  const categories = catData?.data || []
  const quizzes = quizData?.data || []
  const selectedCategory = categories.find(c => c.id === categoryId)

  const filteredCategories = useMemo(() => {
    let list = [...categories]
    if (catSearch) {
      list = list.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    }
    // Sort A-Z
    return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [categories, catSearch])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-28 md:pb-6 space-y-6 animate-in fade-in duration-700">
      {/* Hero Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight group">
           <span className="inline-block group-hover:-rotate-2 transition-transform duration-300">Khám phá</span> 
           <span className="text-[#5D7B6F]"> Thư viện</span>
        </h1>
        <p className="text-gray-500 max-w-xl font-medium leading-relaxed">
          Tìm kiếm môn học và bắt đầu chinh phục những mã đề thi chất lượng từ cộng đồng FQuiz.
        </p>
      </div>

      {/* Search Bar Row */}
      <div className="flex flex-col md:flex-row items-stretch gap-3 bg-white p-2 rounded-[28px] shadow-2xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/10">
        <Dialog open={isCatPickerOpen} onOpenChange={setIsCatPickerOpen}>
           <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-16 px-6 md:px-8 rounded-2xl bg-[#5D7B6F]/5 hover:bg-[#5D7B6F]/10 text-[#5D7B6F] font-black flex items-center gap-3 transition-all shrink-0 border border-transparent hover:border-[#5D7B6F]/20"
              >
                 <Library className="w-5 h-5 text-[#A4C3A2]" />
                 <span className="max-w-[120px] md:max-w-[200px] truncate">
                   {selectedCategory ? selectedCategory.name : 'Danh mục Môn học'}
                 </span>
                 <ChevronDown className={cn("w-4 h-4 transition-transform", isCatPickerOpen && "rotate-180")} />
              </Button>
           </DialogTrigger>
           
           <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl rounded-[40px] px-6 py-6 sm:px-8 sm:py-8 border-[#5D7B6F]/10 shadow-3xl bg-white/95 backdrop-blur-xl">
              <DialogHeader>
                 <DialogTitle className="text-2xl font-black text-[#5D7B6F] flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-[#A4C3A2]" />
                    Chọn môn học
                 </DialogTitle>
                 <DialogDescription className="text-gray-400 font-medium">
                    Hệ thống hiện có {categories.length} môn học.
                 </DialogDescription>
              </DialogHeader>

              <div className="relative mt-4 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#5D7B6F] transition-colors" />
                 <Input 
                   placeholder="Tìm kiếm môn học..."
                   value={catSearch}
                   onChange={(e) => setCatSearch(e.target.value)}
                   className="pl-12 py-6 rounded-2xl border-[#A4C3A2]/20 focus:border-[#5D7B6F] font-bold text-[#5D7B6F]"
                 />
              </div>

              <ScrollArea className="mt-6 h-[400px] pr-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                       onClick={() => { setCategoryId(''); setIsCatPickerOpen(false); }}
                       className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all",
                          !categoryId ? "bg-[#5D7B6F] border-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20" : "bg-gray-50 border-transparent hover:border-[#A4C3A2]/30 text-[#5D7B6F] font-bold"
                       )}
                    >
                       Tất cả môn học
                    </button>
                    {filteredCategories.map(cat => (
                       <button 
                          key={cat.id}
                          onClick={() => { setCategoryId(cat.id); setIsCatPickerOpen(false); }}
                          className={cn(
                             "p-4 rounded-2xl border-2 text-left transition-all flex justify-between items-center group",
                             categoryId === cat.id 
                                ? "bg-[#5D7B6F] border-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20" 
                                : "bg-gray-50 border-transparent hover:border-[#A4C3A2]/30 text-[#5D7B6F] font-bold"
                          )}
                       >
                          <span className="truncate pr-2">{cat.name}</span>
                          <span className={cn(
                             "text-[10px] px-2 py-0.5 rounded-full text-[#5D7B6F] bg-[#A4C3A2]/20",
                             categoryId === cat.id && "bg-white/20 text-white"
                          )}>
                             {cat.publishedQuizCount}
                          </span>
                       </button>
                    ))}
                 </div>
                 <ScrollBar />
              </ScrollArea>
           </DialogContent>
        </Dialog>

        <div className="flex-1 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#5D7B6F] transition-colors" />
           <Input 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             placeholder="Nhập tên quiz hoặc mã đề bạn đang tìm..."
             className="h-16 pl-14 pr-6 rounded-2xl border-none focus-visible:ring-0 text-lg font-bold text-[#5D7B6F] bg-transparent"
           />
        </div>
      </div>

      {/* Results Rendering */}
      <div className="space-y-6">
         {isQuizzesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-44 rounded-[24px] bg-gray-50 animate-pulse border-2 border-dashed border-[#A4C3A2]/10" />
               ))}
            </div>
         ) : quizzes.length === 0 ? (
            <div className="py-24 text-center space-y-6 bg-white/40 rounded-[48px] border-2 border-dashed border-red-100">
               <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-red-300" />
               </div>
               <div className="space-y-2">
                  <p className="text-2xl font-black text-gray-400">Không tìm thấy mã đề nào</p>
                  <p className="text-gray-400 font-bold max-w-sm mx-auto">Thử tìm với nội dung khác nhé!</p>
               </div>
            </div>
         ) : (
            <>
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-[#A4C3A2] rounded-full" />
                     <h3 className="text-xl font-black text-[#5D7B6F]">
                        {categoryId ? `Môn học: ${selectedCategory?.name}` : debouncedSearch ? `Kết quả cho "${search}"` : 'Bộ đề phổ biến'} ({quizzes.length})
                     </h3>
                  </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {quizzes.map((quiz) => (
                     <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={!!user} />
                  ))}
               </div>
            </>
         )}
      </div>
    </div>
  )
}

function QuizCard({ quiz, isLoggedIn }: { quiz: QuizMeta, isLoggedIn: boolean }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
   const hasAttempt = typeof quiz.latestCorrectCount === 'number'
   const scoreOnTen = quiz.latestScoreOnTen ?? 0
   const isPassed = scoreOnTen >= 5
   const totalStudyMinutes = Number(quiz.totalStudyMinutes ?? 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/save-quiz`, {
        method: 'POST',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quizId: quiz.id })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save quiz')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || `Đã lưu mã đề ${quiz.course_code}!`)
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  return (
    <div className="group block focus-prefetch relative">
      <Card className="h-full rounded-[24px] bg-white border-2 border-[#A4C3A2]/10 group-hover:border-[#5D7B6F]/40 overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#5D7B6F]/10">
        <CardContent className="p-5 flex flex-col h-full relative">
          <div className="flex items-start justify-between mb-4">
             <Badge className="bg-[#D7F9FA] text-[#5D7B6F] hover:bg-[#A4C3A2]/20 border-none px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                {quiz.categoryName}
             </Badge>
             {isLoggedIn && (
                <Button 
                  variant="ghost" size="icon" 
                  disabled={saveMutation.isPending}
                  onClick={(e) => { e.stopPropagation(); saveMutation.mutate(); }}
                  className={cn(
                    "w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-[#5D7B6F] hover:text-white transition-all shadow-sm active:scale-90",
                    saveMutation.isPending && "animate-pulse"
                  )}
                >
                   <Download className="w-4 h-4" />
                </Button>
             )}
          </div>

          <Link href={`/quiz/${quiz.id}`} className="flex-1 flex flex-col">
            <h4 className="text-base font-black text-gray-900 mb-4 leading-tight group-hover:text-[#5D7B6F] transition-colors line-clamp-2 min-h-[2.5rem]">
              {quiz.course_code}
            </h4>

                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                     {quiz.source_label}{quiz.source_creator_name ? ` • ${quiz.source_creator_name}` : ''}
                  </p>

                  {hasAttempt && (
                     <div className={`mb-3 ${isPassed ? 'text-[#166534]' : 'text-[#B91C1C]'}`}>
                        <p className="text-[10px] uppercase tracking-widest font-black">Đã làm</p>
                        <p className="text-sm font-black leading-tight">
                           {scoreOnTen.toFixed(2)}/10
                           <span className="text-[10px] font-bold text-gray-400 ml-1">
                              ({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})
                           </span>
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500">
                          <Clock3 className="h-3.5 w-3.5 text-[#5D7B6F]" />
                          Đã học: {formatStudyDuration(totalStudyMinutes)}
                        </p>
                     </div>
                  )}
            
            <div className="mt-auto relative min-h-[48px]">
              <div className="flex items-center gap-4 py-3 border-t border-[#A4C3A2]/10 font-black transition-all duration-300 group-hover:opacity-0 group-hover:scale-95 group-hover:-translate-y-2">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-[#A4C3A2]">
                     <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">{quiz.questionCount} câu</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-[#A4C3A2]">
                     <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest">{quiz.studentCount} LUYỆN</span>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                 <div className="w-full h-full flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-[#5D7B6F] text-white px-6 py-2.5 rounded-xl shadow-lg shadow-[#5D7B6F]/30 active:scale-95 font-black uppercase tracking-[0.15em] text-[10px]">
                       Ôn tập ngay
                       <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1" />
                    </div>
                 </div>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
