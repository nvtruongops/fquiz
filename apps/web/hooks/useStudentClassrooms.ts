'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type Dispatch, type SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

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

interface ClassroomHookState {
  classrooms: Classroom[]
  selectedClassroom: Classroom | null
  assignments: Assignment[]
  assignmentsClassroomId: string | null
  assignmentsLoading: boolean
  loading: boolean
  classroomsError: string
  assignmentsError: string
  joinModalOpen: boolean
  joinCode: string
  joinPassword: string
  showJoinPassword: boolean
  joining: boolean
  errorMessage: string
  successMessage: string
  confirmLeaveId: string | null
}

interface ClassroomHookSetters {
  setClassrooms: Dispatch<SetStateAction<Classroom[]>>
  setSelectedClassroom: Dispatch<SetStateAction<Classroom | null>>
  setAssignments: Dispatch<SetStateAction<Assignment[]>>
  setAssignmentsClassroomId: Dispatch<SetStateAction<string | null>>
  setAssignmentsLoading: Dispatch<SetStateAction<boolean>>
  setLoading: Dispatch<SetStateAction<boolean>>
  setClassroomsError: Dispatch<SetStateAction<string>>
  setAssignmentsError: Dispatch<SetStateAction<string>>
  setJoinModalOpen: Dispatch<SetStateAction<boolean>>
  setJoinCode: Dispatch<SetStateAction<string>>
  setJoinPassword: Dispatch<SetStateAction<string>>
  setShowJoinPassword: Dispatch<SetStateAction<boolean>>
  setJoining: Dispatch<SetStateAction<boolean>>
  setErrorMessage: Dispatch<SetStateAction<string>>
  setSuccessMessage: Dispatch<SetStateAction<string>>
  setConfirmLeaveId: Dispatch<SetStateAction<string | null>>
}

const INITIAL_CLASSROOM_HOOK_STATE: ClassroomHookState = {
  classrooms: [],
  selectedClassroom: null,
  assignments: [],
  assignmentsClassroomId: null,
  assignmentsLoading: false,
  loading: true,
  classroomsError: '',
  assignmentsError: '',
  joinModalOpen: false,
  joinCode: '',
  joinPassword: '',
  showJoinPassword: false,
  joining: false,
  errorMessage: '',
  successMessage: '',
  confirmLeaveId: null,
}

function createClassroomFieldSetter<Key extends keyof ClassroomHookState>(
  update: Dispatch<SetStateAction<ClassroomHookState>>,
  key: Key,
): Dispatch<SetStateAction<ClassroomHookState[Key]>> {
  return (value) => update((state) => ({
    ...state,
    [key]: typeof value === 'function'
      ? (value as (current: ClassroomHookState[Key]) => ClassroomHookState[Key])(state[key])
      : value,
  }))
}

function useClassroomState() {
  const [state, setState] = useState(INITIAL_CLASSROOM_HOOK_STATE)
  const setters = useMemo<ClassroomHookSetters>(() => ({
    setClassrooms: createClassroomFieldSetter(setState, 'classrooms'),
    setSelectedClassroom: createClassroomFieldSetter(setState, 'selectedClassroom'),
    setAssignments: createClassroomFieldSetter(setState, 'assignments'),
    setAssignmentsClassroomId: createClassroomFieldSetter(setState, 'assignmentsClassroomId'),
    setAssignmentsLoading: createClassroomFieldSetter(setState, 'assignmentsLoading'),
    setLoading: createClassroomFieldSetter(setState, 'loading'),
    setClassroomsError: createClassroomFieldSetter(setState, 'classroomsError'),
    setAssignmentsError: createClassroomFieldSetter(setState, 'assignmentsError'),
    setJoinModalOpen: createClassroomFieldSetter(setState, 'joinModalOpen'),
    setJoinCode: createClassroomFieldSetter(setState, 'joinCode'),
    setJoinPassword: createClassroomFieldSetter(setState, 'joinPassword'),
    setShowJoinPassword: createClassroomFieldSetter(setState, 'showJoinPassword'),
    setJoining: createClassroomFieldSetter(setState, 'joining'),
    setErrorMessage: createClassroomFieldSetter(setState, 'errorMessage'),
    setSuccessMessage: createClassroomFieldSetter(setState, 'successMessage'),
    setConfirmLeaveId: createClassroomFieldSetter(setState, 'confirmLeaveId'),
  }), [setState])
  return { ...state, ...setters }
}

