import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'
import { QuestionBankPageView } from '@/components/question-bank/QuestionBankPageView'

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
      <QuestionBankPageView categories={serialized} />
    )
  } catch (error) {
    console.error('Error loading question bank page:', error)
    return (
      <QuestionBankPageView error />
    )
  }
}
