import type { Metadata } from 'next'
import { Suspense } from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import CourseDetailClient from '@/components/quiz/explore/CourseDetailClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const courseCodeUpper = code.toUpperCase()

  return {
    title: `Đề thi Trắc nghiệm ${courseCodeUpper} — Ôn thi ${courseCodeUpper} | FQuiz`,
    description: `Ngân hàng đề thi trắc nghiệm môn ${courseCodeUpper} đầy đủ đáp án, hỗ trợ trộn đề ngẫu nhiên và luyện tập Flashcard thông minh trên FQuiz.`,
    keywords: [
      courseCodeUpper,
      `đề thi ${courseCodeUpper}`,
      `trắc nghiệm ${courseCodeUpper}`,
      `ôn thi ${courseCodeUpper}`,
      `đáp án ${courseCodeUpper}`,
      'FQuiz',
    ],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Đề thi Trắc nghiệm ${courseCodeUpper} | FQuiz`,
      description: `Luyện tập bộ đề thi trắc nghiệm môn ${courseCodeUpper} với đáp án chi tiết và chế độ thi thử ngẫu nhiên.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Đề thi Trắc nghiệm ${courseCodeUpper} | FQuiz`,
      description: `Luyện tập bộ đề thi trắc nghiệm môn ${courseCodeUpper} đầy đủ đáp án trên FQuiz.`,
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
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <CourseDetailClient code={code} />
      </Suspense>
    </AppLayout>
  )
}
