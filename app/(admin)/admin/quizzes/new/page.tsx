import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizEditor } from '@/components/quiz/QuizEditor'

async function getCategories() {
  await connectDB()
  return Category.find({ type: 'public', status: 'approved' }).sort({ name: 1 }).lean()
}

export default async function AdminNewQuizPage() {
  const categories = await getCategories()
  const serialized = categories.map((c) => ({ _id: String(c._id), name: c.name }))
  return <QuizEditor categories={serialized} />
}
