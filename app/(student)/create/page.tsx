'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Trash2, 
  Save, 
  LayoutDashboard, 
  PlusCircle, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  HelpCircle,
  ImageIcon,
  X,
  ChevronRight,
  AlertCircle,
  Hash,
  ArrowLeft,
  Target,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/lib/store/toast-store'
import { cn } from '@/lib/utils'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'
import { ImageUpload } from '@/components/quiz/ImageUpload'
import { withCsrfHeaders } from '@/lib/csrf'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

interface QuestionForm {
  text: string
  options: string[]
  correct_answer: number[]
  explanation: string
  image_url: string
}

function emptyQuestion(): QuestionForm {
  return {
    text: '',
    options: ['', '', '', ''],
    correct_answer: [],
    explanation: '',
    image_url: '',
  }
}

export default function StudentCreateQuizPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // 1. Metadata State
  const [courseCode, setCourseCode] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()])
  
  // 2. Bulk Creation State (Target Count)
  const [targetCount, setTargetCount] = useState(1)
  const [targetInput, setTargetInput] = useState('1')

  // 3. Inline Category Creation State
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // 4. Status State
  const [isSaving, setIsSaving] = useState(false)

  // 5. Fetch Private Categories
  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['student', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/student/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    }
  })
  const categories = catData?.categories || []

  // 6. Diagnostics
  const diagnostics = useMemo(() => {
    const fullData = {
       title: courseCode ? `Bộ đề ${courseCode}` : '',
       category_id: selectedCategoryId,
       course_code: courseCode,
       questions
    }
    return analyzeQuizCompleteness(fullData, targetCount)
  }, [courseCode, selectedCategoryId, questions, targetCount])

  // 7. Question / Target Handlers
  function applyTargetCount(raw: string) {
    const n = Math.max(1, Math.min(200, parseInt(raw) || 1))
    setTargetCount(n)
    setTargetInput(String(n))
    setQuestions((prev) => {
      const cur = prev.length
      if (n > cur) return [...prev, ...Array.from({ length: n - cur }, emptyQuestion)]
      if (n < cur) return prev.slice(0, n)
      return prev
    })
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()])
    setTargetCount(prev => prev + 1)
    setTargetInput(String(targetCount + 1))
  }
  
  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setTargetCount(prev => prev - 1)
    setTargetInput(String(targetCount - 1))
  }

  const updateQuestion = (idx: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev => {
      const next = [...prev]
      const nextOptions = [...next[qIdx].options]
      nextOptions[oIdx] = value
      next[qIdx] = { ...next[qIdx], options: nextOptions }
      return next
    })
  }

  const toggleCorrect = (qIdx: number, oIdx: number) => {
    setQuestions(prev => {
      const next = [...prev]
      const currentCorrect = next[qIdx].correct_answer
      const isAlready = currentCorrect.includes(oIdx)
      next[qIdx] = {
        ...next[qIdx],
        correct_answer: isAlready 
          ? currentCorrect.filter(a => a !== oIdx)
          : [...currentCorrect, oIdx].sort()
      }
      return next[qIdx].correct_answer.length > 0 ? next : next // Allow multi-select
    })
  }

  // 8. Mutations
  const createCatMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/student/categories', {
        method: 'POST',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error('Lỗi khi tạo danh mục')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      setSelectedCategoryId(data.category._id)
      setIsAddingCategory(false)
      setNewCatName('')
      toast.success('Đã tạo danh mục mới!')
    }
  })

  // 9. Main Save Handler with Cleanup
  const handleSave = async () => {
    if (!courseCode.trim() || !selectedCategoryId) {
      toast.error('Vui lòng nhập Mã Quiz và chọn Danh mục.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Smart Cleanup & Validation
    const cleanedQuestions = questions.map(q => {
      const filteredOptions = q.options.filter(o => o.trim() !== '')
      // Adjust correct_answer indices if needed
      const oldOptions = q.options
      const newCorrect = q.correct_answer
        .filter(idx => oldOptions[idx]?.trim() !== '')
        .map(idx => {
          const content = oldOptions[idx]
          return filteredOptions.indexOf(content)
        })
        .filter(idx => idx !== -1)

      return {
        ...q,
        options: filteredOptions,
        correct_answer: newCorrect
      }
    })

    if (cleanedQuestions.some(q => !q.text.trim() || q.correct_answer.length === 0)) {
       toast.error('Vui lòng hoàn thiện nội dung và đáp án cho tất cả câu hỏi.')
       return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/student/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: courseCode.trim().toUpperCase(),
          category_id: selectedCategoryId,
          questions: cleanedQuestions
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lưu thất bại')
      }

      toast.success('Đã lưu bộ đề thành công!')
      router.push('/my-quizzes')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-[#5D7B6F]', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#5D7B6F]', 'ring-offset-2'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#5D7B6F]/5">
         <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                  <ArrowLeft className="w-5 h-5 text-[#5D7B6F]" />
               </Button>
               <div>
                  <h1 className="text-xl font-black text-[#5D7B6F] tracking-tight">Sáng tạo bộ đề mới</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Trình soạn thảo chuyên nghiệp • Bản quyền cá nhân</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <Button 
                 onClick={handleSave} 
                 disabled={isSaving}
                 className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white px-8 rounded-xl font-black shadow-lg shadow-[#5D7B6F]/20 transition-all active:scale-95"
               >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Lưu bộ đề</>}
               </Button>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. METADATA SECTION */}
            <Card className="border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden bg-white">
               <CardHeader className="bg-[#5D7B6F]/5 border-b border-[#5D7B6F]/5 p-6">
                 <CardTitle className="text-[#5D7B6F] flex items-center gap-2 text-lg font-black">
                   <Settings2 className="w-5 h-5 text-[#A4C3A2]" /> Thông tin cơ bản
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest pl-1">Mã Quiz / Mã hiệu</label>
                        <Input 
                          placeholder="Nhập mã định danh (Ví dụ: HK1, DE-01...)" 
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          className="h-14 rounded-2xl border-[#5D7B6F]/10 focus:border-[#5D7B6F] bg-gray-50/50 font-black text-[#5D7B6F] text-lg"
                        />
                     </div>
                     
                     <div className="space-y-4">
                        <div className="flex items-center justify-between pl-1">
                           <label className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest">Danh mục lưu trữ</label>
                           <button 
                             onClick={() => {
                                if (!isAddingCategory && categories.length >= 5) {
                                   toast.error('Bạn đã đạt giới hạn tối đa 5 danh mục cá nhân.')
                                   return
                                }
                                setIsAddingCategory(!isAddingCategory)
                             }}
                             className={cn(
                               "text-xs font-black transition-all flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm hover:shadow-md active:scale-95 border",
                               isAddingCategory 
                                ? "bg-red-50 border-red-100 text-red-500" 
                                : "bg-white border-[#5D7B6F]/20 text-[#5D7B6F]"
                             )}
                           >
                              {isAddingCategory ? <><X className="w-3.5 h-3.5" /> Hủy bỏ</> : <><Plus className="w-4 h-4" /> Tạo danh mục mới</>}
                           </button>
                        </div>

                        <div className="space-y-4">
                          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                            <SelectTrigger className="h-14 rounded-2xl border-[#5D7B6F]/10 bg-gray-50/50 font-bold text-[#5D7B6F]">
                              <SelectValue placeholder={catsLoading ? "Đang tải dữ liệu..." : "— Chọn danh mục phù hợp —"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-[#5D7B6F]/10 shadow-2xl">
                               {categories.length === 0 && <div className="p-4 text-center text-xs text-gray-400 font-bold italic">Bạn chưa có danh mục. Hãy tạo ngay!</div>}
                               {categories.map((cat: any) => (
                                 <SelectItem key={cat._id} value={cat._id} className="font-bold rounded-xl py-2.5">
                                   {cat.name}
                                 </SelectItem>
                               ))}
                            </SelectContent>
                          </Select>

                          {isAddingCategory && (
                             <div className="animate-in slide-in-from-top-4 duration-300 space-y-2">
                                <div className="flex gap-2">
                                   <Input 
                                     autoFocus
                                     placeholder="Tên danh mục mới"
                                     value={newCatName}
                                     onChange={(e) => setNewCatName(e.target.value)}
                                     className="h-14 rounded-2xl border-2 border-dashed border-[#5D7B6F]/30 font-bold bg-white"
                                   />
                                   <Button 
                                     onClick={() => newCatName.trim() && createCatMutation.mutate(newCatName)}
                                     disabled={createCatMutation.isPending || !newCatName.trim()}
                                     className="h-14 w-14 bg-[#5D7B6F] rounded-2xl shrink-0 shadow-lg shadow-[#5D7B6F]/20"
                                   >
                                      {createCatMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-white" />}
                                   </Button>
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 pl-2 uppercase tracking-widest">
                                   Bạn đang tạo danh mục thứ {categories.length + 1} (Tối đa 5)
                                </p>
                             </div>
                          )}
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* 2. BULK CONTROL (TARGET COUNT) */}
            <Card className="border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden bg-white/80 border border-white/40">
               <div className="p-8 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-8">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest flex items-center gap-2">
                           <Target className="w-3.5 h-3.5 text-[#A4C3A2]" /> Số câu hỏi mục tiêu
                        </p>
                        <div className="flex items-center gap-3">
                           <Input 
                             type="number"
                             value={targetInput}
                             onChange={(e) => setTargetInput(e.target.value)}
                             onBlur={() => applyTargetCount(targetInput)}
                             onKeyDown={(e) => e.key === 'Enter' && applyTargetCount(targetInput)}
                             className="w-20 h-12 rounded-xl text-center font-black border-[#5D7B6F]/10 focus:ring-0 focus:border-[#5D7B6F] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter w-24 leading-snug">
                              Tự động tạo thẻ câu hỏi trống
                           </div>
                        </div>
                     </div>
                     <div className="h-12 w-px bg-gray-100 hidden md:block" />
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiến độ soạn thảo</p>
                        <div className="flex items-center gap-4">
                           <Progress value={diagnostics.progressPercent} className="h-2 w-32 bg-gray-100/50" />
                           <span className="text-sm font-black text-[#5D7B6F]">{diagnostics.progressPercent}%</span>
                        </div>
                     </div>
                  </div>

                  <Badge className={cn("rounded-lg px-4 py-2 font-black text-[10px] border-none shadow-sm", diagnostics.isValid ? "bg-[#A4C3A2] text-white" : "bg-orange-100 text-orange-600")}>
                     {diagnostics.isValid ? 'SẴN SÀNG LƯU TRỮ' : 'CẦN HOÀN THIỆN NỘI DUNG'}
                  </Badge>
               </div>
            </Card>

            {/* 3. QUESTIONS LIST */}
            <div className="space-y-8">
               {questions.map((q, qIdx) => (
                  <Card key={qIdx} id={`q-card-${qIdx}`} className={cn(
                    "border-none shadow-2xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden bg-white transition-all duration-300",
                    diagnostics.errors.some(e => e.questionIndex === qIdx) ? "ring-1 ring-red-100" : ""
                  )}>
                     <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between border-b border-gray-50">
                        <CardTitle className="text-[#5D7B6F] text-base font-black flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/5 flex items-center justify-center text-xs text-[#5D7B6F]">
                              {qIdx + 1}
                           </div>
                           Câu hỏi chính
                        </CardTitle>
                        {questions.length > 1 && (
                           <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIdx)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        )}
                     </CardHeader>
                     <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nội dung câu hỏi</label>
                           <Textarea 
                             placeholder={`Bạn muốn hỏi gì ở câu thứ ${qIdx + 1}?`}
                             value={q.text}
                             onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                             className="min-h-[120px] rounded-2xl border-[#5D7B6F]/5 bg-gray-50/30 text-lg font-bold focus:bg-white transition-all p-6"
                           />
                        </div>

                        <div className="space-y-5">
                           <div className="flex items-center justify-between pl-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                 Đáp án lựa chọn <span className="text-[9px] text-[#A4C3A2]">(Click chữ cái để chọn đúng)</span>
                              </p>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{q.options.length}/6</span>
                           </div>
                           
                           <div className="space-y-3">
                              {q.options.map((opt, oIdx) => {
                                 const isCorrect = q.correct_answer.includes(oIdx)
                                 const label = OPTION_LABELS[oIdx]
                                 return (
                                    <div key={oIdx} className="flex gap-4 group">
                                       <button 
                                         onClick={() => toggleCorrect(qIdx, oIdx)}
                                         title={`Đáp án ${label} là đúng`}
                                         className={cn(
                                           "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all active:scale-90 border-2",
                                           isCorrect 
                                            ? "bg-[#5D7B6F] border-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20 scale-105" 
                                            : "bg-white border-gray-100 text-gray-400 hover:border-[#A4C3A2] hover:text-[#5D7B6F]"
                                         )}
                                       >
                                          {label}
                                       </button>
                                       
                                       <div className="relative flex-1">
                                          <Input 
                                            value={opt}
                                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                            placeholder={`Đáp án ${label}...`}
                                            className={cn(
                                              "h-12 rounded-xl border-[#5D7B6F]/5 font-bold transition-all pr-12",
                                              isCorrect ? "bg-[#A4C3A2]/5 border-[#A4C3A2]/20" : "bg-gray-50/50 focus:bg-white"
                                            )}
                                          />
                                          {q.options.length > 2 && (
                                             <button 
                                               onClick={() => {
                                                 const nextOptions = q.options.filter((_, i) => i !== oIdx)
                                                 const nextCorrect = q.correct_answer
                                                   .filter(a => a !== oIdx)
                                                   .map(a => a > oIdx ? a - 1 : a)
                                                 updateQuestion(qIdx, 'options', nextOptions)
                                                 updateQuestion(qIdx, 'correct_answer', nextCorrect)
                                               }}
                                               title="Xóa đáp án này"
                                               className={cn(
                                                  "absolute right-4 top-1/2 -translate-y-1/2 transition-all",
                                                  "text-gray-300 hover:text-red-500 bg-white shadow-sm p-1 rounded-md",
                                                  "opacity-100 lg:opacity-0 lg:group-hover:opacity-100" // Always visible on mobile, hover on desktop
                                               )}
                                             >
                                                <X className="w-4 h-4" />
                                             </button>
                                          )}
                                       </div>
                                    </div>
                                 )
                              })}
                           </div>

                           {q.options.length < 6 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => updateQuestion(qIdx, 'options', [...q.options, ''])}
                                className="text-[11px] font-black text-[#A4C3A2] hover:text-[#5D7B6F] hover:bg-transparent p-0 h-auto gap-2 ml-1"
                              >
                                 <PlusCircle className="w-4 h-4" /> THÊM LỰA CHỌN MỚI
                              </Button>
                           )}
                        </div>

                        {/* Image & Explanation */}
                        <div className="pt-6 space-y-10 border-t border-gray-50">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                 <ImageIcon className="w-4 h-4" /> Hình ảnh minh họa (Tùy chọn)
                              </label>
                              <div className="max-w-md">
                                 <ImageUpload 
                                   value={q.image_url}
                                   onChange={(url) => updateQuestion(qIdx, 'image_url', url)}
                                   onRemove={() => updateQuestion(qIdx, 'image_url', '')}
                                 />
                              </div>
                           </div>
                           
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                 <HelpCircle className="w-4 h-4" /> Giải thích chi tiết (Tùy chọn)
                              </label>
                              <Textarea 
                                placeholder="Gợi ý/Giải thích giúp bạn ghi nhớ sâu kiến thức hơn..."
                                value={q.explanation}
                                onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                                className="min-h-[160px] rounded-2xl border-[#5D7B6F]/5 bg-gray-50/30 font-medium text-base focus:bg-white transition-all shadow-inner p-8"
                              />
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))}

               <Button 
                 variant="outline" 
                 onClick={addQuestion}
                 className="w-full h-20 rounded-[32px] border-2 border-dashed border-[#5D7B6F]/20 text-[#5D7B6F] font-black hover:bg-[#5D7B6F]/5 transition-all text-base shadow-sm active:scale-[0.99]"
               >
                  <PlusCircle className="w-6 h-6 mr-3" /> THÊM CÂU HỎI THỦ CÔNG
               </Button>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
             <Card className="border-none shadow-2xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden bg-white h-fit max-h-[70vh] flex flex-col">
                <div className="p-6 bg-[#5D7B6F] flex items-center justify-between">
                   <div className="flex items-center gap-2 text-white">
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Danh mục lỗi</span>
                   </div>
                   <Badge className="bg-white/20 text-white border-none font-black text-[10px]">{diagnostics.errors.length}</Badge>
                </div>
                
                <ScrollArea className="flex-1 p-6">
                   {diagnostics.errors.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                         <div className="w-16 h-16 rounded-full bg-[#A4C3A2]/10 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-[#5D7B6F]" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F]">Mọi thứ đã chuẩn xác!</p>
                      </div>
                   ) : (
                      <div className="space-y-4">
                        {diagnostics.errors.map((err, i) => (
                           <button 
                             key={i}
                             onClick={() => err.questionIndex !== undefined && scrollToQuestion(err.questionIndex)}
                             className="w-full text-left p-5 rounded-2xl bg-gray-50 border border-transparent hover:border-[#5D7B6F]/20 hover:bg-white transition-all flex items-start gap-4 group"
                           >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5",
                                err.severity === 'error' ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                              )}>
                                 {err.questionIndex !== undefined ? err.questionIndex + 1 : '!'}
                              </div>
                              <div className="flex-1">
                                 <p className="text-[11px] font-bold text-gray-700 leading-snug group-hover:text-[#5D7B6F]">{err.message}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-[#5D7B6F] transition-colors" />
                           </button>
                        ))}
                      </div>
                   )}
                </ScrollArea>
             </Card>

             <div className="p-8 bg-[#5D7B6F]/5 rounded-[32px] border border-[#5D7B6F]/10 space-y-6">
                <div className="flex items-center gap-3 text-[#5D7B6F]">
                   <HelpCircle className="w-5 h-5 text-[#A4C3A2]" />
                   <h3 className="font-black text-xs uppercase tracking-wider">Thông tin hữu ích</h3>
                </div>
                <div className="space-y-5">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest">Tiết kiệm thời gian</p>
                      <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Nhập số vào ô "Số câu hỏi mục tiêu" để hệ thống tự dàn trang cho bạn.</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest">Tự động dọn dẹp</p>
                      <p className="text-[11px] text-gray-500 font-bold leading-relaxed">Bộ đề sẽ tự động xóa các ô đáp án bỏ trống khi bạn nhấn Lưu bài.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
