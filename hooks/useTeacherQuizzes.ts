'use client'

import { useState, useEffect } from 'react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface QuizItem {
  _id: string
  title: string
  course_code: string
  questionCount: number
  status: 'published' | 'draft'
  created_at: string
  category_id?: { _id: string; name: string } | null
}

export interface CategoryItem {
  _id: string
  name: string
  totalQuizCount?: number
  ownQuizCount?: number
  created_at?: string
}

export interface Classroom {
  _id: string
  name: string
  code: string
}

export function useTeacherQuizzes() {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'categories'>('quizzes')

  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [confirmDeleteQuizId, setConfirmDeleteQuizId] = useState<string | null>(null)
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null)

  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState('')
  const [assignError, setAssignError] = useState('')

  const fetchQuizzes = async () => {
    try {
      setLoadingQuizzes(true)
      const res = await fetch('/api/student/quizzes')
      const data = await res.json()
      if (res.ok) {
        setQuizzes(data.quizzes || [])
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đề thi:', err)
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const res = await fetch('/api/student/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Lỗi tải danh sách môn học:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchClassrooms = async () => {
    try {
      const res = await fetch('/api/teacher/classrooms')
      const data = await res.json()
      if (res.ok) {
        setClassrooms(data.classrooms || [])
        if (data.classrooms?.length > 0) {
          setSelectedClassroomId(data.classrooms[0]._id)
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp học:', err)
    }
  }

  useEffect(() => {
    fetchQuizzes()
    fetchCategories()
    fetchClassrooms()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      setCategoryError('Vui lòng nhập Mã/Tên môn học')
      return
    }

    try {
      setCreatingCategory(true)
      setCategoryError('')

      const res = await fetch('/api/student/categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Tạo Mã môn học thất bại')
      }

      setNewCategoryName('')
      setCreateCategoryOpen(false)
      fetchCategories()
    } catch (err: any) {
      setCategoryError(err.message || 'Lỗi khi tạo Mã môn học')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (catId: string) => {
    try {
      const res = await fetch(`/api/student/categories?id=${catId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setConfirmDeleteCategoryId(null)
        fetchCategories()
      } else {
        alert(data.error || 'Không thể xóa mã môn học')
      }
    } catch (err) {
      console.error('Lỗi khi xóa môn học:', err)
    }
  }

  const handleOpenAssignModal = (quiz: QuizItem) => {
    setSelectedQuiz(quiz)
    setAssignSuccess('')
    setAssignError('')
    setAssignModalOpen(true)
  }

  const handleAssignQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuiz || !selectedClassroomId) {
      setAssignError('Vui lòng chọn lớp học để giao bài')
      return
    }

    try {
      setAssigning(true)
      setAssignError('')
      setAssignSuccess('')

      const res = await fetch(`/api/teacher/classrooms/${selectedClassroomId}/assignments`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_id: selectedQuiz._id,
          due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Giao bài tập thất bại')
      }

      setAssignSuccess('Đã giao bài tập thành công cho lớp học!')
      setTimeout(() => {
        setAssignModalOpen(false)
      }, 1500)
    } catch (err: any) {
      setAssignError(err.message || 'Lỗi khi giao bài tập')
    } finally {
      setAssigning(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmDeleteQuizId(null)
        fetchQuizzes()
      } else {
        const data = await res.json()
        alert(data.error || 'Xóa thất bại')
      }
    } catch (err) {
      console.error('Lỗi khi xóa bộ đề:', err)
    }
  }

  const filteredQuizzes = quizzes.filter((q) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      q.title.toLowerCase().includes(query) ||
      q.course_code.toLowerCase().includes(query)
    )
  })

  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questionCount || 0), 0)

  return {
    activeTab, setActiveTab,
    quizzes, loadingQuizzes,
    searchQuery, setSearchQuery,
    filteredQuizzes,
    categories, loadingCategories,
    totalQuestions,
    confirmDeleteQuizId, setConfirmDeleteQuizId,
    confirmDeleteCategoryId, setConfirmDeleteCategoryId,
    createCategoryOpen, setCreateCategoryOpen,
    newCategoryName, setNewCategoryName,
    creatingCategory, categoryError,
    handleCreateCategory, handleDeleteCategory,
    assignModalOpen, setAssignModalOpen,
    selectedQuiz,
    classrooms,
    selectedClassroomId, setSelectedClassroomId,
    dueDate, setDueDate,
    assigning, assignSuccess, assignError,
    handleOpenAssignModal, handleAssignQuiz,
    handleDeleteQuiz,
  }
}
