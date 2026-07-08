/**
 * Debug quiz issue - check what's wrong
 * Run: npx tsx --env-file=.env.local scripts/check-quiz-issue.ts
 */
import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz'
import { Category } from '../models/Category'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function checkQuizIssue() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✓ Connected to MongoDB\n')

    // Check the specific quiz from error
    const problemQuizId = '69d7fa6d7bb1fb6e8b042832'
    console.log(`Checking quiz ID from error: ${problemQuizId}`)
    
    const problemQuiz = await Quiz.findById(problemQuizId)
    if (problemQuiz) {
      console.log('✅ Quiz exists!')
    } else {
      console.log('❌ Quiz NOT FOUND - this is the problem!\n')
    }

    // Get all public published quizzes
    const publicQuizzes = await Quiz.find({ 
      is_public: true, 
      status: 'published' 
    })
      .select('_id course_code category_id questionCount')
      .populate('category_id', 'name')
      .lean()

    console.log(`\n📊 Found ${publicQuizzes.length} PUBLIC + PUBLISHED quizzes:\n`)
    
    if (publicQuizzes.length === 0) {
      console.log('⚠️  No public quizzes found!')
      console.log('\nPossible issues:')
      console.log('1. Quizzes exist but is_public = false')
      console.log('2. Quizzes exist but status != "published"')
      console.log('3. No quizzes in database at all')
      
      // Check all quizzes regardless of status
      const allQuizzes = await Quiz.find()
        .select('_id course_code is_public status')
        .limit(10)
        .lean()
      
      console.log(`\n📋 All quizzes in database (${allQuizzes.length} total):`)
      allQuizzes.forEach((quiz: any) => {
        const publicStatus = quiz.is_public ? '🌐' : '🔒'
        const publishStatus = quiz.status === 'published' ? '✅' : '❌'
        console.log(`   ${publicStatus} ${publishStatus} ${quiz.course_code} - ${quiz._id}`)
        console.log(`      is_public: ${quiz.is_public}, status: ${quiz.status}`)
      })
      
    } else {
      publicQuizzes.forEach((quiz: any) => {
        const categoryName = (quiz.category_id as any)?.name || 'No category'
        console.log(`✅ ${quiz.course_code}`)
        console.log(`   ID: ${quiz._id}`)
        console.log(`   Category: ${categoryName}`)
        console.log(`   Questions: ${quiz.questionCount}`)
        console.log(`   URL: http://localhost:3000/quiz/${quiz._id}`)
        console.log()
      })
    }

    // Check categories
    const categories = await Category.find({ 
      is_public: true,
      status: 'approved'
    })
      .select('_id name')
      .lean()

    console.log(`\n📁 Found ${categories.length} public categories`)
    if (categories.length === 0) {
      console.log('⚠️  No public categories! This might cause issues.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

checkQuizIssue()
