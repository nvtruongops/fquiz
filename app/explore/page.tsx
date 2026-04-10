import ExploreContent from '@/components/explore/ExploreContent'
import Navbar from '@/components/Navbar'
import { getServerUser } from '@/lib/get-server-user'

export const metadata = {
  title: 'Khám phá Quiz | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export default async function ExplorePage() {
  const initialUser = await getServerUser()
  return (
    <div className="min-h-screen bg-[#EAE7D6]">
      <Navbar initialUser={initialUser} />
      <ExploreContent />
    </div>
  )
}
