import crypto from 'node:crypto'
import fs from 'node:fs'
import mongoose from 'mongoose'
import {
  applyReviewedAnswerKeyChanges,
  planReviewedAnswerKeyRepair,
  restoreReviewedAnswerKeyChanges,
  type AnswerRepairSnapshot,
  type ReviewedAnswerResolution,
} from './lib/reviewed-answer-key-repair'

function argument(name: string) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function readResolutions(path: string): { resolutions: ReviewedAnswerResolution[] } {
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed.resolutions)) throw new Error('Resolution file must contain a resolutions array')
  for (const resolution of parsed.resolutions) {
    if (typeof resolution.canonicalId !== 'string' || !Array.isArray(resolution.answerTexts) || !resolution.answerTexts.length || !resolution.answerTexts.every((answer: unknown) => typeof answer === 'string')) {
      throw new Error('Each resolution requires a canonicalId and non-empty answerTexts string array')
    }
  }
  return parsed
}

async function collectSnapshots(db: mongoose.mongo.Db): Promise<{ snapshots: AnswerRepairSnapshot[]; sourceCounts: Record<string, number> }> {
  const projections = { _id: 1, question_id: 1, question_id_aliases: 1, text: 1, options: 1, correct_answer: 1, _reviewed_answer_key_repair: 1 }
  const [questions, questionbanks, quizzes, pinnedquestions] = await Promise.all([
    db.collection('questions').find({}, { projection: projections }).toArray(),
    db.collection('questionbanks').find({}, { projection: { ...projections, category_id: 1 } }).toArray(),
    db.collection('quizzes').find({}, { projection: { _id: 1, questions: 1 } }).toArray(),
    db.collection('pinnedquestions').find({}, { projection: projections }).toArray(),
  ])
  const snapshots: AnswerRepairSnapshot[] = [
    ...questions.map(question => ({ collection: 'questions' as const, documentId: question._id, question })),
    ...questionbanks.map(question => ({ collection: 'questionbanks' as const, documentId: question._id, question })),
    ...pinnedquestions.map(question => ({ collection: 'pinnedquestions' as const, documentId: question._id, question })),
  ]
  for (const quiz of quizzes) {
    for (const [questionIndex, question] of (quiz.questions ?? []).entries()) {
      snapshots.push({ collection: 'quizzes', documentId: quiz._id, questionIndex, question })
    }
  }
  return {
    snapshots,
    sourceCounts: { questions: questions.length, questionbanks: questionbanks.length, quizzes: quizzes.length, pinnedquestions: pinnedquestions.length },
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const restore = process.argv.includes('--restore')
  const journalPath = argument('--journal')
  const resolutionPath = argument('--resolutions')
  const backupRef = argument('--backup-ref')
  if (apply && restore) throw new Error('--apply and --restore are mutually exclusive')
  if (!journalPath) throw new Error('--journal is required')
  if ((apply || restore) && !backupRef) throw new Error('Every database write requires --backup-ref pointing to a verified backup archive')
  if (!apply && !restore && !resolutionPath) throw new Error('--resolutions is required for dry-run')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  const databaseIndex = process.argv.indexOf('--database')
  const databaseName = databaseIndex < 0 ? undefined : process.argv[databaseIndex + 1]
  await mongoose.connect(process.env.MONGODB_URI, { ...(databaseName ? { dbName: databaseName } : {}), serverSelectionTimeoutMS: 10000 })
  try {
    const db = mongoose.connection.db!
    const EJSON = mongoose.mongo.BSON.EJSON
    if (apply || restore) {
      const journal = EJSON.parse(fs.readFileSync(journalPath, 'utf8'))
      if (journal.kind !== 'reviewed-answer-key-repair' || journal.database !== db.databaseName) throw new Error('Journal kind or target database does not match')
      if (journal.blocked?.length) throw new Error('Journal has blocked answer groups; do not apply a partial reviewed repair')
      const stat = fs.statSync(backupRef!)
      if (!stat.isFile() || stat.size === 0) throw new Error('Backup archive is missing or empty')
      const progressPath = `${journalPath}.progress.jsonl`
      const fd = fs.openSync(progressPath, 'a', 0o600)
      try {
        const progress = (index: number, state: string) => {
          fs.writeSync(fd, JSON.stringify({ index, state, backupRef, at: new Date().toISOString() }) + '\n')
          fs.fsyncSync(fd)
        }
        progress(-1, restore ? 'restore-started' : 'apply-started')
        const result = restore
          ? await restoreReviewedAnswerKeyChanges(db as any, journal.changes, journal.migrationId)
          : await applyReviewedAnswerKeyChanges(db as any, journal.changes, journal.migrationId, progress)
        progress(-1, restore ? 'restore-finished' : 'apply-finished')
        console.log(JSON.stringify({ database: db.databaseName, mode: restore ? 'restore' : 'apply', migrationId: journal.migrationId, backupVerified: true, backupBytes: stat.size, ...result }))
      } finally { fs.closeSync(fd) }
      return
    }

    const { resolutions } = readResolutions(resolutionPath!)
    const { snapshots, sourceCounts } = await collectSnapshots(db)
    const plan = planReviewedAnswerKeyRepair(snapshots, resolutions)
    const migrationId = crypto.randomUUID()
    const journal = {
      kind: 'reviewed-answer-key-repair',
      database: db.databaseName,
      at: new Date().toISOString(),
      migrationId,
      resolutionSha256: crypto.createHash('sha256').update(fs.readFileSync(resolutionPath!)).digest('hex'),
      resolutionCount: resolutions.length,
      sourceCounts,
      plannedChanges: plan.changes.length,
      blocked: plan.blocked,
      changes: plan.changes,
    }
    fs.writeFileSync(journalPath, EJSON.stringify(journal, { relaxed: false }), { flag: 'wx', mode: 0o600 })
    console.log(JSON.stringify({ database: db.databaseName, mode: 'dry-run', migrationId, resolutionCount: resolutions.length, sourceCounts, plannedChanges: plan.changes.length, blocked: plan.blocked.length, blockedReasons: plan.blocked.reduce<Record<string, number>>((out, row) => { out[row.reason] = (out[row.reason] ?? 0) + 1; return out }, {}) }))
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
