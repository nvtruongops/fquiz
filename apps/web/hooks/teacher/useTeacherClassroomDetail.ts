'use client'

import { useState, useEffect, useCallback } from 'react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

export interface ClassroomDetail {
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

export interface Member {
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

export interface Assignment {
  _id: string
  title: string
  quiz_id: string
  due_at?: string
  quiz?: {
    title: string
    questionCount: number
  }
}

export interface StudentReport {
  student_id: string
  username: string
  email: string
  status: string
  best_score: number
  attempts_count: number
  is_passed: boolean
  submitted_at?: string | Date | null
}

export function useTeacherClassroomDetail(classroomId: string) {
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

  const fetchClassroomDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}`)
      const data = await res.json()
      if (res.ok) {
        setClassroom(data.classroom)
      }
    } catch (err) {
      console.error('Error fetching classroom details:', err)
    }
  }, [classroomId])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/members`)
      const data = await res.json()
      if (res.ok) setMembers(data.members || [])
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }, [classroomId])

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/assignments`)
      const data = await res.json()
      if (res.ok) setAssignments(data.assignments || [])
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }
  }, [classroomId])

  const loadAllClassroomData = useCallback(async () => {
    if (!classroomId) return
    try {
      setLoading(true)
      const [detailRes, membersRes, assignmentsRes, quizzesRes] = await Promise.allSettled([
        fetch(`/api/teacher/classrooms/${classroomId}`).then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch classroom')
          return res.json()
        }),
        fetch(`/api/teacher/classrooms/${classroomId}/members`).then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch members')
          return res.json()
        }),
        fetch(`/api/teacher/classrooms/${classroomId}/assignments`).then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch assignments')
          return res.json()
        }),
        fetch('/api/student/quizzes').then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch quizzes')
          return res.json()
        }),
      ])

      if (detailRes.status === 'fulfilled' && detailRes.value?.classroom) {
        setClassroom(detailRes.value.classroom)
      }
      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value?.members || [])
      }
      if (assignmentsRes.status === 'fulfilled') {
        setAssignments(assignmentsRes.value?.assignments || [])
      }
      if (quizzesRes.status === 'fulfilled') {
        setMyQuizzes(quizzesRes.value?.quizzes || [])
      }
    } catch (err) {
      console.error('Error fetching classroom data:', err)
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    if (classroomId) {
      loadAllClassroomData()
    }
  }, [classroomId, loadAllClassroomData])

  const handleCopyCode = useCallback(() => {
    if (classroom?.code) {
      navigator.clipboard.writeText(classroom.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [classroom?.code])

  const handleAssignQuiz = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedQuizId || !assignmentTitle.trim()) {
        setErrorMessage('Please select a quiz and enter an assignment title')
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
        if (!res.ok) throw new Error(data.error || 'Failed to assign quiz')

        setAssignModalOpen(false)
        setSelectedQuizId('')
        setAssignmentTitle('')
        setDueAt('')
        fetchAssignments()
      } catch (err: any) {
        setErrorMessage(err.message || 'Error assigning quiz')
      } finally {
        setAssigning(false)
      }
    },
    [classroomId, selectedQuizId, assignmentTitle, dueAt, fetchAssignments]
  )

  const handleViewReport = useCallback(async (assignmentId: string) => {
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
  }, [])

  const handleToggleStar = useCallback(
    async (studentId: string) => {
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
        console.error('Error toggling student star:', err)
      }
    },
    [classroomId, fetchMembers]
  )

  const handleOpenTagModal = useCallback((m: Member) => {
    setSelectedMemberForTag(m)
    setTagInputText((m.tags || []).join(', '))
    setTagModalOpen(true)
  }, [])

  const handleSaveTags = useCallback(
    async (e: React.FormEvent) => {
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
        console.error('Error updating tags:', err)
      } finally {
        setUpdatingTags(false)
      }
    },
    [classroomId, selectedMemberForTag, tagInputText, fetchMembers]
  )

  const handleRemoveMember = useCallback(
    async (studentId: string) => {
      try {
        const res = await fetch(`/api/teacher/classrooms/${classroomId}/members?student_id=${studentId}`, {
          method: 'DELETE',
          headers: withCsrfHeaders(),
        })
        if (res.ok) {
          setConfirmRemoveStudentId(null)
          await Promise.allSettled([fetchMembers(), fetchClassroomDetail()])
        } else {
          const data = await res.json()
          toast.error(data.error || 'Failed to remove student')
        }
      } catch (err) {
        console.error('Error removing student:', err)
      }
    },
    [classroomId, fetchClassroomDetail, fetchMembers, toast]
  )

  return {
    classroom,
    members,
    assignments,
    loading,
    copied,
    handleCopyCode,
    assignModalOpen,
    setAssignModalOpen,
    myQuizzes,
    selectedQuizId,
    setSelectedQuizId,
    assignmentTitle,
    setAssignmentTitle,
    dueAt,
    setDueAt,
    assigning,
    errorMessage,
    handleAssignQuiz,
    reportModalOpen,
    setReportModalOpen,
    selectedAssignmentReport,
    loadingReport,
    handleViewReport,
    handleToggleStar,
    tagModalOpen,
    setTagModalOpen,
    selectedMemberForTag,
    tagInputText,
    setTagInputText,
    updatingTags,
    handleOpenTagModal,
    handleSaveTags,
    confirmRemoveStudentId,
    setConfirmRemoveStudentId,
    handleRemoveMember,
  }
}
