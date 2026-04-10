/**
 * Get existing quiz IDs from database
 * Run: npx tsx --env-file=.env.local scripts/get-quiz-ids.ts
 */
import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function getQuizIds() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✓ Connected to MongoDB\n')

    // Get all quizzes
    const allQuizzes = await Quiz.find()
      .select('_id title course_code is_public status')
      .limit(10)
      .lean()

    console.log(`Found ${allQuizzes.length} quizzes in database:\n`)
    
    allQuizzes.forEach((quiz: any) => {
      const status = quiz.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'
      const published = quiz.status === 'published' ? '✅' : '❌'
      console.log(`${status} ${published} ${quiz._id} - ${quiz.course_code}`)
    })

    // Get public quizzes specifically
    const publicQuizzes = await Quiz.find({ 
      is_public: true, 
      status: 'published' 
    })
      .select('_id course_code')
      .limit(5)
      .lean()

    if (publicQuizzes.length > 0) {
      console.log(`\n\n✅ ${publicQuizzes.length} PUBLIC quizzes available for /explore:`)
      publicQuizzes.forEach((quiz: any) => {
        console.log(`   http://localhost:3000/quiz/${quiz._id}`)
      })
    } else {
      console.log('\n\n⚠️  No public quizzes found!')
      console.log('   Run: npm run seed:public-quizzes')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

getQuizIds()