async function fetchClassroomAssignments(classroomId: string): Promise<Assignment[]> {
  const res = await fetch(`/api/student/classrooms/${classroomId}/assignments`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load assignments')
  return data.assignments || []
}

function runIfLatest(requestId: number, latestRequest: { current: number }, update: () => void) {
  if (requestId === latestRequest.current) update()
}

async function loadClassrooms(): Promise<Classroom[]> {
  const res = await fetch('/api/student/classrooms')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load classrooms')
  return data.classrooms || []
}

function normalizeJoinCode(value: string): string | null {
  const code = value.trim()
  return code.length === 6 ? code.toUpperCase() : null
}

async function requestClassroomJoin(code: string, password: string) {
  const res = await fetch('/api/student/classrooms/join', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code, password: password.trim() }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to join classroom')
  return data
}

async function requestClassroomLeave(classroomId: string): Promise<string | null> {
  const res = await fetch(`/api/student/classrooms/${classroomId}/leave`, {
    method: 'POST',
    headers: withCsrfHeaders(),
  })
  if (res.ok) return null
  const data = await res.json()
  return data.error || 'Failed to leave classroom'
}

function getVisibleClassroomAssignments(
  classroom: Classroom | null,
  assignmentsClassroomId: string | null,
  assignments: Assignment[],
) {
  return classroom?._id === assignmentsClassroomId ? assignments : []
}

function isClassroomAssignmentsLoading(
  classroom: Classroom | null,
  assignmentsLoading: boolean,
  assignmentsClassroomId: string | null,
) {
  return Boolean(classroom && (assignmentsLoading || assignmentsClassroomId !== classroom._id))
}

export function useStudentClassrooms() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const {
    classrooms,
    setClassrooms,
    selectedClassroom,
    setSelectedClassroom,
    assignments,
    setAssignments,
    assignmentsClassroomId,
    setAssignmentsClassroomId,
    assignmentsLoading,
    setAssignmentsLoading,
    loading,
    setLoading,
    classroomsError,
    setClassroomsError,
    assignmentsError,
    setAssignmentsError,
    joinModalOpen,
    setJoinModalOpen,
    joinCode,
    setJoinCode,
    joinPassword,
    setJoinPassword,
    showJoinPassword,
    setShowJoinPassword,
    joining,
    setJoining,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    confirmLeaveId,
    setConfirmLeaveId,
  } = useClassroomState()
  const assignmentsRequestId = useRef(0)

  useEffect(() => {
    const codeParam = searchParams?.get('joinCode')
    if (codeParam && codeParam.trim().length === 6) {
      setJoinCode(codeParam.trim().toUpperCase())
      setJoinModalOpen(true)
    }
  }, [searchParams])

  const fetchClassrooms = useCallback(async () => {
    setClassroomsError('')
    try {
      setLoading(true)
      const list = await loadClassrooms()
      setClassrooms(list)
      setSelectedClassroom(prev => prev || (list.length > 0 ? list[0] : null))
    } catch (err) {
      console.error('Failed to load classrooms:', err)
      setClassroomsError('Unable to load classrooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAssignments = async (classroomId: string) => {
    const requestId = ++assignmentsRequestId.current
    setAssignmentsError('')
    setAssignmentsClassroomId(classroomId)
    setAssignmentsLoading(true)
    setAssignments([])
    try {
      const assignments = await fetchClassroomAssignments(classroomId)
      runIfLatest(requestId, assignmentsRequestId, () => setAssignments(assignments))
    } catch (err) {
      runIfLatest(requestId, assignmentsRequestId, () => {
        console.error('Failed to load assignments:', err)
        setAssignmentsError('Unable to load assignments. Please try again.')
      })
    } finally {
      runIfLatest(requestId, assignmentsRequestId, () => setAssignmentsLoading(false))
    }
  }

  const retryAssignments = () => {
    if (selectedClassroom) void fetchAssignments(selectedClassroom._id)
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
    const code = normalizeJoinCode(joinCode)
    if (!code) {
      setErrorMessage('Classroom code must be exactly 6 characters')
      return
    }

    try {
      setJoining(true)
      setErrorMessage('')
      const data = await requestClassroomJoin(code, joinPassword)
      setSuccessMessage(data.message || 'Joined classroom successfully')
      setJoinCode('')
      setJoinPassword('')
      setJoinModalOpen(false)
      fetchClassrooms()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error joining classroom')
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
      console.error('Failed to pin classroom:', err)
    }
  }

  const handleLeaveClass = async (classroomId: string) => {
    try {
      const error = await requestClassroomLeave(classroomId)
      if (error) {
        toast.error(error)
        return
      }
      setConfirmLeaveId(null)
      if (selectedClassroom?._id === classroomId) setSelectedClassroom(null)
      fetchClassrooms()
    } catch (err) {
      console.error('Failed to leave classroom:', err)
    }
  }

  return {
    classrooms,
    selectedClassroom, setSelectedClassroom,
    assignments: getVisibleClassroomAssignments(selectedClassroom, assignmentsClassroomId, assignments),
    assignmentsLoading: isClassroomAssignmentsLoading(selectedClassroom, assignmentsLoading, assignmentsClassroomId),
    loading,
    classroomsError,
    assignmentsError,
    retryClassrooms: fetchClassrooms,
    retryAssignments,
    joinModalOpen, setJoinModalOpen,
    joinCode, setJoinCode,
    joinPassword, setJoinPassword,
    showJoinPassword, setShowJoinPassword,
    joining, errorMessage, successMessage,
    confirmLeaveId, setConfirmLeaveId,
    handleJoinClass, handleTogglePin, handleLeaveClass,
  }
}
