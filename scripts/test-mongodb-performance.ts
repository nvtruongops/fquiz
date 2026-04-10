/**
 * MongoDB Performance Test Script
 * Tests direct MongoDB operations to identify database bottlenecks
 * 
 * Usage: npm run test:mongodb
 */

import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

interface TestResult {
  operation: string
  duration: number
  success: boolean
  details?: any
}

const results: TestResult[] = []

function logResult(operation: string, duration: number, success: boolean, details?: any) {
  results.push({ operation, duration, success, details })
  const status = success ? '✅' : '❌'
  console.log(`${status} ${operation}: ${duration}ms`, details ? `- ${JSON.stringify(details)}` : '')
}

async function testConnection() {
  console.log('\n📊 Test 1: Database Connection')
  const start = Date.now()
  
  try {
    await connectDB()
    const duration = Date.now() - start
    logResult('Connection', duration, true, { 
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host 
    })
    return true
  } catch (error) {
    const duration = Date.now() - start
    logResult('Connection', duration, false, { error: (error as Error).message })
    return false
  }
}

async function testSimpleQueries() {
  console.log('\n📊 Test 2: Simple Queries')
  const db = mongoose.connection.db!
  
  // Test 2.1: Count quizzes
  let start = Date.now()
  try {
    const count = await db.collection('quizzes').countDocuments({ 
      is_public: true, 
      status: 'published' 
    })
    logResult('Count Public Quizzes', Date.now() - start, true, { count })
  } catch (error) {
    logResult('Count Public Quizzes', Date.now() - start, false, { error: (error as Error).message })
  }
  
  // Test 2.2: Find one quiz
  start = Date.now()
  try {
    const quiz = await db.collection('quizzes').findOne({ 
      is_public: true, 
      status: 'published' 
    })
    logResult('Find One Quiz', Date.now() - start, true, { 
      found: !!quiz,
      questionCount: quiz?.questions?.length 
    })
  } catch (error) {
    logResult('Find One Quiz', Date.now() - start, false, { error: (error as Error).message })
  }
  
  // Test 2.3: Find multiple quizzes
  start = Date.now()
  try {
    const quizzes = await db.collection('quizzes')
      .find({ is_public: true, status: 'published' })
      .limit(10)
      .toArray()
    logResult('Find 10 Quizzes', Date.now() - start, true, { count: quizzes.length })
  } catch (error) {
    logResult('Find 10 Quizzes', Date.now() - start, false, { error: (error as Error).message })
  }
}

async function testComplexQueries() {
  console.log('\n📊 Test 3: Complex Queries')
  const db = mongoose.connection.db!
  
  // Test 3.1: Quiz with populate simulation
  let start = Date.now()
  try {
    const quiz = await db.collection('quizzes').findOne({ 
      is_public: true, 
      status: 'published' 
    })
    
    if (quiz && quiz.created_by) {
      const user = await db.collection('users').findOne({ _id: quiz.created_by })
      logResult('Quiz + User Lookup', Date.now() - start, true, { 
        hasUser: !!user,
        username: user?.username 
      })
    } else {
      logResult('Quiz + User Lookup', Date.now() - start, false, { error: 'No quiz found' })
    }
  } catch (error) {
    logResult('Quiz + User Lookup', Date.now() - start, false, { error: (error as Error).message })
  }
  
  // Test 3.2: Aggregate query
  start = Date.now()
  try {
    const result = await db.collection('quizzes').aggregate([
      { $match: { is_public: true, status: 'published' } },
      { $group: { _id: '$category_id', count: { $sum: 1 } } },
      { $limit: 10 }
    ]).toArray()
    logResult('Aggregate by Category', Date.now() - start, true, { categories: result.length })
  } catch (error) {
    logResult('Aggregate by Category', Date.now() - start, false, { error: (error as Error).message })
  }
}

async function testSessionOperations() {
  console.log('\n📊 Test 4: Session Operations (Simulating Quiz Flow)')
  const db = mongoose.connection.db!
  
  // Test 4.1: Find a quiz
  let start = Date.now()
  const quiz = await db.collection('quizzes').findOne({ 
    is_public: true, 
    status: 'published' 
  })
  const findQuizDuration = Date.now() - start
  logResult('Find Quiz for Session', findQuizDuration, !!quiz, { 
    questionCount: quiz?.questions?.length 
  })
  
  if (!quiz) return
  
  // Test 4.2: Create a test session
  start = Date.now()
  try {
    const testSession = {
      quiz_id: quiz._id,
      student_id: new mongoose.Types.ObjectId(),
      mode: 'immediate',
      difficulty: 'medium',
      status: 'active',
      current_question_index: 0,
      user_answers: [],
      score: 0,
      created_at: new Date(),
      last_activity_at: new Date(),
      questions_cache: quiz.questions,
    }
    
    const insertResult = await db.collection('quiz_sessions').insertOne(testSession)
    const insertDuration = Date.now() - start
    logResult('Create Session', insertDuration, true, { 
      sessionId: insertResult.insertedId.toString() 
    })
    
    // Test 4.3: Update session (simulate answer submission)
    start = Date.now()
    await db.collection('quiz_sessions').updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          user_answers: [{
            question_index: 0,
            answer_index: 0,
            answer_indexes: [0],
            is_correct: false
          }],
          current_question_index: 1,
          last_activity_at: new Date()
        }
      }
    )
    const updateDuration = Date.now() - start
    logResult('Update Session (Submit Answer)', updateDuration, true)
    
    // Test 4.4: Find session
    start = Date.now()
    const foundSession = await db.collection('quiz_sessions').findOne({ 
      _id: insertResult.insertedId 
    })
    const findSessionDuration = Date.now() - start
    logResult('Find Session', findSessionDuration, !!foundSession)
    
    // Test 4.5: Multiple rapid updates (simulate rapid answer submissions)
    console.log('\n  Testing rapid answer submissions (5 answers)...')
    const updateTimes: number[] = []
    
    for (let i = 0; i < 5; i++) {
      start = Date.now()
      await db.collection('quiz_sessions').updateOne(
        { _id: insertResult.insertedId },
        {
          $set: {
            user_answers: Array.from({ length: i + 2 }, (_, idx) => ({
              question_index: idx,
              answer_index: 0,
              answer_indexes: [0],
              is_correct: false
            })),
            current_question_index: i + 2,
            last_activity_at: new Date()
          }
        }
      )
      const duration = Date.now() - start
      updateTimes.push(duration)
      console.log(`    Answer ${i + 1}: ${duration}ms`)
    }
    
    const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
    const maxUpdateTime = Math.max(...updateTimes)
    const minUpdateTime = Math.min(...updateTimes)
    
    logResult('Rapid Updates Average', avgUpdateTime, true, { 
      min: minUpdateTime, 
      max: maxUpdateTime,
      count: updateTimes.length 
    })
    
    // Cleanup: Delete test session
    await db.collection('quiz_sessions').deleteOne({ _id: insertResult.insertedId })
    console.log('  🧹 Test session cleaned up')
    
  } catch (error) {
    logResult('Session Operations', Date.now() - start, false, { 
      error: (error as Error).message 
    })
  }
}

