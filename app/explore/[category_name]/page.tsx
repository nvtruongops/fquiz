import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category' 
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PublicQuizCard } from '@/components/quiz/explore/PublicQuizCard'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ category_name: string }> }) {
  const { category_name } = await params
  const decodedName = decodeURIComponent(category_name)
  return {
    title: `Quiz ${decodedName.toUpperCase()} | FQuiz`,
    description: `Danh sách các bài thi trắc nghiệm cho danh mục ${decodedName.toUpperCase()}.`,
  }
}

async function getCategoryAndQuizzes(categoryName: string) {
  await connectDB()
  const decodedName = decodeURIComponent(categoryName)
  
  // Tìm danh mục theo tên, không phân biệt hoa thường
  const category = await Category.findOne({ 
    name: { $regex: new RegExp(`^${decodedName}$`, 'i') } 
  }).lean()

  if (!category) return { category: null, quizzes: [] }

  const quizzes = await Quiz.find({ 
    category_id: category._id, 
    status: 'published' 
  })
  .populate('category_id', 'name')
  .lean()
  
  return { category, quizzes }
}

export default async function CategoryExplorePage({ params }: { params: Promise<{ category_name: string }> }) {
  const { category_name } = await params
  const decodedName = decodeURIComponent(category_name)
  const { category, quizzes } = await getCategoryAndQuizzes(category_name)

  const catName = category?.name || decodedName

  return (
    <div className="container mx-auto py-12">
      <div className="mb-10 flex items-center justify-start max-w-7xl mx-auto">
        <Link href="/explore" className="inline-flex items-center text-slate-500 hover:text-[#5D7B6F] font-semibold transition-all bg-white/50 hover:bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white shadow-sm hover:shadow-md">
          <ChevronLeft className="w-5 h-5 mr-1" /> Quay lại
        </Link>
      </div>

      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-[clamp(32px,4vw+16px,52px)] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5D7B6F] to-[#A4C3A2] leading-tight pb-2">
          Danh mục: {catName.toUpperCase()}
        </h1>
        <p className="mt-4 text-[clamp(15px,1.5vw+10px,18px)] text-slate-500 font-medium">
          Tìm thấy {quizzes.length} bài thi trắc nghiệm.
        </p>
      </div>

      {!category ? (
        <div className="text-center py-20 text-slate-500 text-[16px] font-medium border border-white/40 bg-white/30 backdrop-blur-md rounded-3xl">
          Không tìm thấy danh mục này trong hệ thống. (Hoặc danh mục đã bị xóa)
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {quizzes.map((quiz: any) => (
            <PublicQuizCard key={quiz._id.toString()} quiz={quiz} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500 text-[16px] font-medium border border-white/40 bg-white/30 backdrop-blur-md rounded-3xl">
          Chưa có bài thi nào đang mở cho môn học này.
        </div>
      )}
    </div>
  )
}
