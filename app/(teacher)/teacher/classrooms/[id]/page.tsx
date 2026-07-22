'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { 
  Users, 
  BookOpen, 
  Plus, 
  Copy, 
  Check, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  Key,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  X,
  Edit2
} from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface ClassroomDetail {
  _id: string
  name: string
  code: string
  password?: string | null
  description?: string
  student_count: number
  teacher?: {
    username: string
    email: string
  }
}

interface Member {
  _id: string
  joined_at: string
  is_starred?: boolean
  tags?: string[]
  student?: {
    _id: string
    username: string
    email: string
    avatar_url?: string
  }
}

interface Assignment {
  _id: string
  title: string
  quiz_id: string
  due_at?: string
  quiz?: {
    title: string
    questionCount: number
  }
}

interface StudentReport {
  student_id: string
  username: string
  email: string
  status: string
  best_score: number
  attempts_count: number
  is_passed: boolean
  submitted_at?: string | Date | null
}

export default function TeacherClassroomDetailPage() {
  const params = useParams()
  const classroomId = params.id as string

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Assign Quiz modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [myQuizzes, setMyQuizzes] = useState<any[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [selectedAssignmentReport, setSelectedAssignmentReport] = useState<any | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Student Tag Modal state
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [selectedMemberForTag, setSelectedMemberForTag] = useState<Member | null>(null)
  const [tagInputText, setTagInputText] = useState('')
  const [updatingTags, setUpdatingTags] = useState(false)

  // Confirm delete student state
  const [confirmRemoveStudentId, setConfirmRemoveStudentId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState('')

  const fetchClassroomDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/teacher/classrooms/${classroomId}`)
      const data = await res.json()
      if (res.ok) {
        setClassroom(data.classroom)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/members`)
      const data = await res.json()
      if (res.ok) setMembers(data.members || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/assignments`)
      const data = await res.json()
      if (res.ok) setAssignments(data.assignments || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchMyQuizzes = async () => {
    try {
      const res = await fetch('/api/student/quizzes')
      const data = await res.json()
      if (res.ok) setMyQuizzes(data.quizzes || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (classroomId) {
      fetchClassroomDetail()
      fetchMembers()
      fetchAssignments()
      fetchMyQuizzes()
    }
  }, [classroomId])

  const handleCopyCode = () => {
    if (classroom?.code) {
      navigator.clipboard.writeText(classroom.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAssignQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuizId || !assignmentTitle.trim()) {
      setErrorMessage('Vui lòng chọn Quiz và nhập tiêu đề bài tập')
      return
    }

    try {
      setAssigning(true)
      setErrorMessage('')
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/assignments`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_id: selectedQuizId,
          title: assignmentTitle,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi giao bài tập')

      setAssignModalOpen(false)
      setSelectedQuizId('')
      setAssignmentTitle('')
      setDueAt('')
      fetchAssignments()
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi giao bài')
    } finally {
      setAssigning(false)
    }
  }

  const handleViewReport = async (assignmentId: string) => {
    try {
      setLoadingReport(true)
      setReportModalOpen(true)
      const res = await fetch(`/api/teacher/assignments/${assignmentId}/report`)
      const data = await res.json()
      if (res.ok) {
        setSelectedAssignmentReport(data.report)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingReport(false)
    }
  }

  const handleToggleStar = async (studentId: string) => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/members`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ student_id: studentId, action: 'toggle_star' }),
      })
      if (res.ok) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Lỗi đánh sao học viên:', err)
    }
  }

  const handleOpenTagModal = (m: Member) => {
    setSelectedMemberForTag(m)
    setTagInputText((m.tags || []).join(', '))
    setTagModalOpen(true)
  }

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberForTag?.student?._id) return

    try {
      setUpdatingTags(true)
      const tagsArray = tagInputText.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/members`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          student_id: selectedMemberForTag.student._id,
          action: 'update_tags',
          tags: tagsArray,
        }),
      })
      if (res.ok) {
        setTagModalOpen(false)
        fetchMembers()
      }
    } catch (err) {
      console.error('Lỗi cập nhật thẻ ghi chú:', err)
    } finally {
      setUpdatingTags(false)
    }
  }

  const handleRemoveMember = async (studentId: string) => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/members?student_id=${studentId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmRemoveStudentId(null)
        fetchMembers()
        fetchClassroomDetail()
      } else {
        const data = await res.json()
        alert(data.error || 'Xóa học viên thất bại')
      }
    } catch (err) {
      console.error('Lỗi xóa học viên:', err)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-slate-500 font-semibold">Đang tải thông tin lớp học...</div>
  }

  if (!classroom) {
    return <div className="py-16 text-center text-rose-500 font-semibold">Không tìm thấy lớp học.</div>
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link href="/teacher/classrooms" className="text-sm font-bold text-slate-500 hover:text-[#5D7B6F] inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại Danh sách Lớp
        </Link>
      </div>

      {/* Classroom Banner Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5D7B6F] bg-[#5D7B6F]/10 px-2.5 py-1 rounded-full border border-[#5D7B6F]/20">
              Chi tiết Lớp học
            </span>
            {classroom.password ? (
              <span className="text-[10px] font-bold text-amber-800 bg-[#FFE082]/30 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Key className="w-3 h-3" /> Có Mật khẩu
              </span>
            ) : (
              <span className="text-[10px] font-bold text-[#166534] bg-[#B0D4B8]/30 px-2.5 py-1 rounded-full border border-[#A4C3A2]/40 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Mở công khai
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900">{classroom.name}</h1>
          {classroom.description && <p className="text-slate-500 text-sm font-medium">{classroom.description}</p>}
        </div>

        <div className="flex items-center gap-4 bg-[#F9F9F7] p-3.5 rounded-2xl border border-slate-200/80 shrink-0">
          <div className="text-right text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Sĩ số lớp</div>
            <div className="font-black text-slate-900 text-base">{classroom.student_count} học viên</div>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Mã gia nhập lớp</div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 bg-white border border-[#5D7B6F]/30 text-[#5D7B6F] px-3.5 py-1.5 rounded-xl font-mono font-black text-base hover:bg-[#5D7B6F]/10 transition-colors shadow-2xs cursor-pointer"
              title="Sao chép Mã lớp"
            >
              {copied ? <Check className="w-4 h-4 text-[#166534]" /> : <Copy className="w-4 h-4 text-[#5D7B6F]" />}
              {classroom.code}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-white border border-slate-200/80 p-1 text-slate-600 gap-1">
          <TabsTrigger value="assignments" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-[#5D7B6F] data-[state=active]:text-white transition-all cursor-pointer">
            <BookOpen className="w-4 h-4" /> Bài tập & Quiz ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-[#5D7B6F] data-[state=active]:text-white transition-all cursor-pointer">
            <Users className="w-4 h-4" /> Học viên ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Assignments */}
        <TabsContent value="assignments" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Danh sách Quiz đã giao</h2>
            <Button onClick={() => setAssignModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl gap-2 shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" /> Giao Quiz cho Lớp
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
              <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Chưa giao bài tập nào</h3>
              <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
                Hãy giao bộ đề thi đầu tiên cho học viên trong lớp để bắt đầu theo dõi tiến độ và điểm số.
              </p>
              <Button onClick={() => setAssignModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6 cursor-pointer">
                Giao Quiz đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <Card key={a._id} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-lg font-bold text-slate-900">{a.title}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1 font-medium">
                      Bộ đề: <span className="font-bold text-slate-700">{a.quiz?.title || 'Quiz'}</span> ({a.quiz?.questionCount ?? 0} câu)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-3 pt-3">
                    <div className="text-xs font-semibold text-slate-500">
                      {a.due_at ? (
                        <span>Hạn nộp: <strong className="text-amber-700">{new Date(a.due_at).toLocaleDateString('vi-VN')}</strong></span>
                      ) : (
                        <span>Không giới hạn hạn nộp</span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleViewReport(a._id)}
                      variant="outline"
                      size="sm"
                      className="text-[#5D7B6F] border-[#5D7B6F]/30 hover:bg-[#5D7B6F]/10 font-bold rounded-xl gap-1.5 text-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Xem Báo cáo Điểm
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Members */}
        <TabsContent value="members" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Danh sách Học viên trong lớp ({members.length})</h2>
          </div>

          {members.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
              <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Chưa có học viên nào tham gia</h3>
              <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
                Chia sẻ Mã gia nhập <strong className="text-[#5D7B6F] font-mono font-black">{classroom.code}</strong> cho học viên của bạn để vào lớp.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {members.map((m) => (
                <div key={m._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={() => m.student?._id && handleToggleStar(m.student._id)}
                      className="p-1 rounded-lg hover:bg-amber-50 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                      title={m.is_starred ? 'Bỏ đánh sao học viên' : 'Đánh sao học viên nổi bật'}
                    >
                      <Star className={`w-5 h-5 ${m.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {m.student?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.student.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {m.student?.username?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{m.student?.username || 'Học viên'}</span>
                        {m.is_starred && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            ★ Nổi bật
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{m.student?.email}</div>

                      {/* Student Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {m.tags && m.tags.length > 0 ? (
                          m.tags.map((t, idx) => (
                            <span key={idx} className="text-[11px] font-bold bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20 px-2 py-0.5 rounded-md">
                              #{t}
                            </span>
                          ))
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleOpenTagModal(m)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-[#5D7B6F] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          {m.tags && m.tags.length > 0 ? 'Sửa thẻ' : '+ Thêm thẻ ghi chú'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-xs font-medium text-slate-400">
                      Vào lớp: {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                    </div>

                    {confirmRemoveStudentId === m.student?._id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                        <span className="text-xs font-bold text-rose-700 px-1">Xóa?</span>
                        <Button
                          onClick={() => m.student?._id && handleRemoveMember(m.student._id)}
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7 px-2.5 cursor-pointer"
                        >
                          Xóa
                        </Button>
                        <button
                          onClick={() => setConfirmRemoveStudentId(null)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => m.student?._id && setConfirmRemoveStudentId(m.student._id)}
                        className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa học viên khỏi lớp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal 1: Assign Quiz Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Giao Bài tập Quiz cho Lớp</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Chọn bộ đề Quiz và thiết lập tiêu đề, thời hạn nộp bài.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignQuiz} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-[#FEE2E2] text-[#991B1B] text-sm rounded-xl border border-[#EF5350] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Chọn Bộ đề Quiz (*)</label>
              <select
                value={selectedQuizId}
                onChange={(e) => {
                  setSelectedQuizId(e.target.value)
                  const quiz = myQuizzes.find((q) => q._id === e.target.value)
                  if (quiz && !assignmentTitle) setAssignmentTitle(`Bài tập: ${quiz.title}`)
                }}
                className="w-full h-10 px-3 border rounded-xl text-sm bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5D7B6F]"
                required
              >
                <option value="">-- Chọn Quiz --</option>
                {myQuizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title} ({q.questionCount || 0} câu)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tiêu đề Bài tập (*)</label>
              <Input
                placeholder="Kiểm tra Từ vựng B1"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Hạn nộp (Không bắt buộc)</label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-xl" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={assigning} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl cursor-pointer">
                {assigning ? 'Đang giao...' : 'Giao Bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Báo cáo Bài tập: {selectedAssignmentReport?.assignment?.title}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Tổng số: {selectedAssignmentReport?.total_students ?? 0} học viên | Đã hoàn thành: {selectedAssignmentReport?.completed_students ?? 0} học viên
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingReport ? (
              <div className="py-8 text-center text-slate-500 font-semibold">Đang tải báo cáo...</div>
            ) : !selectedAssignmentReport ? (
              <div className="py-8 text-center text-slate-500 font-semibold">Không có dữ liệu.</div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#EAE7D6]/40 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Học viên</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-center">Điểm cao nhất</th>
                      <th className="p-3 text-center">Số lần làm</th>
                      <th className="p-3 text-right">Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {selectedAssignmentReport.students.map((s: StudentReport) => (
                      <tr key={s.student_id}>
                        <td className="p-3 font-bold text-slate-900">{s.username}</td>
                        <td className="p-3">
                          {s.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#B0D4B8]/30 text-[#166534] border border-[#A4C3A2]/40">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã nộp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Chưa làm
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-black text-[#5D7B6F]">{s.best_score}%</td>
                        <td className="p-3 text-center font-semibold">{s.attempts_count}</td>
                        <td className="p-3 text-right text-xs text-slate-400">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)} className="rounded-xl">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Edit Student Tags Modal */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Gắn Thẻ Ghi Chú Học Viên</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Học viên: {selectedMemberForTag?.student?.username || 'Học viên'} ({selectedMemberForTag?.student?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTags} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Các thẻ ghi chú (Phân cách bởi dấu phẩy)</label>
              <Input
                placeholder="Học giỏi, Cần hỗ trợ, Ban cán sự"
                value={tagInputText}
                onChange={(e) => setTagInputText(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[11px] font-medium text-slate-400">
                Ví dụ: Học giỏi, Đã nộp học phí, Cần kèm thêm từ vựng
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setTagModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={updatingTags} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl cursor-pointer">
                {updatingTags ? 'Đang lưu...' : 'Lưu Thẻ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
