'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface Classroom {
  _id: string
  name: string
  code: string
  description?: string
  student_count: number
  is_pinned?: boolean
  teacher?: {
    username: string
    avatar_url?: string
    email: string
  }
}

export interface Assignment {
  _id: string
  title: string
  description?: string
  quiz_id: string
  classroom_id: string
  due_at?: string
  time_limit_minutes?: number
  pass_score_percent?: number
  quiz?: {
    title: string
    questionCount: number
  }
  my_progress?: {
    best_score: number
    status: string
    is_passed: boolean
  }
}

export function useStudentClassrooms() {
  const searchParams = useSearchParams()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [joining, setJoining] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)

  useEffect(() => {
    const codeParam = searchParams?.get('joinCode')
    if (codeParam && codeParam.trim().length === 6) {
      setJoinCode(codeParam.trim().toUpperCase())
      setJoinModalOpen(true)
    }
  }, [searchParams])

  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/classrooms')
      const data = await res.json()
      if (res.ok) {
        const list = data.classrooms || []
        setClassrooms(list)
        setSelectedClassroom(prev => prev || (list.length > 0 ? list[0] : null))
      }
    } catch (err) {
      console.error('Lỗi tải lớp học:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAssignments = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/student/classrooms/${classroomId}/assignments`)
      const data = await res.json()
      if (res.ok) {
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Lỗi tải bài tập:', err)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    if (selectedClassroom) {
      fetchAssignments(selectedClassroom._id)
    }
  }, [selectedClassroom])

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim() || joinCode.length !== 6) {
      setErrorMessage('Mã lớp học phải có đúng 6 ký tự')
      return
    }

    try {
      setJoining(true)
      setErrorMessage('')
      const res = await fetch('/api/student/classrooms/join', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          password: joinPassword.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gia nhập lớp học thất bại')
      }

      setSuccessMessage(data.message || 'Gia nhập lớp thành công')
      setJoinCode('')
      setJoinPassword('')
      setJoinModalOpen(false)
      fetchClassrooms()
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gia nhập lớp')
    } finally {
      setJoining(false)
    }
  }

  const handleTogglePin = async (c: Classroom, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/student/classrooms/${c._id}/pin`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        fetchClassrooms()
      }
    } catch (err) {
      console.error('Lỗi ghim lớp:', err)
    }
  }

  const handleLeaveClass = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/student/classrooms/${classroomId}/leave`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmLeaveId(null)
        if (selectedClassroom?._id === classroomId) {
          setSelectedClassroom(null)
        }
        fetchClassrooms()
      } else {
        const data = await res.json()
        alert(data.error || 'Rời lớp học thất bại')
      }
    } catch (err) {
      console.error('Lỗi rời lớp học:', err)
    }
  }

  return {
    classrooms,
    selectedClassroom, setSelectedClassroom,
    assignments,
    loading,
    joinModalOpen, setJoinModalOpen,
    joinCode, setJoinCode,
    joinPassword, setJoinPassword,
    showJoinPassword, setShowJoinPassword,
    joining, errorMessage, successMessage,
    confirmLeaveId, setConfirmLeaveId,
    handleJoinClass, handleTogglePin, handleLeaveClass,
  }
}
