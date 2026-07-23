'use client'

import { useState, useEffect } from 'react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface Classroom {
  _id: string
  name: string
  code: string
  password?: string | null
  description?: string
  student_count: number
  created_at: string
}

export function useTeacherClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [loading, setLoading] = useState(true)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedClassroomForPass, setSelectedClassroomForPass] = useState<Classroom | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [updatingPass, setUpdatingPass] = useState(false)
  const [passMessage, setPassMessage] = useState('')

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedClassroomForShare, setSelectedClassroomForShare] = useState<Classroom | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchClassrooms = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/teacher/classrooms')
      const data = await res.json()
      if (res.ok) {
        setClassrooms(data.classrooms || [])
        setTotalQuizzes(data.totalQuizzes || 0)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên lớp học')
      return
    }

    try {
      setCreating(true)
      setErrorMessage('')
      const res = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, description, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Tạo lớp học thất bại')
      }

      setName('')
      setDescription('')
      setPassword('')
      setCreateModalOpen(false)
      fetchClassrooms()
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenPasswordModal = (c: Classroom) => {
    setSelectedClassroomForPass(c)
    setNewPassword(c.password || '')
    setPassMessage('')
    setPasswordModalOpen(true)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroomForPass) return

    try {
      setUpdatingPass(true)
      setPassMessage('')
      const res = await fetch(`/api/teacher/classrooms/${selectedClassroomForPass._id}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật mật khẩu thất bại')
      }

      setPassMessage('Đã cập nhật mật khẩu lớp học thành công!')
      setTimeout(() => {
        setPasswordModalOpen(false)
        fetchClassrooms()
      }, 1200)
    } catch (err: any) {
      setPassMessage(err.message || 'Lỗi khi cập nhật mật khẩu')
    } finally {
      setUpdatingPass(false)
    }
  }

  const handleOpenShareModal = (c: Classroom) => {
    setSelectedClassroomForShare(c)
    setShareCopied(false)
    setShareModalOpen(true)
  }

  const getShareUrl = (c: Classroom) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    return `${origin}/student/classrooms?joinCode=${c.code}`
  }

  const handleCopyShareUrl = (c: Classroom) => {
    const url = getShareUrl(c)
    navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  const handleDeleteClassroom = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmDeleteId(null)
        fetchClassrooms()
      } else {
        const data = await res.json()
        alert(data.error || 'Xóa lớp học thất bại')
      }
    } catch (err) {
      console.error('Lỗi khi xóa lớp học:', err)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const totalStudents = classrooms.reduce((acc, c) => acc + (c.student_count || 0), 0)

  return {
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
  }
}
