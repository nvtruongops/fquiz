'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QuizItem {
  _id: string
  title: string
  questionCount: number
  bestScore: number | null
}

async function fetchCourseQuizzes(code: string): Promise<QuizItem[]> {
  const res = await fetch(`/api/courses/${code}/quizzes`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  const data = await res.json()
  return data.quizzes as QuizItem[]
}

function QuizSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-lg animate-pulse"
          style={{ backgroundColor: '#B0D4B8' }}
        />
      ))}
    </div>
  )
}

export default function CourseQuizList({ code }: { code: string }) {
  const { data: quizzes, isLoading, isError } = useQuery<QuizItem[]>({
    queryKey: ['courseQuizzes', code],
    queryFn: () => fetchCourseQuizzes(code),
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) return <QuizSkeleton />

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600">
        Failed to load quizzes. Please try again later.
      </div>
    )
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No quizzes available for this course.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {quizzes.map((quiz) => (
        <Card key={quiz._id} className="border-0 shadow-sm" style={{ backgroundColor: '#EAE7D6' }}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold" style={{ color: '#5D7B6F' }}>
                {quiz.title}
              </CardTitle>
              {quiz.bestScore !== null ? (
                <Badge
                  className="shrink-0 border-0 text-white"
                  style={{ backgroundColor: '#A4C3A2' }}
                >
                  {quiz.bestScore}/{quiz.questionCount}
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 text-gray-500">
                  Chưa làm
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <span className="text-sm text-gray-500">{quiz.questionCount} questions</span>
            <Link
              href={`/quiz/${quiz._id}/mode`}
              className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#5D7B6F' }}
            >
              Start Quiz
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
