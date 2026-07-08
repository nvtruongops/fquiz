import mongoose from 'mongoose'

type QuizDoc = {
  _id: mongoose.Types.ObjectId
  created_by?: mongoose.Types.ObjectId | null
  course_code?: string | null
  is_saved_from_explore?: boolean
  created_at?: Date | null
}

type PlannedUpdate = {
  id: mongoose.Types.ObjectId
  from: string
  to: string
  reason: 'normalize' | 'dedupe'
  owner: string
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function getArgValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) return fallback
  return value
}

function printHelp() {
  console.log('Audit and cleanup duplicate course_code by creator for quizzes')
  console.log('')
  console.log('Usage:')
  console.log('  tsx scripts/audit-quiz-course-code-duplicates.ts [--apply] [--env <name>] [--limit <n>]')
  console.log('')
  console.log('Options:')
  console.log('  --apply       Apply updates to DB. Default mode is dry-run audit only.')
  console.log('  --limit <n>   Limit number of planned updates to apply. 0 = no limit. Default 0.')
  console.log('  --env <name>  Label to print in logs only. Default local.')
  console.log('  --help        Show this help.')
  console.log('')
  console.log('Rules:')
  console.log('  - Scope: quizzes with created_by exists and is_saved_from_explore != true')
  console.log('  - course_code is normalized to UPPERCASE + trimmed')
  console.log('  - For duplicate (created_by + normalized course_code), keep newest quiz and rename older ones')
}

function normalizeCourseCode(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toUpperCase()
  return normalized.length > 0 ? normalized : 'QUIZ'
}

function createUniqueCode(base: string, used: Set<string>): string {
  const safeBase = base.length > 0 ? base : 'QUIZ'
  let counter = 1

  while (true) {
    const suffix = `-${counter}`
    const maxBaseLen = Math.max(1, 50 - suffix.length)
    const candidate = `${safeBase.slice(0, maxBaseLen)}${suffix}`
    if (!used.has(candidate)) return candidate
    counter += 1
  }
}

function compareByNewest(a: QuizDoc, b: QuizDoc): number {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
  if (bTime !== aTime) return bTime - aTime
  return b._id.toString().localeCompare(a._id.toString())
}

async function fetchScopedDocs(collection: mongoose.mongo.Collection): Promise<QuizDoc[]> {
  return (await collection
    .find(
      {
        created_by: { $exists: true, $ne: null },
        is_saved_from_explore: { $ne: true },
      },
      {
        projection: {
          _id: 1,
          created_by: 1,
          course_code: 1,
          created_at: 1,
          is_saved_from_explore: 1,
        },
      }
    )
    .toArray()) as QuizDoc[]
}

function groupDocsByOwner(docs: QuizDoc[]): Map<string, QuizDoc[]> {
  const docsByOwner = new Map<string, QuizDoc[]>()
  for (const doc of docs) {
    const owner = doc.created_by?.toString()
    if (!owner) continue
    const list = docsByOwner.get(owner) ?? []
    list.push(doc)
    docsByOwner.set(owner, list)
  }
  return docsByOwner
}

function planUpdatesForOwner(owner: string, ownerDocs: QuizDoc[]) {
  const updates: PlannedUpdate[] = []
  let duplicateGroups = 0
  let duplicateDocs = 0

  const usedCodes = new Set<string>()
  for (const doc of ownerDocs) {
    usedCodes.add(normalizeCourseCode(doc.course_code))
  }

  const groups = new Map<string, QuizDoc[]>()
  for (const doc of ownerDocs) {
    const key = normalizeCourseCode(doc.course_code)
    const group = groups.get(key) ?? []
    group.push(doc)
    groups.set(key, group)
  }

  for (const [normalizedCode, group] of groups.entries()) {
    group.sort(compareByNewest)

    const keeper = group[0]
    const keeperNormalized = normalizeCourseCode(keeper.course_code)

    if ((keeper.course_code ?? '').trim() !== keeperNormalized) {
      updates.push({
        id: keeper._id,
        from: keeper.course_code ?? '',
        to: keeperNormalized,
        reason: 'normalize',
        owner,
      })
    }

    if (group.length <= 1) continue

    duplicateGroups += 1
    duplicateDocs += group.length - 1

    for (let i = 1; i < group.length; i += 1) {
      const doc = group[i]
      const nextCode = createUniqueCode(normalizedCode, usedCodes)
      usedCodes.add(nextCode)

      updates.push({
        id: doc._id,
        from: doc.course_code ?? '',
        to: nextCode,
        reason: 'dedupe',
        owner,
      })
    }
  }

  return { updates, duplicateGroups, duplicateDocs }
}

