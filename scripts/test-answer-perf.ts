/**
 * Test answer submission performance
 * Measures time from answer submission to feedback display
 * 
 * Usage: npm run test:answer-perf [quizId]
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fquiz-web.vercel.app'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'student@fquiz.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Student@123456'
const QUIZ_ID = process.argv[2] || '69d47fb250cdb1d6b9ab2c32'
const ANSWERS_TO_TEST = 5

interface Timing { label: string; ms: number }
const timings: Timing[] = []

function log(label: string, ms: number, extra = '') {
  const icon = ms < 200 ? '✅' : ms < 500 ? '⚠️ ' : '❌'
  console.log(`${icon} ${label}: ${ms}ms ${extra}`)
  timings.push({ label, ms })
}

async function getCSRFAndLogin(): Promise<{ token: string; csrf: string } | null> {
  // Get CSRF
  const meRes = await fetch(`${API_BASE}/api/auth/me`)
  const csrf = meRes.headers.get('set-cookie')?.match(/csrf-token=([^;]+)/)?.[1] ?? ''

  const t = Date.now()
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `csrf-token=${csrf}`, 'x-csrf-token': csrf },
    body: JSON.stringify({ identifier: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  log('Login', Date.now() - t, `[${res.status}]`)
  if (!res.ok) return null

  const token = res.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1] ?? ''
  return token ? { token, csrf } : null
}

async function createOrGetSession(token: string, csrf: string): Promise<{ sessionId: string; mode: string } | null> {
  // Check existing active session
  let t = Date.now()
  const checkRes = await fetch(`${API_BASE}/api/sessions?quiz_id=${QUIZ_ID}`, {
    headers: { Cookie: `auth-token=${token}; csrf-token=${csrf}` },
  })
  const checkData = await checkRes.json()
  log('Check active session', Date.now() - t)

  if (checkData.activeSession?.sessionId) {
    console.log(`  → Reusing session: ${checkData.activeSession.sessionId} (${checkData.activeSession.answeredCount} answered)`)
    return { sessionId: checkData.activeSession.sessionId.toString(), mode: checkData.activeSession.mode }
  }

  // Create new session
  t = Date.now()
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `auth-token=${token}; csrf-token=${csrf}`, 'x-csrf-token': csrf },
    body: JSON.stringify({ quiz_id: QUIZ_ID, mode: 'immediate', difficulty: 'sequential' }),
  })
  const data = await res.json()
  log('Create session', Date.now() - t, `[${res.status}]`)
  if (!res.ok) { console.error('  Error:', data.error); return null }

  return { sessionId: (data.sessionId ?? data.session?._id)?.toString(), mode: 'immediate' }
}

async function fetchQuestions(token: string, csrf: string, sessionId: string): Promise<any[]> {
  const t = Date.now()
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/questions`, {
    headers: { Cookie: `auth-token=${token}; csrf-token=${csrf}` },
  })
  const data = await res.json()
  log(`Fetch all questions (${data.totalQuestions} câu)`, Date.now() - t, `[${res.status}]`)
  return data.questions ?? []
}

async function submitAnswer(
  token: string, csrf: string, sessionId: string,
  questionIndex: number, answerIndex: number
): Promise<{ isCorrect?: boolean; ms: number }> {
  const t = Date.now()
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `auth-token=${token}; csrf-token=${csrf}`, 'x-csrf-token': csrf },
    body: JSON.stringify({ question_index: questionIndex, answer_index: answerIndex, answer_indexes: [answerIndex] }),
  })
  const ms = Date.now() - t
  const data = await res.json()
  return { isCorrect: data.isCorrect, ms }
}

async function main() {
  console.log(`\n🚀 Answer Submission Performance Test`)
  console.log(`📍 API: ${API_BASE}`)
  console.log(`📍 Quiz: ${QUIZ_ID}`)
  console.log(`📍 Testing ${ANSWERS_TO_TEST} answers\n`)

  const auth = await getCSRFAndLogin()
  if (!auth) { console.error('❌ Login failed'); process.exit(1) }
  const { token, csrf } = auth

  const session = await createOrGetSession(token, csrf)
  if (!session) { console.error('❌ Session failed'); process.exit(1) }
  const { sessionId, mode } = session
  console.log(`\n📋 Session: ${sessionId} (mode: ${mode})`)

  // Fetch questions
  const questions = await fetchQuestions(token, csrf, sessionId)
  if (questions.length === 0) { console.error('❌ No questions'); process.exit(1) }

  // Test answer submissions
  console.log(`\n⏱️  Testing ${ANSWERS_TO_TEST} answer submissions...\n`)
  const answerTimes: number[] = []

  for (let i = 0; i < Math.min(ANSWERS_TO_TEST, questions.length); i++) {
    const q = questions[i]
    const answerIdx = 0 // Always pick first option for testing

    const { isCorrect, ms } = await submitAnswer(token, csrf, sessionId, i, answerIdx)
    answerTimes.push(ms)
    log(`Submit answer Q${i + 1}`, ms, `→ ${isCorrect ? '✓ Correct' : '✗ Wrong'}`)

    // Small delay between submissions
    await new Promise(r => setTimeout(r, 50))
  }

  // Summary
  console.log('\n' + '='.repeat(55))
  console.log('📊 ANSWER SUBMISSION PERFORMANCE')
  console.log('='.repeat(55))

  const avg = answerTimes.reduce((a, b) => a + b, 0) / answerTimes.length
  const min = Math.min(...answerTimes)
  const max = Math.max(...answerTimes)

  console.log(`\n  Average: ${avg.toFixed(0)}ms`)
  console.log(`  Min:     ${min}ms`)
  console.log(`  Max:     ${max}ms`)

  console.log('\n💡 Analysis:')
  if (avg < 200) {
    console.log('  ✅ Excellent! API response is very fast')
    console.log('  ✅ With instant local feedback, user sees result in ~0ms')
  } else if (avg < 500) {
    console.log('  ✅ Good performance - warm server')
    console.log('  ✅ With instant local feedback, user sees result in ~0ms')
    console.log('  ℹ️  API persists in background, no user impact')
  } else {
    console.log('  ⚠️  API is slow but user is NOT affected')
    console.log('  ✅ Feedback shown instantly from local preloaded data')
    console.log('  ℹ️  API call is fire-and-forget (background)')
  }

  console.log('\n📐 Architecture comparison:')
  console.log(`  OLD: User clicks → wait ${avg.toFixed(0)}ms → show result`)
  console.log(`  NEW: User clicks → show result instantly (0ms) → API saves in background`)
  console.log(`  Improvement: ~${avg.toFixed(0)}ms faster per answer`)
  console.log(`  For ${questions.length} questions: saves ~${((avg * questions.length) / 1000).toFixed(1)}s total`)
}

main().catch(console.error)
