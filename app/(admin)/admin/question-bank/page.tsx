import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { QuestionBankAnalytics } from '@/components/admin/QuestionBankAnalytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuestionBankMigration } from '@/components/admin/QuestionBankMigration'
import { QuestionBankConflictResolver } from '@/components/admin/QuestionBankConflictResolver'
import { QuestionBankStatus } from '@/components/admin/QuestionBankStatus'

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
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ngân hàng Câu hỏi</h1>
            <p className="text-gray-500 mt-2">
              Quản lý, phân tích và đồng bộ câu hỏi theo môn học
            </p>
          </div>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="status">
              Trạng thái
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Thống kê
            </TabsTrigger>
            <TabsTrigger value="migration">
              Migration
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6">
            <QuestionBankStatus />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <QuestionBankAnalytics categories={serialized} />
          </TabsContent>

          <TabsContent value="migration" className="space-y-6">
            <QuestionBankMigration categories={serialized} />
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6">
            <QuestionBankConflictResolver categories={serialized} />
          </TabsContent>
        </Tabs>
      </div>
    )
  } catch (error) {
    console.error('Error loading question bank page:', error)
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi tải trang</h2>
          <p className="text-gray-600">
            Không thể tải dữ liệu. Vui lòng kiểm tra kết nối database.
          </p>
        </div>
      </div>
    )
  }
}
