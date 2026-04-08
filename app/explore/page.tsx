import ExploreContent from '@/components/explore/ExploreContent'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Khám phá Quiz | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-[#EAE7D6]">
      <Navbar />
      <ExploreContent />
    </div>
  )
}
