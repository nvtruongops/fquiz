import mongoose from 'mongoose'
import { QuizSession } from '../models/QuizSession'
import { Quiz } from '../models/Quiz'
import { User } from '../models/User'

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!)
    console.log('Connected to MongoDB')

    // QuizSession indexes for faster queries
    console.log('Creating QuizSession indexes...')
    await QuizSession.collection.createIndex(
      { student_id: 1, quiz_id: 1, status: 1, expires_at: 1 },
      { name: 'student_quiz_status_expires' }
    )
    await QuizSession.collection.createIndex(
      { student_id: 1, status: 1, completed_at: -1 },
      { name: 'student_status_completed' }
    )
    console.log('✓ QuizSession indexes created')

    // Quiz indexes for faster lookups
    console.log('Creating Quiz indexes...')
    await Quiz.collection.createIndex(
      { created_by: 1, status: 1 },
      { name: 'created_by_status' }
    )
    await Quiz.collection.createIndex(
      { is_public: 1, status: 1, category_id: 1 },
      { name: 'public_status_category' }
    )
    await Quiz.collection.createIndex(
      { original_quiz_id: 1 },
      { name: 'original_quiz' }
    )
    console.log('✓ Quiz indexes created')

    // User indexes
    console.log('Creating User indexes...')
    try {
      await User.collection.createIndex(
        { email: 1 },
        { name: 'email_unique', unique: true }
      )
    } catch (err: any) {
      if (err.code === 85) {
        console.log('  - email index already exists (skipped)')
      } else {
        throw err
      }
    }
    await User.collection.createIndex(
      { role: 1, is_active: 1 },
      { name: 'role_active' }
    )
    console.log('✓ User indexes created')

    console.log('\n✅ All indexes created successfully!')
    
    // List all indexes
    console.log('\nQuizSession indexes:')
    const sessionIndexes = await QuizSession.collection.indexes()
    sessionIndexes.forEach(idx => console.log(`  - ${idx.name}`))

    console.log('\nQuiz indexes:')
    const quizIndexes = await Quiz.collection.indexes()
    quizIndexes.forEach(idx => console.log(`  - ${idx.name}`))

    console.log('\nUser indexes:')
    const userIndexes = await User.collection.indexes()
    userIndexes.forEach(idx => console.log(`  - ${idx.name}`))

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

addIndexes()
