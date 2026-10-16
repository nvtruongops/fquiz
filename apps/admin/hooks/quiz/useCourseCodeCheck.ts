import { useState, useEffect, useCallback } from 'react'

interface UseCourseCodeCheckProps {
  initialCode?: string
  quizId?: string
}

export function useCourseCodeCheck({ initialCode = '', quizId }: UseCourseCodeCheckProps) {
  const [courseCode, setCourseCode] = useState(initialCode)
  const [isCheckingCode, setIsCheckingCode] = useState(false)
  const [codeDuplicateInfo, setCodeDuplicateInfo] = useState<{
    exists: boolean
    quiz?: { title: string; course_code: string; questionCount: number }
  } | null>(null)

  const checkCodeNow = useCallback(
    async (codeToTest: string) => {
      const trimmed = codeToTest.trim()
      if (!trimmed) {
        setCodeDuplicateInfo(null)
        setIsCheckingCode(false)
        return
      }

      if (initialCode && trimmed.toUpperCase() === initialCode.toUpperCase()) {
        setCodeDuplicateInfo({ exists: false })
        setIsCheckingCode(false)
        return
      }

      setIsCheckingCode(true)
      try {
        const excludeParam = quizId ? `&excludeId=${encodeURIComponent(quizId)}` : ''
        const res = await fetch(
          `/api/quizzes/check-code?code=${encodeURIComponent(trimmed)}${excludeParam}&_t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          }
        )
        if (res.ok) {
          const data = await res.json()
          setCodeDuplicateInfo(data)
        }
      } catch (err) {
        console.warn('Check code error:', err)
      } finally {
        setIsCheckingCode(false)
      }
    },
    [quizId, initialCode]
  )

  useEffect(() => {
    const trimmed = courseCode.trim()
    if (!trimmed) {
      setCodeDuplicateInfo(null)
      return
    }

    const timer = setTimeout(() => {
      checkCodeNow(trimmed)
    }, 150)

    return () => clearTimeout(timer)
  }, [courseCode, checkCodeNow])

  return {
    courseCode,
    setCourseCode,
    isCheckingCode,
    codeDuplicateInfo,
    checkCodeNow,
  }
}
