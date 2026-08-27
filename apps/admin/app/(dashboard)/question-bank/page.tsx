import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'
import { QuestionBankTabs } from '@/components/question-bank/QuestionBankTabs'

export const dynamic = 'force-dynamic'

async function getCategories() {
  await connectDB()
  return Category.find({ type: 'public', status: 'approved' })
    .sort({ name: 1 })
    .lean()
}

export default async function QuestionBankPage() {
  try {
    const categories = await getCategories()
    const serialized = categories.map((c) => ({
      _id: String(c._id),
      name: c.name,
    }))

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ngân hàng Câu hỏi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý, phân tích chất lượng, phát hiện xung đột và đồng bộ câu hỏi theo môn học
          </p>
        </div>

        <QuestionBankTabs categories={serialized} />
      </div>
    )
  } catch (error) {
    console.error('Error loading question bank page:', error)
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-destructive mb-2">Lỗi tải dữ liệu</h2>
        <p className="text-muted-foreground text-sm">
          Không thể kết nối database. Vui lòng thử lại.
        </p>
      </div>
    )
  }
}
