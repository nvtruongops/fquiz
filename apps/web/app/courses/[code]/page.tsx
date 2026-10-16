import type { Metadata } from 'next'
import { Suspense } from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import CourseDetailClient from '@/components/quiz/explore/CourseDetailClient'
import { CourseDetailSkeleton } from '@/components/quiz/explore/CourseDetailSkeleton'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const courseCodeUpper = code.toUpperCase()

  return {
    title: `${courseCodeUpper} Quizzes & Practice Exams | FQuiz`,
    description: `Comprehensive question bank for ${courseCodeUpper} with verified answers, random quiz mixing, and smart flashcard practice on FQuiz.`,
    keywords: [
      courseCodeUpper,
      `${courseCodeUpper} quiz`,
      `${courseCodeUpper} exam`,
      `${courseCodeUpper} practice`,
      `${courseCodeUpper} answers`,
      'FQuiz',
    ],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${courseCodeUpper} Quizzes & Practice Exams | FQuiz`,
      description: `Practice ${courseCodeUpper} multiple-choice quizzes with detailed answers and random exam simulation.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${courseCodeUpper} Quizzes & Practice Exams | FQuiz`,
      description: `Practice ${courseCodeUpper} multiple-choice quizzes with verified answers on FQuiz.`,
    },
  }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const user = await verifySession()

  return (
    <AppLayout user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseDetailClient code={code} />
      </Suspense>
    </AppLayout>
  )
}
