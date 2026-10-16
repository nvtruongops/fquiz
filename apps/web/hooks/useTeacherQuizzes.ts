'use client'

import { useState, useEffect, useCallback } from 'react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

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
  const { toast } = useToast()
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

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoadingQuizzes(true)
      const res = await fetch('/api/student/quizzes')
      const data = await res.json()
      if (res.ok) {
        setQuizzes(data.quizzes || [])
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err)
    } finally {
      setLoadingQuizzes(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const res = await fetch('/api/student/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/classrooms')
      const data = await res.json()
      if (res.ok) {
        setClassrooms(data.classrooms || [])
        if (data.classrooms?.length > 0) {
          setSelectedClassroomId((prev) => prev || data.classrooms[0]._id)
        }
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetchQuizzes(),
      fetchCategories(),
      fetchClassrooms(),
    ]).catch((err) => {
      console.error('Failed to initialize teacher dashboard:', err)
    })
  }, [fetchQuizzes, fetchCategories, fetchClassrooms])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      setCategoryError('Please enter course code or subject name')
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
        throw new Error(data.error || 'Failed to create course category')
      }

      setNewCategoryName('')
      setCreateCategoryOpen(false)
      fetchCategories()
    } catch (err: any) {
      setCategoryError(err.message || 'Error creating course category')
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
        toast.error(data.error || 'Failed to delete course category')
      }
    } catch (err) {
      console.error('Failed to delete category:', err)
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
      setAssignError('Please select a classroom to assign')
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
        throw new Error(data.error || 'Failed to assign quiz')
      }

      setAssignSuccess('Quiz assigned successfully to classroom!')
      setTimeout(() => {
        setAssignModalOpen(false)
      }, 1500)
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning quiz')
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
        toast.error(data.error || 'Failed to delete quiz')
      }
    } catch (err) {
      console.error('Failed to delete quiz:', err)
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
