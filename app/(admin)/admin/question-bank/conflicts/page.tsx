import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { QuestionBankConflictResolver } from '@/components/admin/QuestionBankConflictResolver'

async function getCategories() {
  await connectDB()
  return Category.find({ type: 'public', status: 'approved' })
    .sort({ name: 1 })
    .lean()
}

export default async function QuestionBankConflictsPage() {
  const categories = await getCategories()
  const serialized = categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }))

  return (
    <div className="p-8">
      <QuestionBankConflictResolver categories={serialized} />
    </div>
  )
}
