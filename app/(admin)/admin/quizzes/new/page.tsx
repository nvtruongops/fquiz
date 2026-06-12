import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizEditorWithQuestionBank } from '@/components/quiz/QuizEditorWithQuestionBank'

async function getCategories() {
  await connectDB()
  return Category.find({ type: 'public', status: 'approved' }).sort({ name: 1 }).lean()
}

export default async function AdminNewQuizPage() {
  const categories = await getCategories()
  const serialized = categories.map((c) => ({ _id: String(c._id), name: c.name }))
  return <QuizEditorWithQuestionBank categories={serialized} />
}
