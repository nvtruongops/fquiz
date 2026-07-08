import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { User } from '@/models/User'
import { Types } from 'mongoose'

async function check() {
  await connectDB()

  const total = await QuizSession.countDocuments({ status: 'completed' })
  console.log('Total completed sessions:', total)

  const sample = await QuizSession.findOne({ status: 'completed' }).lean() as any
  if (!sample) { console.log('No sessions!'); process.exit(0) }

  const userId = sample.student_id
  console.log('\n--- Testing dashboard aggregate for user:', userId.toString())

  // Step 1: get latest session IDs per quiz
  const latestSessionIdsByQuiz = await QuizSession.aggregate([
    { $match: { student_id: userId, status: 'completed' } },
    { $sort: { completed_at: -1 } },
    { $group: { _id: '$quiz_id', latestSessionId: { $first: '$_id' }, completedAt: { $first: '$completed_at' } } },
    { $sort: { completedAt: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, latestSessionId: 1 } },
  ])
  console.log('latestSessionIdsByQuiz:', latestSessionIdsByQuiz.length)

  const sessionIds = latestSessionIdsByQuiz.map((x: any) => x.latestSessionId)
  
  // Step 2: populate quiz_id
  const sessions = await QuizSession.find({ _id: { $in: sessionIds } })
    .sort({ completed_at: -1 })
    .populate('quiz_id', 'title course_code questionCount questions category_id created_by is_saved_from_explore original_quiz_id')
    .lean() as any[]

  console.log('\nSessions with populated quiz_id:')
  for (const s of sessions) {
    const q = s.quiz_id
    console.log('  quiz_id populated:', !!q, '| title:', q?.title, '| category_id:', q?.category_id?.toString())
  }

  // Step 3: check quizMetaMap
  const quizIds = sessions.map(s => s.quiz_id?._id).filter(Boolean)
  const quizDocs = await Quiz.find({ _id: { $in: quizIds } }, { category_id: 1, created_by: 1, course_code: 1 }).lean() as any[]
  console.log('\nquizDocs from Quiz.find:', quizDocs.length)
  for (const q of quizDocs) {
    console.log('  quiz:', q._id.toString(), '| category_id:', q.category_id?.toString())
  }

  // Step 4: check categories
  const catIds = quizDocs.map(q => q.category_id).filter(Boolean)
  const cats = await Category.find({ _id: { $in: catIds } }, { name: 1 }).lean() as any[]
  console.log('\nCategories found:', cats.length)
  cats.forEach(c => console.log('  ', c._id.toString(), c.name))

  await mongoose.disconnect()
}

check().catch(console.error)
