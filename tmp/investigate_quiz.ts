import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz'
import { analyzeQuizCompleteness } from '../lib/quiz-analyzer'

async function check() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const quizId = '69d47fb250cdb1d6b9ab2c32'
  const quiz = await Quiz.findById(quizId).lean()
  
  if (!quiz) {
    console.log('Quiz not found: ' + quizId)
    process.exit(1)
  }

  console.log('--- QUIZ DATA ---')
  console.log('Title:', quiz.course_code)
  console.log('Status:', quiz.status)
  console.log('Questions Count:', quiz.questions?.length)
  
  // Note: analyzeQuizCompleteness expects targetCount as 2nd param
  // Defaulting to questions.length for this check
  const diagnostics = analyzeQuizCompleteness(quiz as any, quiz.questions?.length || 0)
  
  console.log('\n--- DIAGNOSTICS ---')
  console.log('isValid:', diagnostics.isValid)
  console.log('Progress:', diagnostics.progressPercent + '%')
  console.log('Errors:', JSON.stringify(diagnostics.errors, null, 2))
  console.log('Warnings:', JSON.stringify(diagnostics.warnings, null, 2))
  
  process.exit(0)
}

check().catch(err => {
  console.error(err)
  process.exit(1)
})
