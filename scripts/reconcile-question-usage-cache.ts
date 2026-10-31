import fs from 'node:fs'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { buildQuestionUsageCachePlan, applyQuestionUsageCacheChanges, restoreQuestionUsageCacheChanges } from './lib/question-usage-cache-reconciliation'

function argument(name: string) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

async function main() {
  const apply = process.argv.includes('--apply')
  const restore = process.argv.includes('--restore')
  const journalPath = argument('--journal')
  const identityJournalPath = argument('--identity-journal')
  const backupRef = argument('--backup-ref')
  if ((apply || restore) && !journalPath) throw new Error('--journal is required for apply or restore')
  if (apply && restore) throw new Error('Apply and restore are mutually exclusive')
  if ((apply || restore) && !backupRef) throw new Error('--backup-ref is required for every usage-cache write')
  if (!apply && !restore && (!journalPath || !identityJournalPath)) throw new Error('--journal and --identity-journal are required for dry-run')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  const databaseIndex = process.argv.indexOf('--database')
  const dbName = databaseIndex < 0 ? undefined : process.argv[databaseIndex + 1]
  await mongoose.connect(process.env.MONGODB_URI, { ...(dbName ? { dbName } : {}), serverSelectionTimeoutMS: 10000 })
  try {
    const db = mongoose.connection.db!
    const EJSON = mongoose.mongo.BSON.EJSON
    if (restore || apply) {
      const saved = EJSON.parse(fs.readFileSync(journalPath!, 'utf8'))
      if (saved.database !== db.databaseName) throw new Error('Journal database does not match target')
      const backup = fs.statSync(backupRef!)
      if (!backup.isFile() || backup.size === 0) throw new Error('Backup archive is missing or empty')
      const fd = fs.openSync(`${journalPath}.progress.jsonl`, 'a', 0o600)
      try {
        const onResult = (index: number, state: string) => {
          fs.writeSync(fd, JSON.stringify({ index, state, backupRef, at: new Date().toISOString() }) + '\n')
          fs.fsyncSync(fd)
        }
        const result = restore
          ? await restoreQuestionUsageCacheChanges(db as any, saved.changes, saved.migrationId)
          : await applyQuestionUsageCacheChanges(db as any, saved.changes, saved.migrationId, onResult)
        console.log(JSON.stringify({ database: db.databaseName, mode: restore ? 'restore' : 'apply', migrationId: saved.migrationId, backupVerified: true, backupBytes: backup.size, ...result }))
      } finally { fs.closeSync(fd) }
      return
    }

    const identity = EJSON.parse(fs.readFileSync(identityJournalPath!, 'utf8'))
    if (identity.database !== db.databaseName) throw new Error('Identity journal database does not match target')
    const blocked = new Set<string>((identity.conflicts ?? []).map((conflict: any) => conflict.canonicalId).filter(Boolean))
    for (const warning of identity.warnings ?? []) {
      if (warning.reason === 'answer-key-variants') blocked.add(warning.id)
      if (warning.reason === 'legacy-id-has-multiple-content-revisions') for (const id of warning.variants ?? []) blocked.add(id)
    }
    const collections: Record<string, any[]> = {}
    collections.quizzes = await db.collection('quizzes').find({}, { projection: { _id: 1, category_id: 1, course_code: 1, status: 1, is_temp: 1, is_saved_from_explore: 1, questions: 1, question_refs: 1 } }).toArray()
    collections.questions = await db.collection('questions').find({}, { projection: { _id: 1, question_id: 1, question_id_aliases: 1, text: 1, options: 1, correct_answer: 1 } }).toArray()
    collections.questionbanks = await db.collection('questionbanks').find({}, { projection: { _id: 1, category_id: 1, question_id: 1, question_id_aliases: 1, text: 1, options: 1, correct_answer: 1, used_in_quizzes: 1, usage_count: 1, used_in_quiz_ids: 1, _question_usage_reconciliation: 1 } }).toArray()
    const plan = buildQuestionUsageCachePlan(collections, blocked)
    const summary = {
      at: new Date().toISOString(), database: db.databaseName, migrationId: randomUUID(), mode: 'dry-run',
      scannedQuizzes: plan.scannedQuizzes, scannedBankRows: plan.scannedBankRows,
      blockedCanonicalIds: plan.blockedCanonicalIds.length, plannedDocuments: plan.changes.length,
      conflictsByReason: plan.conflicts.reduce<Record<string, number>>((out, conflict) => { out[conflict.reason] = (out[conflict.reason] ?? 0) + 1; return out }, {}),
    }
    fs.writeFileSync(journalPath!, EJSON.stringify({ ...summary, blockedCanonicalIds: plan.blockedCanonicalIds, conflicts: plan.conflicts, changes: plan.changes }), { flag: 'wx', mode: 0o600 })
    console.log(JSON.stringify(summary))
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
