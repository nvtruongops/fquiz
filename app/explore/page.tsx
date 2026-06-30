import ExploreContent from '@/components/quiz/explore/ExploreContent'
import { Suspense } from 'react'

export const metadata = {
  title: 'Khám phá Quiz | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export default async function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5D7B6F] border-t-transparent" /></div>}>
      <ExploreContent />
    </Suspense>
  )
}
