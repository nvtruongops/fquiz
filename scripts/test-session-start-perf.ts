/**
 * Performance test: Measure time from "Start Quiz" click to session ready
 * Tests the full flow: POST /api/sessions → GET /api/sessions/[id]/questions → GET /api/sessions/[id]
 *
 * Usage: npm run test:session-perf
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fquiz-web.vercel.app'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'student@fquiz.dev'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Student@123456'
const TEST_QUIZ_ID = process.argv[2] || '69d47fb250cdb1d6b9ab2c32'

interface Timing { label: string; ms: number; status?: number }
const timings: Timing[] = []

function log(label: string, ms: number, status?: number) {
  const icon = ms < 500 ? '✅' : ms < 1500 ? '⚠️ ' : '❌'
  console.log(`${icon} ${label}: ${ms}ms${status ? ` [${status}]` : ''}`)
  timings.push({ label, ms, status })
}

async function login(): Promise<{ token: string; csrf: string } | null> {
  const t = Date.now()
  // First get CSRF token
  const meRes = await fetch(`${API_BASE}/api/auth/me`)
  const csrf = meRes.headers.get('set-cookie')?.match(/csrf-token=([^;]+)/)?.[1] ?? ''

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `csrf-token=${csrf}`, 'x-csrf-token': csrf },
    body: JSON.stringify({ identifier: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  log('Login (incl. CSRF fetch)', Date.now() - t, res.status)
  if (!res.ok) return null
  const authCookie = res.headers.get('set-cookie')
  const token = authCookie?.match(/auth-token=([^;]+)/)?.[1] ?? ''
  return token ? { token, csrf } : null
}

async function createSession(token: string, csrf: string, mode = 'immediate', difficulty = 'random', action?: string): Promise<{ sessionId?: string; code?: string; activeSession?: any }> {
  const t = Date.now()
  const body: any = { quiz_id: TEST_QUIZ_ID, mode, difficulty }
  if (action) body.action = action
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth-token=${token}; csrf-token=${csrf}`,
      'x-csrf-token': csrf,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  log(`Create Session (${mode}/${difficulty}${action ? '/' + action : ''})`, Date.now() - t, res.status)
  return data
}

async function fetchQuestions(token: string, sessionId: string): Promise<number> {
  const t = Date.now()
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/questions`, {
    headers: { Cookie: `auth-token=${token}` },
  })
  const data = await res.json()
  log(`Fetch Questions (${data.totalQuestions ?? '?'} câu)`, Date.now() - t, res.status)
  return data.totalQuestions ?? 0
}

async function fetchSessionState(token: string, sessionId: string): Promise<void> {
  const t = Date.now()
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    headers: { Cookie: `auth-token=${token}` },
  })
  const data = await res.json()
  log(`Fetch Session State (câu ${(data.session?.current_question_index ?? 0) + 1})`, Date.now() - t, res.status)
}

async function main() {
  console.log(`\n🚀 Session Start Performance Test`)
  console.log(`📍 API: ${API_BASE}`)
  console.log(`📍 Quiz: ${TEST_QUIZ_ID}\n`)

  // Step 1: Login
  const auth = await login()
  if (!auth) { console.error('❌ Login failed'); process.exit(1) }
  const { token, csrf } = auth

  // Step 2: Simulate "Bắt đầu ngay" → POST /api/sessions
  console.log('\n--- Scenario 1: First attempt (create or detect existing) ---')
  const totalNew = Date.now()
  const newSession = await createSession(token, csrf, 'immediate', 'random')

  if (newSession.code === 'ACTIVE_SESSION_EXISTS') {
    console.log(`ℹ️  Active session: ${newSession.activeSession?.answeredCount}/${newSession.activeSession?.totalQuestions} câu`)
    console.log(`   Mode: ${newSession.activeSession?.mode}, Difficulty: ${newSession.activeSession?.difficulty}`)
    log('Detect existing session (409)', Date.now() - totalNew)

    const sessionId = newSession.activeSession?.sessionId?.toString()
    if (sessionId) {
      console.log('\n--- Scenario 2: Continue session (parallel fetch) ---')
      const tContinue = Date.now()

      // Simulate what UI does: continue action + parallel questions+state fetch
      const [continueRes] = await Promise.all([
        createSession(token, csrf, 'immediate', 'random', 'continue'),
      ])
      log('Continue session', Date.now() - tContinue)

      const tParallel = Date.now()
      await Promise.all([
        fetchQuestions(token, sessionId),
        fetchSessionState(token, sessionId),
      ])
      log('Parallel: questions + session state', Date.now() - tParallel)
      log('TOTAL: click → quiz ready', Date.now() - totalNew)
    }
  } else if (newSession.sessionId) {
    const sessionId = newSession.sessionId
    log('Create new session', Date.now() - totalNew)

    console.log('\n--- After create: parallel fetch ---')
    const tParallel = Date.now()
    await Promise.all([
      fetchQuestions(token, sessionId),
      fetchSessionState(token, sessionId),
    ])
    log('Parallel: questions + session state', Date.now() - tParallel)
    log('TOTAL: click → quiz ready', Date.now() - totalNew)
  } else {
    console.log('Unexpected response:', newSession)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 PERFORMANCE SUMMARY')
  console.log('='.repeat(50))
  const total = timings.reduce((s, t) => s + t.ms, 0)
  timings.forEach(t => {
    const bar = '█'.repeat(Math.min(Math.round(t.ms / 100), 30))
    console.log(`  ${t.label.padEnd(40)} ${t.ms}ms ${bar}`)
  })
  console.log(`\n  Bottleneck: ${timings.sort((a, b) => b.ms - a.ms)[0]?.label}`)
  console.log('\n💡 Recommendations:')
  timings.forEach(t => {
    if (t.ms > 2000) console.log(`  ❌ ${t.label} is very slow (${t.ms}ms) - cold start or heavy query`)
    else if (t.ms > 1000) console.log(`  ⚠️  ${t.label} is slow (${t.ms}ms) - consider optimization`)
  })
}

main().catch(console.error)
