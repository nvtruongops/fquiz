import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import mongoose from 'mongoose'

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])
const EXPECTED_TEST_DATABASE = 'fquiz_load_test'
const API_BASE_URL = 'http://127.0.0.1:3100'
const API_PORT = 3100
const CONCURRENCY_PROFILES = [1, 5, 10]
const STARTUP_TIMEOUT_MS = 30_000
const REQUEST_TIMEOUT_MS = 15_000

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(scriptPath), '..')

export function validateLocalConfig({ apiBaseUrl, mongoUri }) {
  let apiUrl
  let mongoUrl

  try {
    apiUrl = new URL(apiBaseUrl)
  } catch {
    throw new Error('API URL must be a valid loopback URL')
  }

  try {
    mongoUrl = new URL(mongoUri)
  } catch {
    throw new Error('MongoDB URI must be a valid loopback URL')
  }

  if (
    apiUrl.protocol !== 'http:' ||
    !LOOPBACK_HOSTS.has(apiUrl.hostname) ||
    apiUrl.port !== String(API_PORT) ||
    apiUrl.pathname !== '/' ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash
  ) {
    throw new Error('API URL must use HTTP on loopback port 3100')
  }

  if (
    mongoUrl.protocol !== 'mongodb:' ||
    !LOOPBACK_HOSTS.has(mongoUrl.hostname) ||
    !['', '27017'].includes(mongoUrl.port)
  ) {
    throw new Error('MongoDB URI must use mongodb on loopback port 27017')
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(mongoUrl.pathname.replace(/^\//, ''))
  } catch {
    throw new Error(`MongoDB database name must be ${EXPECTED_TEST_DATABASE}`)
  }
  if (databaseName !== EXPECTED_TEST_DATABASE) {
    throw new Error(`MongoDB database name must be ${EXPECTED_TEST_DATABASE}`)
  }

  return { apiBaseUrl: apiUrl, mongoUri, databaseName }
}

export function percentile(samples, p) {
  if (!Array.isArray(samples) || samples.length === 0 || !samples.every(Number.isFinite)) {
    throw new Error('Percentile samples must be a non-empty array of finite numbers')
  }
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    throw new Error('Percentile must be greater than 0 and no greater than 1')
  }

  const sortedSamples = [...samples].sort((left, right) => left - right)
  return sortedSamples[Math.ceil(p * sortedSamples.length) - 1]
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function assertBuildExists() {
  const buildIdPath = resolve(repoRoot, 'apps/web/.next/BUILD_ID')
  const nextCliPath = resolve(repoRoot, 'node_modules/next/dist/bin/next')

  if (!existsSync(buildIdPath)) {
    throw new Error('Built web app not found. Run `npm run build:web` with the local fquiz_load_test MONGODB_URI first.')
  }
  if (!existsSync(nextCliPath)) {
    throw new Error('Next.js CLI not found at node_modules/next/dist/bin/next. Install the repository dependencies first.')
  }
}

async function assertPortAvailable(host, port) {
  await new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Local test port ${host}:${port} is already in use. Stop that process before running the harness.`))
        return
      }
      reject(new Error(`Could not check local test port ${host}:${port}: ${error.message}`))
    })
    server.listen(port, host, () => {
      server.close((error) => {
        if (error) reject(error)
        else resolvePromise()
      })
    })
  })
}

function redactMongoUri(text, mongoUri) {
  return text.replaceAll(mongoUri, 'mongodb://127.0.0.1:27017/fquiz_load_test')
}

function tailLines(lines, count = 30) {
  return lines.slice(-count).join('').trim()
}

async function waitForServer(child, serverOutput, apiBaseUrl) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (child.spawnError) {
      throw new Error(`Could not start the local web server: ${child.spawnError.message}`)
    }
    if (child.exitCode !== null) {
      throw new Error(`Local web server exited before becoming ready (code ${child.exitCode}).\n${tailLines(serverOutput)}`)
    }

    try {
      const response = await fetch(new URL('/api/health', apiBaseUrl), {
        signal: AbortSignal.timeout(1_500),
      })
      if (response.ok) {
        const health = await response.json()
        if (health.status === 'healthy') return
      }
    } catch {
      // The app may still be compiling or opening its local MongoDB connection.
    }
    await delay(250)
  }

  throw new Error(`Local web server did not become healthy within ${STARTUP_TIMEOUT_MS / 1000} seconds.\n${tailLines(serverOutput)}`)
}

function startLocalServer(mongoUri) {
  const cliPath = resolve(repoRoot, 'node_modules/next/dist/bin/next')
  const serverOutput = []
  const child = spawn(process.execPath, [cliPath, 'start', '-p', String(API_PORT), '-H', '127.0.0.1'], {
    cwd: resolve(repoRoot, 'apps/web'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(API_PORT),
      HOSTNAME: '127.0.0.1',
      MONGODB_URI: mongoUri,
      CORS_ALLOWED_ORIGINS: API_BASE_URL,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      serverOutput.push(chunk)
      if (serverOutput.length > 100) serverOutput.shift()
    })
  }
  child.on('error', (error) => {
    child.spawnError = error
    serverOutput.push(`${error.message}\n`)
  })

  return { child, serverOutput }
}

async function stopLocalServer(child) {
  if (!child || child.spawnError || child.exitCode !== null) return

  // Let fire-and-forget student-count updates finish after the request batch.
  await delay(500)
  const exited = new Promise((resolvePromise) => child.once('exit', resolvePromise))
  if (!child.killed) child.kill('SIGTERM')
  const gracefulStop = await Promise.race([
    exited.then(() => true),
    delay(5_000).then(() => false),
  ])
  if (!gracefulStop && child.exitCode === null) {
    child.kill('SIGKILL')
    await Promise.race([exited, delay(2_000)])
  }
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers.get('set-cookie')
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

function getCookieValue(headers, cookieName) {
  const prefix = `${cookieName}=`
  for (const setCookie of getSetCookieHeaders(headers)) {
    const cookie = setCookie.split(';', 1)[0]?.trim()
    if (cookie?.startsWith(prefix)) return cookie.slice(prefix.length)
  }
  return undefined
}

function summarize(samples) {
  if (samples.length === 0) {
    return { count: 0, p50Ms: null, p95Ms: null, maxMs: null, statusCounts: {} }
  }

  return {
    count: samples.length,
    p50Ms: Number(percentile(samples.map((sample) => sample.durationMs), 0.5).toFixed(2)),
    p95Ms: Number(percentile(samples.map((sample) => sample.durationMs), 0.95).toFixed(2)),
    maxMs: Number(Math.max(...samples.map((sample) => sample.durationMs)).toFixed(2)),
    statusCounts: Object.fromEntries(
      [...new Set(samples.map((sample) => sample.status))]
        .sort((left, right) => left - right)
        .map((status) => [status, samples.filter((sample) => sample.status === status).length])
    ),
  }
}

async function timedFetch(url, options) {
  const startedAt = performance.now()
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const bodyText = await response.text()
  const durationMs = performance.now() - startedAt
  let body
  try {
    body = JSON.parse(bodyText)
  } catch {
    body = undefined
  }

  return { response, body, bodyText, durationMs }
}

async function runProfile(concurrency, runId, quizId, apiBaseUrl) {
  const identifier = `loadtest-${runId}-${concurrency}`
  const csrfToken = randomUUID()
  const postUrl = new URL('/api/sessions', apiBaseUrl)
  const postStartedAt = performance.now()
  const postResults = await Promise.allSettled(Array.from({ length: concurrency }, async () => {
    const result = await timedFetch(postUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': identifier,
        'x-csrf-token': csrfToken,
        origin: apiBaseUrl.origin,
        cookie: `csrf-token=${csrfToken}`,
      },
      body: JSON.stringify({ quiz_id: quizId, mode: 'immediate', difficulty: 'sequential' }),
    })
    const sessionId = result.body?.sessionId?.toString()
    const guestId = getCookieValue(result.response.headers, 'fquiz-guest-id')
    return { ...result, sessionId, guestId }
  }))
  const postWallMs = performance.now() - postStartedAt

  const postSamples = postResults.flatMap((result) =>
    result.status === 'fulfilled'
      ? [{ durationMs: result.value.durationMs, status: result.value.response.status }]
      : []
  )
  const sessions = []
  const failures = postResults.flatMap((result, index) => {
    if (result.status === 'rejected') return [`POST ${index + 1} failed: ${result.reason?.message ?? result.reason}`]
    const { response, body, bodyText, sessionId, guestId } = result.value
    if (response.status !== 201) return [`POST ${index + 1} returned ${response.status}: ${bodyText.slice(0, 500)}`]
    if (!sessionId || !guestId) return [`POST ${index + 1} did not return sessionId and fquiz-guest-id`]
    sessions.push({ sessionId, guestId })
    return body?.isGuest === true ? [] : [`POST ${index + 1} did not create a guest session`]
  })

  const followupsStartedAt = performance.now()
  const [questionsResults, sessionResults] = await Promise.all([
    Promise.allSettled(sessions.map(async ({ sessionId, guestId }) => {
      const result = await timedFetch(new URL(`/api/sessions/${encodeURIComponent(sessionId)}/questions`, apiBaseUrl), {
        headers: { cookie: `fquiz-guest-id=${guestId}`, 'x-real-ip': identifier },
      })
      return { ...result, sessionId }
    })),
    Promise.allSettled(sessions.map(async ({ sessionId, guestId }) => {
      const result = await timedFetch(new URL(`/api/sessions/${encodeURIComponent(sessionId)}`, apiBaseUrl), {
        headers: { cookie: `fquiz-guest-id=${guestId}`, 'x-real-ip': identifier },
      })
      return { ...result, sessionId }
    })),
  ])
  const followupsWallMs = performance.now() - followupsStartedAt

  const questionsSamples = questionsResults.flatMap((result) =>
    result.status === 'fulfilled'
      ? [{ durationMs: result.value.durationMs, status: result.value.response.status }]
      : []
  )
  const sessionSamples = sessionResults.flatMap((result) =>
    result.status === 'fulfilled'
      ? [{ durationMs: result.value.durationMs, status: result.value.response.status }]
      : []
  )

  for (const [label, results] of [['questions GET', questionsResults], ['session GET', sessionResults]]) {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failures.push(`${label} ${index + 1} failed: ${result.reason?.message ?? result.reason}`)
      } else if (result.value.response.status !== 200) {
        failures.push(`${label} ${index + 1} returned ${result.value.response.status}: ${result.value.bodyText.slice(0, 500)}`)
      }
    })
  }

  const allWallMs = postWallMs + followupsWallMs
  const attemptedRequests = concurrency + sessions.length * 2
  const report = {
    concurrency,
    totalWallMs: Number(allWallMs.toFixed(2)),
    totalRequests: attemptedRequests,
    requestsPerSecond: Number((attemptedRequests / (allWallMs / 1000)).toFixed(2)),
    phases: {
      createSessionPost: { wallMs: Number(postWallMs.toFixed(2)), ...summarize(postSamples) },
      questionsGet: { wallMs: Number(followupsWallMs.toFixed(2)), ...summarize(questionsSamples) },
      sessionGet: { wallMs: Number(followupsWallMs.toFixed(2)), ...summarize(sessionSamples) },
    },
  }
  console.log(JSON.stringify(report))

  if (postSamples.length !== concurrency || questionsSamples.length !== concurrency || sessionSamples.length !== concurrency) {
    failures.push(`Profile ${concurrency} did not complete every request`)
  }
  if (failures.length > 0) {
    throw new Error(`Profile ${concurrency} failed:\n- ${failures.join('\n- ')}`)
  }

}

async function cleanupFixture({ child, database, quizId, identifiers, serverOutput }) {
  const cleanupErrors = []
  try {
    await stopLocalServer(child)
  } catch (error) {
    cleanupErrors.push(`Could not stop the local web server: ${error.message}`)
  }

  if (mongoose.connection.readyState === 1 && database) {
    const cleanupTasks = [
      ...(quizId ? [
        ['quizsessions', () => database.collection('quizsessions').deleteMany({ quiz_id: quizId })],
        ['quizzes', () => database.collection('quizzes').deleteOne({ _id: quizId })],
      ] : []),
      ['rate_limits', () => database.collection('rate_limits').deleteMany({
        bucketKey: { $regex: `^(?:${identifiers.map(escapeRegExp).join('|')}):` },
      })],
    ]
    for (const [collectionName, operation] of cleanupTasks) {
      try {
        const result = await operation()
        console.log(JSON.stringify({ cleanup: collectionName, deleted: result.deletedCount }))
      } catch (error) {
        cleanupErrors.push(`Could not clean ${collectionName}: ${error.message}`)
      }
    }
  } else if (quizId) {
    cleanupErrors.push('MongoDB disconnected before fixture cleanup could run')
  }

  try {
    await mongoose.disconnect()
  } catch (error) {
    cleanupErrors.push(`Could not disconnect from the local test database: ${error.message}`)
  }

  if (cleanupErrors.length > 0) {
    const logs = serverOutput?.length ? `\n${tailLines(serverOutput)}` : ''
    throw new Error(`${cleanupErrors.join('\n')}${logs}`)
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function main() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required. Set it to mongodb://127.0.0.1:27017/fquiz_load_test; the harness never loads .env.local.')
  }

  const config = validateLocalConfig({ apiBaseUrl: API_BASE_URL, mongoUri })
  assertBuildExists()
  await assertPortAvailable(config.apiBaseUrl.hostname, API_PORT)

  const runId = randomUUID()
  const identifiers = CONCURRENCY_PROFILES.map((concurrency) => `loadtest-${runId}-${concurrency}`)
  let quizId
  let database
  let server
  let runError
  let receivedSignal
  const onSignal = (signal) => {
    receivedSignal = signal
    if (server?.child && server.child.exitCode === null && !server.child.killed) {
      server.child.kill('SIGTERM')
    }
  }
  const throwIfInterrupted = () => {
    if (receivedSignal) throw new Error(`Harness interrupted by ${receivedSignal}; cleaning up local fixtures.`)
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  try {
    await mongoose.connect(config.mongoUri, {
      bufferCommands: false,
      connectTimeoutMS: 3_000,
      serverSelectionTimeoutMS: 3_000,
      maxPoolSize: 10,
      minPoolSize: 0,
    })
    throwIfInterrupted()
    database = mongoose.connection.db
    if (!database) throw new Error('Mongoose connected without selecting a database')

    const quizObjectId = new mongoose.Types.ObjectId()
    const categoryId = new mongoose.Types.ObjectId()
    const questionId = `loadtest-${runId}`
    const now = new Date()
    quizId = quizObjectId
    await database.collection('quizzes').insertOne({
      _id: quizObjectId,
      title: `Local session-init load fixture ${runId}`,
      description: 'Disposable local-only load-test fixture.',
      category_id: categoryId,
      course_code: `LOADTEST-${runId}`,
      questions: [{
        _id: new mongoose.Types.ObjectId(),
        question_id: questionId,
        text: 'Local load-test question: choose the correct option.',
        options: ['Option one', 'Option two'],
        correct_answer: [0],
        explanation: 'Disposable local load-test fixture.',
      }],
      question_refs: [],
      questionCount: 1,
      studentCount: 0,
      created_at: now,
      createdAt: now,
      updatedAt: now,
      status: 'published',
      is_public: true,
      expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    })
    throwIfInterrupted()

    server = startLocalServer(config.mongoUri)
    await waitForServer(server.child, server.serverOutput, config.apiBaseUrl)
    throwIfInterrupted()
    console.log(JSON.stringify({ event: 'local-server-ready', apiBaseUrl: config.apiBaseUrl.origin, databaseName: config.databaseName, runId }))

    for (const concurrency of CONCURRENCY_PROFILES) {
      throwIfInterrupted()
      await runProfile(concurrency, runId, quizObjectId.toString(), config.apiBaseUrl)
    }
  } catch (error) {
    runError = error
  } finally {
    try {
      await cleanupFixture({
        child: server?.child,
        database,
        quizId,
        identifiers,
        serverOutput: server?.serverOutput,
      })
    } catch (cleanupError) {
      runError = runError
        ? new Error(`${runError.message}\nCleanup also failed: ${cleanupError.message}`)
        : cleanupError
    } finally {
      process.off('SIGINT', onSignal)
      process.off('SIGTERM', onSignal)
    }
  }

  if (receivedSignal && !runError) {
    runError = new Error(`Harness interrupted by ${receivedSignal}; local fixtures were cleaned up.`)
  }

  if (runError) {
    const message = redactMongoUri(runError.stack ?? runError.message, config.mongoUri)
    throw new Error(message)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.stack ?? error.message)
    process.exitCode = 1
  })
}
