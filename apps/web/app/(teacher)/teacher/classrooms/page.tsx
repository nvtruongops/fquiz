'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'
import { 
  Users, School, Plus, BookOpen, Copy, Check, ShieldCheck, AlertCircle, Eye, EyeOff, FileText, MoreVertical, Key, Share2, Trash2, Loader2
} from 'lucide-react'

import { useTeacherClassrooms, Classroom } from '@/hooks/useTeacherClassrooms'

export default function TeacherClassroomsPage() {
  const {
    classrooms,
    totalQuizzes,
    loading,
    createModalOpen, setCreateModalOpen,
    name, setName,
    description, setDescription,
    password, setPassword,
    showPassword, setShowPassword,
    creating, errorMessage,
    handleCreateClassroom,
    passwordModalOpen, setPasswordModalOpen,
    selectedClassroomForPass,
    newPassword, setNewPassword,
    showNewPassword, setShowNewPassword,
    updatingPass, passMessage,
    handleOpenPasswordModal, handleUpdatePassword,
    shareModalOpen, setShareModalOpen,
    selectedClassroomForShare,
    shareCopied,
    handleOpenShareModal, handleCopyShareUrl, getShareUrl,
    confirmDeleteId, setConfirmDeleteId,
    copiedCode, handleCopyCode,
    handleDeleteClassroom,
    totalStudents,
  } = useTeacherClassrooms()

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Teacher Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-card-foreground flex items-center gap-3">
            <School className="w-8 h-8 text-primary" />
            Quản lý Lớp học &amp; Giảng dạy
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Tạo và quản lý lớp học, cấp mã gia nhập cho học viên và giao bài tập trắc nghiệm từ kho đề FQuiz.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/teacher/quizzes">
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all">
              <FileText className="w-5 h-5" /> Quản lý Đề thi
            </Button>
          </Link>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer">
            <Plus className="w-5 h-5" /> Tạo Lớp học mới
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
          <School className="w-6 h-6 text-primary" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Lớp học hoạt động</span>
            <span className="text-2xl font-black text-card-foreground">{classrooms.length}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-success-border shadow-xs flex items-center gap-4">
          <Users className="w-6 h-6 text-success-fg" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Tổng số Học viên</span>
            <span className="text-2xl font-black text-card-foreground">{totalStudents}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-warning-border shadow-xs flex items-center gap-4">
          <BookOpen className="w-6 h-6 text-warning-fg" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Đề thi do tôi tạo</span>
            <span className="text-2xl font-black text-card-foreground">{totalQuizzes}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-success-border shadow-xs flex items-center gap-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Trạng thái giảng dạy</span>
            <span className="text-xs font-black text-success-fg bg-success-bg px-2 py-0.5 rounded-full border border-success-border">Sẵn sàng</span>
          </div>
        </div>
      </div>

      {/* Classroom List Grid */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground font-semibold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
          <h3 className="text-xl font-black text-card-foreground">Chưa có lớp học nào</h3>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 cursor-pointer">
            Tạo Lớp học đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((c: Classroom) => (
            <Card key={c._id} className="border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-lg font-bold text-card-foreground truncate">{c.name}</CardTitle>
                    {c.description && <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</CardDescription>}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-1.5 rounded-xl text-muted-foreground hover:text-card-foreground hover:bg-muted cursor-pointer">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-1.5 border-border bg-popover text-popover-foreground rounded-2xl shadow-xl z-50">
                      <DropdownMenuItem onClick={() => handleOpenPasswordModal(c)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-card-foreground cursor-pointer hover:bg-muted">
                        <Key className="w-4 h-4 text-primary" /><span className="text-xs">{c.password ? 'Đổi mật khẩu' : 'Thêm mật khẩu'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenShareModal(c)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-card-foreground cursor-pointer hover:bg-muted">
                        <Share2 className="w-4 h-4 text-success-fg" /><span className="text-xs">Chia sẻ link</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirmDeleteId(c._id)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-destructive cursor-pointer hover:bg-incorrect-bg">
                        <Trash2 className="w-4 h-4 text-destructive" /><span className="text-xs">Xóa lớp</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 text-xs space-y-3">
                <div className="flex items-center justify-between bg-muted/60 p-2.5 rounded-xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Mã gia nhập</span>
                    <span className="font-mono font-black text-card-foreground text-sm tracking-wider">{c.code}</span>
                  </div>
                  <button onClick={() => handleCopyCode(c.code)} className="p-1.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-card-foreground cursor-pointer">
                    {copiedCode === c.code ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Create Classroom */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Tạo Lớp học mới</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Nhập tên lớp học và cài đặt mật khẩu gia nhập (nếu cần).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClassroom} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Tên Lớp học (*)</label>
              <Input
                placeholder="Lớp Tiếng Anh B1 - K24"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Mô tả lớp học</label>
              <Input
                placeholder="Mô tả ngắn về lớp học"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Mật khẩu tham gia lớp (Không bắt buộc)</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu (Bỏ trống nếu cho phép vào tự do)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl pr-10 border-border bg-card text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl border-border">Hủy</Button>
              <Button type="submit" disabled={creating} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {creating ? 'Đang tạo...' : 'Tạo Lớp'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Cấu hình Mật khẩu Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedClassroomForPass && `Lớp: ${selectedClassroomForPass.name} (Mã: ${selectedClassroomForPass.code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 py-2">
            {passMessage && (
              <div className="p-3 bg-success-bg text-success-fg text-sm rounded-xl border border-success-border flex items-center gap-2">
                <Check className="w-4 h-4 text-success-fg shrink-0" />
                <span>{passMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Mật khẩu mới (Để trống để bỏ mật khẩu)</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới hoặc xóa trắng"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl pr-10 border-border bg-card text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)} className="rounded-xl border-border">Hủy</Button>
              <Button type="submit" disabled={updatingPass} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {updatingPass ? 'Đang lưu...' : 'Lưu Mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Share Link Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Chia sẻ Link Tham gia Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Gửi liên kết này cho học viên để gia nhập lớp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedClassroomForShare && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">Liên kết trực tiếp</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getShareUrl(selectedClassroomForShare)}
                    className="rounded-xl text-xs bg-muted font-mono border-border text-card-foreground"
                  />
                  <Button
                    onClick={() => handleCopyShareUrl(selectedClassroomForShare)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 gap-1.5 cursor-pointer"
                  >
                    {shareCopied ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4" />}
                    {shareCopied ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareModalOpen(false)} className="rounded-xl border-border">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Classroom Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Xác nhận xóa lớp học</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa lớp học này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-xl border-border">Hủy</Button>
            <Button
              type="button"
              onClick={() => confirmDeleteId && handleDeleteClassroom(confirmDeleteId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-xl cursor-pointer"
            >
              Xóa Lớp học
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
