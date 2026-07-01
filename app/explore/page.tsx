import { Suspense } from 'react'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'

export const metadata = {
  title: 'Khám phá Môn Học | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export const revalidate = 60

async function getCategories() {
  await connectDB()
  const cats = await Category.find({ type: 'public', status: 'approved' }).sort({ name: 1 }).lean()
  return cats.map((c: any) => ({
    id: c._id.toString(),
    name: c.name
  }))
}

export default async function ExplorePage() {
  const categories = await getCategories()

  return (
    <div className="container mx-auto py-12">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-[clamp(32px,4vw+16px,52px)] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5D7B6F] to-[#A4C3A2] leading-tight pb-2">
          Khám phá Môn học
        </h1>
        <p className="mt-4 text-[clamp(15px,1.5vw+10px,18px)] text-slate-500 font-medium">
          Chọn một danh mục để xem các bài thi trắc nghiệm hiện có.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5D7B6F] border-t-transparent" />
        </div>
      }>
        <CategoryFilter initialCategories={categories} />
      </Suspense>
    </div>
  )
}
