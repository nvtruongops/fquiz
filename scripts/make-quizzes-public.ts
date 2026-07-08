/**
 * Make existing quizzes public for /explore page
 * Run: npx tsx --env-file=.env.local scripts/make-quizzes-public.ts
 */
import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function makeQuizzesPublic() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✓ Connected to MongoDB\n')

    // Get all quizzes
    const allQuizzes = await Quiz.find({ status: 'published' })
      .select('_id title course_code is_public')
      .lean()

    console.log(`Found ${allQuizzes.length} published quizzes\n`)

    if (allQuizzes.length === 0) {
      console.log('⚠️  No published quizzes found!')
      return
    }

    // Show current status
    console.log('Current status:')
    allQuizzes.forEach((quiz: any) => {
      const status = quiz.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'
      console.log(`  ${status} ${quiz.course_code} (${quiz._id})`)
    })

    // Update all to public
    const result = await Quiz.updateMany(
      { status: 'published' },
      { $set: { is_public: true } }
    )

    console.log(`\n✅ Updated ${result.modifiedCount} quizzes to PUBLIC`)
    
    // Show updated status
    const updatedQuizzes = await Quiz.find({ 
      status: 'published',
      is_public: true 
    })
      .select('_id course_code')
      .lean()

    console.log(`\n🌐 ${updatedQuizzes.length} quizzes now available on /explore:`)
    updatedQuizzes.forEach((quiz: any) => {
      console.log(`   • ${quiz.course_code}`)
      console.log(`     http://localhost:3000/quiz/${quiz._id}`)
    })

    console.log('\n✅ Done! Reload /explore to see the quizzes')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

makeQuizzesPublic()