async function testIndexes() {
  console.log('\n📊 Test 5: Index Analysis')
  const db = mongoose.connection.db!
  
  try {
    // Check quizzes indexes
    const quizIndexes = await db.collection('quizzes').indexes()
    console.log('\n  Quizzes Collection Indexes:')
    quizIndexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })
    
    // Check sessions indexes
    const sessionIndexes = await db.collection('quiz_sessions').indexes()
    console.log('\n  Quiz Sessions Collection Indexes:')
    sessionIndexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`)
    })
    
    // Check if important indexes exist
    const hasQuizPublicIndex = quizIndexes.some(idx => 
      idx.key.is_public !== undefined && idx.key.status !== undefined
    )
    const hasSessionStudentIndex = sessionIndexes.some(idx => 
      idx.key.student_id !== undefined
    )
    
    console.log('\n  Index Health:')
    console.log(`    ${hasQuizPublicIndex ? '✅' : '⚠️ '} Quiz public/status index`)
    console.log(`    ${hasSessionStudentIndex ? '✅' : '⚠️ '} Session student_id index`)
    
  } catch (error) {
    console.error('  ❌ Failed to check indexes:', (error as Error).message)
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 MONGODB PERFORMANCE SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  
  if (successful.length > 0) {
    console.log('\n⏱️  Performance Metrics:')
    
    const connection = results.find(r => r.operation === 'Connection')
    const simpleQueries = results.filter(r => 
      r.operation.includes('Find') || r.operation.includes('Count')
    )
    const updates = results.filter(r => r.operation.includes('Update'))
    
    if (connection) {
      console.log(`\n  Connection: ${connection.duration}ms`)
      if (connection.duration > 1000) {
        console.log('    ⚠️  Slow connection (>1s) - Check network/region')
      }
    }
    
    if (simpleQueries.length > 0) {
      const avg = simpleQueries.reduce((sum, r) => sum + r.duration, 0) / simpleQueries.length
      console.log(`\n  Read Operations: ${avg.toFixed(2)}ms average`)
      simpleQueries.forEach(r => {
        console.log(`    ${r.operation}: ${r.duration}ms`)
      })
      if (avg > 500) {
        console.log('    ⚠️  Slow reads (>500ms avg) - Check indexes')
      }
    }
    
    if (updates.length > 0) {
      const avg = updates.reduce((sum, r) => sum + r.duration, 0) / updates.length
      console.log(`\n  Write Operations: ${avg.toFixed(2)}ms average`)
      updates.forEach(r => {
        console.log(`    ${r.operation}: ${r.duration}ms`)
      })
      if (avg > 1000) {
        console.log('    ⚠️  Slow writes (>1s avg) - This is the bottleneck!')
      } else if (avg > 500) {
        console.log('    ⚠️  Moderate write latency (>500ms avg)')
      }
    }
  }
  
  console.log('\n💡 Recommendations:')
  
  const rapidUpdates = results.find(r => r.operation === 'Rapid Updates Average')
  if (rapidUpdates && rapidUpdates.duration > 1000) {
    console.log('  1. ⚠️  Database writes are slow - Consider:')
    console.log('     - Upgrading MongoDB Atlas tier')
    console.log('     - Moving to a closer region')
    console.log('     - Reducing document size (questions_cache)')
    console.log('     - Using bulk operations instead of individual updates')
  }
  
  const connection = results.find(r => r.operation === 'Connection')
  if (connection && connection.duration > 1000) {
    console.log('  2. ⚠️  Connection latency is high - Consider:')
    console.log('     - Using MongoDB Atlas in same region as Vercel')
    console.log('     - Checking network connectivity')
  }
  
  console.log('\n' + '='.repeat(60))
}

async function main() {
  console.log('🚀 Starting MongoDB Performance Tests...')
  console.log(`📍 MongoDB URI: ${process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@')}`)
  
  try {
    const connected = await testConnection()
    if (!connected) {
      console.error('\n❌ Cannot connect to MongoDB. Exiting.')
      process.exit(1)
    }
    
    await testSimpleQueries()
    await testComplexQueries()
    await testSessionOperations()
    await testIndexes()
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
  } finally {
    await mongoose.disconnect()
    printSummary()
  }
}

main()
