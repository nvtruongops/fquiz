import fs from 'node:fs'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { auditQuestionEvidence } from './lib/question-evidence-audit'
import { buildIdentityPlan, applyIdentityChanges, restoreIdentityChanges } from './lib/question-identity-migration'

async function main() {
  const apply = process.argv.includes('--apply')
  const restore = process.argv.includes('--restore')
  const journalIndex = process.argv.indexOf('--journal')
  const journal = journalIndex < 0 ? undefined : process.argv[journalIndex + 1]
  if ((apply || restore) && !journal) throw new Error('--journal is required for apply or restore')
  if (apply && restore) throw new Error('Apply and restore are mutually exclusive')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  const databaseIndex = process.argv.indexOf('--database')
  const dbName = databaseIndex < 0 ? undefined : process.argv[databaseIndex + 1]
  await mongoose.connect(process.env.MONGODB_URI, { ...(dbName ? { dbName } : {}), serverSelectionTimeoutMS: 10000 })
  try {
    const db = mongoose.connection.db!
    const EJSON = mongoose.mongo.BSON.EJSON
    if (restore || apply) {
      const saved = EJSON.parse(fs.readFileSync(journal!, 'utf8'))
      if (saved.database !== db.databaseName) throw new Error('Journal database does not match target')
      if (!saved.migrationId) throw new Error('Journal must have an owned migrationId; regenerate the dry-run with the current tool')
      const fd = fs.openSync(`${journal}.progress.jsonl`, 'a', 0o600)
      try {
        const onResult = (index: number, state: string) => {
          fs.writeSync(fd, JSON.stringify({ index, state, at: new Date().toISOString() }) + '\n')
          fs.fsyncSync(fd)
        }
        const result = restore
          ? await restoreIdentityChanges(db as any, saved.changes, saved.migrationId)
          : await applyIdentityChanges(db as any, saved.changes, saved.migrationId, onResult)
        console.log(JSON.stringify({ database: db.databaseName, mode: restore ? 'restore' : 'apply', migrationId: saved.migrationId, ...result }))
      } finally { fs.closeSync(fd) }
      return
    }
    const collections: Record<string, any[]> = {}
    for (const name of ['quizzes', 'questions', 'questionbanks', 'pinnedquestions', 'quizsessions']) {
      const projection = name === 'quizsessions' ? { _id: 1, questions_cache: 1, _question_identity_migration: 1 } : name === 'quizzes' ? { _id: 1, questions: 1, question_refs: 1, category_id: 1, course_code: 1, status: 1, is_temp: 1, is_saved_from_explore: 1, _question_identity_migration: 1 } : { _id: 1, question_id: 1, question_id_aliases: 1, text: 1, options: 1, correct_answer: 1, category_id: 1, created_by: 1, student_id: 1, used_in_quizzes: 1, usage_count: 1, _question_identity_migration: 1 }
      collections[name] = await db.collection(name).find({}, { projection }).toArray()
    }
    const warnings = auditQuestionEvidence(collections)
    const blockedIds = warnings.flatMap(warning => {
      if (warning.reason === 'answer-key-variants') return [warning.id]
      if (warning.reason === 'legacy-id-has-multiple-content-revisions') return warning.variants ?? []
      return []
    })
    const plan = buildIdentityPlan(collections, blockedIds)
    const summary = { at: new Date().toISOString(), database: db.databaseName, migrationId: randomUUID(), mode: 'dry-run', scanned: plan.scanned, plannedDocuments: plan.changes.length,
      blockedCanonicalIds: plan.blockedCanonicalIds.length,
      conflictCount: plan.conflicts.length, conflictsByReason: plan.conflicts.reduce<Record<string, number>>((out, c) => { out[c.reason] = (out[c.reason] ?? 0) + 1; return out }, {}),
      warningsByReason: warnings.reduce<Record<string, number>>((out, w) => { out[w.reason] = (out[w.reason] ?? 0) + 1; return out }, {}) }
    // Before-images are durably saved before the first mutation; never overwrite a prior journal.
    if (journal) fs.writeFileSync(journal, EJSON.stringify({ ...summary, changes: plan.changes, conflicts: plan.conflicts, warnings }), { flag: 'wx', mode: 0o600 })
    console.log(JSON.stringify(summary))
  } finally {
    await mongoose.disconnect()
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
