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
import { useToast } from '@/store/shared/toast-store'

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
  const { toast } = useToast()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.error(data.error || 'Xóa học viên thất bại')
      }
    } catch (err) {
      console.error('Lỗi xóa học viên:', err)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground font-semibold">Đang tải thông tin lớp học...</div>
  }

  if (!classroom) {
    return <div className="py-16 text-center text-destructive font-semibold">Không tìm thấy lớp học.</div>
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link href="/teacher/classrooms" className="text-sm font-bold text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại Danh sách Lớp
        </Link>
      </div>

      {/* Classroom Banner Card */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Chi tiết Lớp học
            </span>
            {classroom.password ? (
              <span className="text-[10px] font-bold text-warning-fg bg-warning-bg px-2.5 py-1 rounded-full border border-warning-border flex items-center gap-1">
                <Key className="w-3 h-3" /> Có Mật khẩu
              </span>
            ) : (
              <span className="text-[10px] font-bold text-success-fg bg-success-bg px-2.5 py-1 rounded-full border border-success-border flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Mở công khai
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-card-foreground">{classroom.name}</h1>
          {classroom.description && <p className="text-muted-foreground text-sm font-medium">{classroom.description}</p>}
        </div>

        <div className="flex items-center gap-4 bg-muted/60 p-3.5 rounded-2xl border border-border shrink-0">
          <div className="text-right text-xs">
            <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Sĩ số lớp</div>
            <div className="font-black text-card-foreground text-base">{classroom.student_count} học viên</div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div>
            <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mb-0.5">Mã gia nhập lớp</div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 bg-card border border-primary/30 text-primary px-3.5 py-1.5 rounded-xl font-mono font-black text-base hover:bg-primary/10 transition-colors shadow-2xs cursor-pointer"
              title="Sao chép Mã lớp"
            >
              {copied ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4 text-primary" />}
              {classroom.code}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-card border border-border p-1 text-muted-foreground gap-1">
          <TabsTrigger value="assignments" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer">
            <BookOpen className="w-4 h-4" /> Bài tập & Quiz ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer">
            <Users className="w-4 h-4" /> Học viên ({members.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Assignments */}
        <TabsContent value="assignments" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-card-foreground">Danh sách Quiz đã giao</h2>
            <Button onClick={() => setAssignModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" /> Giao Quiz cho Lớp
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-card-foreground">Chưa giao bài tập nào</h3>
              <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
                Hãy giao bộ đề thi đầu tiên cho học viên trong lớp để bắt đầu theo dõi tiến độ và điểm số.
              </p>
              <Button onClick={() => setAssignModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 cursor-pointer">
                Giao Quiz đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <Card key={a._id} className="border border-border shadow-xs hover:shadow-md transition-all rounded-2xl bg-card overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-lg font-bold text-card-foreground">{a.title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1 font-medium">
                      Bộ đề: <span className="font-bold text-card-foreground">{a.quiz?.title || 'Quiz'}</span> ({a.quiz?.questionCount ?? 0} câu)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex items-center justify-between border-t border-border mt-3 pt-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {a.due_at ? (
                        <span>Hạn nộp: <strong className="text-warning-fg">{new Date(a.due_at).toLocaleDateString('vi-VN')}</strong></span>
                      ) : (
                        <span>Không giới hạn hạn nộp</span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleViewReport(a._id)}
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary/30 hover:bg-primary/10 font-bold rounded-xl gap-1.5 text-xs cursor-pointer"
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
            <h2 className="text-lg font-black text-card-foreground">Danh sách Học viên trong lớp ({members.length})</h2>
          </div>

          {members.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-card-foreground">Chưa có học viên nào tham gia</h3>
              <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
                Chia sẻ Mã gia nhập <strong className="text-primary font-mono font-black">{classroom.code}</strong> cho học viên của bạn để vào lớp.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border">
              {members.map((m) => (
                <div key={m._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={() => m.student?._id && handleToggleStar(m.student._id)}
                      className="p-1 rounded-lg hover:bg-warning-bg text-muted-foreground hover:text-warning-fg transition-colors cursor-pointer"
                      title={m.is_starred ? 'Bỏ đánh sao học viên' : 'Đánh sao học viên nổi bật'}
                    >
                      <Star className={`w-5 h-5 ${m.is_starred ? 'fill-warning-fg text-warning-fg' : ''}`} />
                    </button>

                    {m.student?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.student.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center text-sm shadow-xs">
                        {m.student?.username?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-card-foreground text-sm">{m.student?.username || 'Học viên'}</span>
                        {m.is_starred && (
                          <span className="text-[10px] font-bold bg-warning-bg text-warning-fg px-2 py-0.5 rounded-full border border-warning-border flex items-center gap-1">
                            ★ Nổi bật
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.student?.email}</div>

                      {/* Student Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {m.tags && m.tags.length > 0 ? (
                          m.tags.map((t, idx) => (
                            <span key={idx} className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                              #{t}
                            </span>
                          ))
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleOpenTagModal(m)}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          {m.tags && m.tags.length > 0 ? 'Sửa thẻ' : '+ Thêm thẻ ghi chú'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      Vào lớp: {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                    </div>

                    {confirmRemoveStudentId === m.student?._id ? (
                      <div className="flex items-center gap-1.5 bg-incorrect-bg p-1 rounded-xl border border-incorrect-border">
                        <span className="text-xs font-bold text-destructive px-1">Xóa?</span>
                        <Button
                          onClick={() => m.student?._id && handleRemoveMember(m.student._id)}
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs rounded-lg h-7 px-2.5 cursor-pointer"
                        >
                          Xóa
                        </Button>
                        <button
                          onClick={() => setConfirmRemoveStudentId(null)}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => m.student?._id && setConfirmRemoveStudentId(m.student._id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors cursor-pointer"
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
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Giao Bài tập Quiz cho Lớp</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Chọn bộ đề Quiz và thiết lập tiêu đề, thời hạn nộp bài.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignQuiz} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Chọn Bộ đề Quiz (*)</label>
              <select
                value={selectedQuizId}
                onChange={(e) => {
                  setSelectedQuizId(e.target.value)
                  const quiz = myQuizzes.find((q) => q._id === e.target.value)
                  if (quiz && !assignmentTitle) setAssignmentTitle(`Bài tập: ${quiz.title}`)
                }}
                className="w-full h-10 px-3 border rounded-xl text-sm bg-card text-card-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="text-sm font-semibold text-card-foreground">Tiêu đề Bài tập (*)</label>
              <Input
                placeholder="Nhập tiêu đề bài tập cần giao..."
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                required
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Hạn nộp (Không bắt buộc)</label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-xl border-border bg-card text-card-foreground" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl border-border">
                Hủy
              </Button>
              <Button type="submit" disabled={assigning} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {assigning ? 'Đang giao...' : 'Giao Bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Báo cáo Bài tập: {selectedAssignmentReport?.assignment?.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Tổng số: {selectedAssignmentReport?.total_students ?? 0} học viên | Đã hoàn thành: {selectedAssignmentReport?.completed_students ?? 0} học viên
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingReport ? (
              <div className="py-8 text-center text-muted-foreground font-semibold">Đang tải báo cáo...</div>
            ) : !selectedAssignmentReport ? (
              <div className="py-8 text-center text-muted-foreground font-semibold">Không có dữ liệu.</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-card-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-3">Học viên</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-center">Điểm cao nhất</th>
                      <th className="p-3 text-center">Số lần làm</th>
                      <th className="p-3 text-right">Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {selectedAssignmentReport.students.map((s: StudentReport) => (
                      <tr key={s.student_id}>
                        <td className="p-3 font-bold text-card-foreground">{s.username}</td>
                        <td className="p-3">
                          {s.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-success-bg text-success-fg border border-success-border">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã nộp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border">
                              <Clock className="w-3.5 h-3.5" /> Chưa làm
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-black text-primary">{s.best_score}%</td>
                        <td className="p-3 text-center font-semibold">{s.attempts_count}</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
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
            <Button variant="outline" onClick={() => setReportModalOpen(false)} className="rounded-xl border-border">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Edit Student Tags Modal */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Gắn Thẻ Ghi Chú Học Viên</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Học viên: {selectedMemberForTag?.student?.username || 'Học viên'} ({selectedMemberForTag?.student?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTags} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Các thẻ ghi chú (Phân cách bởi dấu phẩy)</label>
              <Input
                placeholder="Học giỏi, Cần hỗ trợ, Ban cán sự"
                value={tagInputText}
                onChange={(e) => setTagInputText(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
              <p className="text-[11px] font-medium text-muted-foreground">
                Ví dụ: Học giỏi, Đã nộp học phí, Cần kèm thêm từ vựng
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setTagModalOpen(false)} className="rounded-xl border-border">
                Hủy
              </Button>
              <Button type="submit" disabled={updatingTags} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {updatingTags ? 'Đang lưu...' : 'Lưu Thẻ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