function buildPlan(docsByOwner: Map<string, QuizDoc[]>) {
  const plannedUpdates: PlannedUpdate[] = []
  let duplicateGroups = 0
  let duplicateDocs = 0

  for (const [owner, ownerDocs] of docsByOwner.entries()) {
    const ownerPlan = planUpdatesForOwner(owner, ownerDocs)
    plannedUpdates.push(...ownerPlan.updates)
    duplicateGroups += ownerPlan.duplicateGroups
    duplicateDocs += ownerPlan.duplicateDocs
  }

  return { plannedUpdates, duplicateGroups, duplicateDocs }
}

function printSummary(env: string, docs: QuizDoc[], docsByOwner: Map<string, QuizDoc[]>, plannedUpdates: PlannedUpdate[], duplicateGroups: number, duplicateDocs: number) {
  const normalizeOnlyCount = plannedUpdates.filter((u) => u.reason === 'normalize').length
  const dedupeCount = plannedUpdates.filter((u) => u.reason === 'dedupe').length

  console.log(`Environment: ${env}`)
  console.log(`Scope documents: ${docs.length}`)
  console.log(`Owner count: ${docsByOwner.size}`)
  console.log(`Duplicate groups: ${duplicateGroups}`)
  console.log(`Duplicate documents to rename: ${duplicateDocs}`)
  console.log(`Normalization updates: ${normalizeOnlyCount}`)
  console.log(`Deduplication updates: ${dedupeCount}`)
  console.log(`Total planned updates: ${plannedUpdates.length}`)

  const preview = plannedUpdates.slice(0, 20)
  if (preview.length === 0) return

  console.log('Preview (first 20 updates):')
  for (const row of preview) {
    console.log(
      `  [${row.reason}] owner=${row.owner} quiz=${row.id.toString()} from="${row.from}" to="${row.to}"`
    )
  }
}

async function applyPlan(
  collection: mongoose.mongo.Collection,
  plannedUpdates: PlannedUpdate[],
  limit: number
) {
  const updatesToApply = limit > 0 ? plannedUpdates.slice(0, limit) : plannedUpdates
  if (updatesToApply.length === 0) {
    console.log('No updates to apply.')
    return
  }

  const bulkOps = updatesToApply.map((u) => ({
    updateOne: {
      filter: { _id: u.id },
      update: { $set: { course_code: u.to } },
    },
  }))

  const result = await collection.bulkWrite(bulkOps, { ordered: false })
  console.log('Apply mode finished.')
  console.log(`Matched: ${result.matchedCount}`)
  console.log(`Modified: ${result.modifiedCount}`)
  console.log(`Upserts: ${result.upsertedCount}`)
}

async function main() {
  if (hasFlag('--help')) {
    printHelp()
    return
  }

  const apply = hasFlag('--apply')
  const limit = Math.max(0, Number.parseInt(getArgValue('--limit', '0'), 10) || 0)
  const env = getArgValue('--env', 'local')
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  await mongoose.connect(mongoUri, { bufferCommands: false })
  const collection = mongoose.connection.collection('quizzes')

  const docs = await fetchScopedDocs(collection)
  const docsByOwner = groupDocsByOwner(docs)
  const plan = buildPlan(docsByOwner)

  printSummary(env, docs, docsByOwner, plan.plannedUpdates, plan.duplicateGroups, plan.duplicateDocs)

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to write updates.')
    await mongoose.disconnect()
    return
  }

  await applyPlan(collection, plan.plannedUpdates, limit)
  await mongoose.disconnect()
}

void (async () => {
  try {
    await main()
  } catch (err) {
    console.error('audit-quiz-course-code-duplicates failed:', err)
    try {
      await mongoose.disconnect()
    } catch {
      // noop
    }
    process.exitCode = 1
  }
})()
