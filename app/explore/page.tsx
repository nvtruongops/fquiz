import ExploreContent from '@/components/quiz/ExploreContent'
import { Suspense } from 'react'

export const metadata = {
  title: 'Khám phá Quiz | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export default async function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  )
}
