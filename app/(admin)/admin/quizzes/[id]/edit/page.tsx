import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'
import { QuizEditor } from '@/components/quiz/QuizEditor'

type EditableQuestion = {
  text: string
  options: string[]
  correct_answer: number[] | number | null | undefined
  explanation?: string
  image_url?: string
}

type EditableCategory = {
  _id: unknown
  name: string
}

async function getData(id: string) {
  await connectDB()
  const [quiz, categories] = await Promise.all([
    Quiz.findById(id).lean(),
    Category.find().sort({ name: 1 }).lean(),
  ])
  return { quiz, categories }
}

export default async function AdminEditQuizPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const { quiz, categories } = await getData(id)
  if (!quiz) notFound()

  const initialData = {
    title: quiz.title,
    description: (quiz as any).description ?? '',
    category_id: String(quiz.category_id),
    course_code: quiz.course_code,
    status: quiz.status,
    updatedAt: (quiz as any).updatedAt,
    questions: ((quiz.questions ?? []) as EditableQuestion[]).map((q) => ({
      text: q.text,
      options: q.options,
      correct_answers: Array.isArray(q.correct_answer)
        ? q.correct_answer
        : [q.correct_answer].filter((a): a is number => a != null),
      explanation: q.explanation ?? '',
      image_url: q.image_url ?? '',
    })),
  }

  const serializedCategories = (categories as EditableCategory[]).map((c) => ({
    _id: String(c._id),
    name: c.name,
  }))

  return (
    <QuizEditor
      initialData={initialData}
      quizId={String(quiz._id)}
      categories={serializedCategories}
    />
  )
}
