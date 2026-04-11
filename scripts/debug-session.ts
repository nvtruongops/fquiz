import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'

const SESSION_ID = process.argv[2] || '69d9ff0cfeb021e0de16ae3a'

async function main() {
  await connectDB()

  const session = await QuizSession.findById(SESSION_ID).lean() as any
  if (!session) {
    console.log('Session not found:', SESSION_ID)
    process.exit(1)
  }

  console.log('\n=== SESSION DEBUG ===')
  console.log('ID:', session._id.toString())
  console.log('Status:', session.status)
  console.log('Mode:', session.mode)
  console.log('current_question_index:', session.current_question_index)
  console.log('user_answers count:', session.user_answers?.length ?? 0)
  console.log('user_answers question_indexes:', session.user_answers?.map((a: any) => a.question_index).sort((a: number, b: number) => a - b))
  console.log('score:', session.score)
  console.log('question_order (first 10):', session.question_order?.slice(0, 10))

  await mongoose.disconnect()
}

main().catch(console.error)
