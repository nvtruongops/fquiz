/**
 * Performance Test Script for Quiz System
 * Tests API response times to identify bottlenecks between Vercel and MongoDB
 * 
 * Usage:
 * 1. Set environment variables in .env.local
 * 2. Run: npm run test:performance
 * 
 * Tests:
 * - Database connection time
 * - Session creation time
 * - Questions fetch time
 * - Answer submission time (immediate mode)
 * - End-to-end quiz flow
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fquiz-web.vercel.app'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123456'

interface TimingResult {
  operation: string
  duration: number
  success: boolean
  error?: string
  details?: any
}

const results: TimingResult[] = []

function logTiming(operation: string, duration: number, success: boolean, error?: string, details?: any) {
  const result: TimingResult = { operation, duration, success, error, details }
  results.push(result)
  
  const status = success ? '✅' : '❌'
  const errorMsg = error ? ` - ${error}` : ''
  console.log(`${status} ${operation}: ${duration}ms${errorMsg}`)
  
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2))
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n📊 Testing Database Connection...')
  const start = Date.now()
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })
    
    const duration = Date.now() - start
    logTiming('MongoDB Connection', duration, true)
    
    // Test a simple query
    const queryStart = Date.now()
    const db = mongoose.connection.db
    await db.collection('quizzes').findOne({ is_public: true, status: 'published' })
    const queryDuration = Date.now() - queryStart
    
    logTiming('MongoDB Simple Query', queryDuration, true)
    
    return true
  } catch (error) {
    const duration = Date.now() - start
    logTiming('MongoDB Connection', duration, false, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testLogin(): Promise<string | null> {
  console.log('\n🔐 Testing Login...')
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      }),
    })
    
    const duration = Date.now() - start
    
    if (!response.ok) {
      const error = await response.text()
      logTiming('Login API', duration, false, `Status ${response.status}: ${error}`)
      return null
    }
    
    // Extract auth token from Set-Cookie header
    const setCookie = response.headers.get('set-cookie')
    const authToken = setCookie?.match(/auth-token=([^;]+)/)?.[1]
    
    logTiming('Login API', duration, true, undefined, { hasToken: !!authToken })
    
    return authToken || null
  } catch (error) {
    const duration = Date.now() - start
    logTiming('Login API', duration, false, error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

async function testGetPublicQuizzes(): Promise<string | null> {
  console.log('\n📚 Testing Get Public Quizzes...')
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/public/quizzes?sort=popular&limit=1`)
    const duration = Date.now() - start
    
    if (!response.ok) {
      const error = await response.text()
      logTiming('Get Public Quizzes', duration, false, `Status ${response.status}: ${error}`)
      return null
    }
    
    const data = await response.json()
    const quizId = data.data?.[0]?.id
    
    logTiming('Get Public Quizzes', duration, true, undefined, { 
      count: data.data?.length,
      quizId 
    })
    
    return quizId || null
  } catch (error) {
    const duration = Date.now() - start
    logTiming('Get Public Quizzes', duration, false, error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

async function testCreateSession(authToken: string, quizId: string): Promise<string | null> {
  console.log('\n🎯 Testing Create Quiz Session...')
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`,
      },
      body: JSON.stringify({
        quiz_id: quizId,
        mode: 'immediate',
        difficulty: 'medium',
      }),
    })
    
    const duration = Date.now() - start
    
    if (!response.ok) {
      const error = await response.text()
      logTiming('Create Session', duration, false, `Status ${response.status}: ${error}`)
      return null
    }
    
    const data = await response.json()
    const sessionId = data.sessionId
    
    logTiming('Create Session', duration, true, undefined, { sessionId })
    
    return sessionId || null
  } catch (error) {
    const duration = Date.now() - start
    logTiming('Create Session', duration, false, error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

async function testGetQuestions(authToken: string, sessionId: string): Promise<number> {
  console.log('\n❓ Testing Get Questions...')
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/questions`, {
      headers: {
        'Cookie': `auth-token=${authToken}`,
      },
    })
    
    const duration = Date.now() - start
    
    if (!response.ok) {
      const error = await response.text()
      logTiming('Get Questions', duration, false, `Status ${response.status}: ${error}`)
      return 0
    }
    
    const data = await response.json()
    const questionCount = data.questions?.length || 0
    
    logTiming('Get Questions', duration, true, undefined, { 
      questionCount,
      mode: data.mode,
      hasCorrectAnswers: data.questions?.[0]?.correct_answer !== undefined
    })
    
    return questionCount
  } catch (error) {
    const duration = Date.now() - start
    logTiming('Get Questions', duration, false, error instanceof Error ? error.message : 'Unknown error')
    return 0
  }
}

async function testSubmitAnswer(authToken: string, sessionId: string, questionIndex: number): Promise<boolean> {
  console.log(`\n✍️  Testing Submit Answer (Question ${questionIndex})...`)
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`,
      },
      body: JSON.stringify({
        question_index: questionIndex,
        answer_index: 0, // Just pick first option for testing
      }),
    })
    
    const duration = Date.now() - start
    
    if (!response.ok) {
      const error = await response.text()
      logTiming(`Submit Answer Q${questionIndex}`, duration, false, `Status ${response.status}: ${error}`)
      return false
    }
    
    const data = await response.json()
    
    logTiming(`Submit Answer Q${questionIndex}`, duration, true, undefined, {
      isCorrect: data.isCorrect,
      hasExplanation: !!data.explanation
    })
    
    return true
  } catch (error) {
    const duration = Date.now() - start
    logTiming(`Submit Answer Q${questionIndex}`, duration, false, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

async function testDirectDatabaseQuery(): Promise<void> {
  console.log('\n🔍 Testing Direct Database Queries...')
  
  try {
    const db = mongoose.connection.db
    
    // Test 1: Find a quiz
    let start = Date.now()
    const quiz = await db.collection('quizzes').findOne({ 
      is_public: true, 
      status: 'published' 
    })
    logTiming('DB: Find Quiz', Date.now() - start, true, undefined, { 
      hasQuiz: !!quiz,
      questionCount: quiz?.questions?.length 
    })
    
    // Test 2: Find a session
    start = Date.now()
    const session = await db.collection('quiz_sessions').findOne({})
    logTiming('DB: Find Session', Date.now() - start, true, undefined, { 
      hasSession: !!session 
    })
    
    // Test 3: Aggregate query (more complex)
    start = Date.now()
    const categories = await db.collection('categories').find({ 
      is_public: true,
      status: 'approved'
    }).limit(10).toArray()
    logTiming('DB: Find Categories', Date.now() - start, true, undefined, { 
      count: categories.length 
    })
    
    // Test 4: Update operation
    if (session) {
      start = Date.now()
      await db.collection('quiz_sessions').updateOne(
        { _id: session._id },
        { $set: { last_activity_at: new Date() } }
      )
      logTiming('DB: Update Session', Date.now() - start, true)
    }
    
  } catch (error) {
    console.error('❌ Direct database query failed:', error)
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE TEST SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  
  if (successful.length > 0) {
    console.log('\n⏱️  Timing Breakdown:')
    
    // Group by category
    const dbOps = successful.filter(r => r.operation.includes('MongoDB') || r.operation.includes('DB:'))
    const apiOps = successful.filter(r => !r.operation.includes('MongoDB') && !r.operation.includes('DB:'))
    
    if (dbOps.length > 0) {
      console.log('\n  Database Operations:')
      dbOps.forEach(r => {
        console.log(`    ${r.operation}: ${r.duration}ms`)
      })
      const avgDb = dbOps.reduce((sum, r) => sum + r.duration, 0) / dbOps.length
      console.log(`    Average: ${avgDb.toFixed(2)}ms`)
    }
    
    if (apiOps.length > 0) {
      console.log('\n  API Operations:')
      apiOps.forEach(r => {
        console.log(`    ${r.operation}: ${r.duration}ms`)
      })
      const avgApi = apiOps.reduce((sum, r) => sum + r.duration, 0) / apiOps.length
      console.log(`    Average: ${avgApi.toFixed(2)}ms`)
    }
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Operations:')
    failed.forEach(r => {
      console.log(`  ${r.operation}: ${r.error}`)
    })
  }
  
  // Performance analysis
  console.log('\n🔍 Performance Analysis:')
  const dbConnection = results.find(r => r.operation === 'MongoDB Connection')
  const dbQuery = results.find(r => r.operation === 'MongoDB Simple Query')
  const submitAnswer = results.filter(r => r.operation.includes('Submit Answer'))
  
  if (dbConnection && dbConnection.duration > 1000) {
    console.log('  ⚠️  Database connection is slow (>1s) - Check MongoDB Atlas region/network')
  }
  
  if (dbQuery && dbQuery.duration > 500) {
    console.log('  ⚠️  Database queries are slow (>500ms) - Check indexes and query optimization')
  }
  
  if (submitAnswer.length > 0) {
    const avgSubmit = submitAnswer.reduce((sum, r) => sum + r.duration, 0) / submitAnswer.length
    if (avgSubmit > 2000) {
      console.log(`  ⚠️  Answer submission is very slow (avg ${avgSubmit.toFixed(0)}ms) - Likely database write performance issue`)
    } else if (avgSubmit > 1000) {
      console.log(`  ⚠️  Answer submission is slow (avg ${avgSubmit.toFixed(0)}ms) - Consider optimizing quiz-engine logic`)
    } else {
      console.log(`  ✅ Answer submission performance is good (avg ${avgSubmit.toFixed(0)}ms)`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
}

async function main() {
  console.log('🚀 Starting Quiz Performance Tests...')
  console.log(`📍 API Base URL: ${API_BASE_URL}`)
  console.log(`📍 Test User: ${TEST_USER_EMAIL}`)
  
  try {
    // Test 1: Database Connection
    const dbConnected = await testDatabaseConnection()
    if (!dbConnected) {
      console.error('\n❌ Database connection failed. Cannot continue tests.')
      process.exit(1)
    }
    
    // Test 2: Direct Database Queries
    await testDirectDatabaseQuery()
    
    // Test 3: Login
    const authToken = await testLogin()
    if (!authToken) {
      console.error('\n❌ Login failed. Cannot continue API tests.')
      console.log('💡 Make sure TEST_USER_EMAIL and TEST_USER_PASSWORD are set correctly in .env.local')
      await mongoose.disconnect()
      printSummary()
      process.exit(1)
    }
    
    // Test 4: Get Public Quizzes
    const quizId = await testGetPublicQuizzes()
    if (!quizId) {
      console.error('\n❌ No public quizzes found. Cannot continue.')
      await mongoose.disconnect()
      printSummary()
      process.exit(1)
    }
    
    // Test 5: Create Session
    const sessionId = await testCreateSession(authToken, quizId)
    if (!sessionId) {
      console.error('\n❌ Session creation failed. Cannot continue.')
      await mongoose.disconnect()
      printSummary()
      process.exit(1)
    }
    
    // Test 6: Get Questions
    const questionCount = await testGetQuestions(authToken, sessionId)
    if (questionCount === 0) {
      console.error('\n❌ No questions found. Cannot continue.')
      await mongoose.disconnect()
      printSummary()
      process.exit(1)
    }
    
    // Test 7: Submit Answers (test first 3 questions)
    const questionsToTest = Math.min(3, questionCount)
    for (let i = 0; i < questionsToTest; i++) {
      await testSubmitAnswer(authToken, sessionId, i)
      // Add small delay between submissions to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
  } finally {
    await mongoose.disconnect()
    printSummary()
  }
}

main()
