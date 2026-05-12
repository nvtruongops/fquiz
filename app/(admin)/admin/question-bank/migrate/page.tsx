import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuestionBankMigration } from '@/components/admin/QuestionBankMigration'

async function getCategories() {
  await connectDB()
  return Category.find({ type: 'public', status: 'approved' })
    .sort({ name: 1 })
    .lean()
}

export default async function QuestionBankMigratePage() {
  const categories = await getCategories()
  const serialized = categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }))

  return (
    <div className="p-8">
      <QuestionBankMigration categories={serialized} />
    </div>
  )
}
