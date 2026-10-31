import fs from 'node:fs'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { buildQuestionAssociationMergePlan } from './lib/question-association-merge'

type Row = Record<string, any>
const archiveCollection = 'question_association_merge_archives'

function argument(name: string) {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function stable(value: any): any {
  if (value === undefined) return { $undefined: true }
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Buffer.isBuffer(value)) return { $binary: value.toString('base64') }
  if (typeof value.toHexString === 'function') return { $oid: value.toHexString() }
  if (Array.isArray(value)) return value.map(stable)
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right))
}

function fieldFilter(document: Row, fields: string[]) {
  const filter: Row = { _id: document._id }
  for (const field of fields) filter[field] = Object.prototype.hasOwnProperty.call(document, field) ? document[field] : { $exists: false }
  return filter
}

function survivorFields(group: Row) {
  return Object.keys(group.survivorAfter)
}

async function readCollections(db: mongoose.mongo.Db) {
  const [questions, questionbanks, quizzes, quizsessions] = await Promise.all([
    db.collection('questions').find({}).toArray(),
    db.collection('questionbanks').find({}).toArray(),
    db.collection('quizzes').find({}, { projection: { _id: 1, question_refs: 1 } }).toArray(),
    db.collection('quizsessions').find({}, { projection: { _id: 1, question_ids: 1 } }).toArray(),
  ])
  return { questions, questionbanks, quizzes, quizsessions }
}

function archiveId(migrationId: string, collection: string, id: unknown) {
  return `${migrationId}:${collection}:${String(id)}`
}

async function ensureArchived(db: mongoose.mongo.Db, migrationId: string, collection: string, document: Row, at: string) {
  const _id = archiveId(migrationId, collection, document._id)
  const archives = db.collection(archiveCollection) as any
  const existing = await archives.findOne({ _id })
  if (existing) {
    if (existing.migrationId !== migrationId || existing.sourceCollection !== collection || !same(existing.sourceDocument, document)) {
      throw new Error(`Archive collision for ${collection}/${String(document._id)}`)
    }
    return false
  }
  await archives.insertOne({ _id, migrationId, sourceCollection: collection, sourceId: document._id, archivedAt: at, sourceDocument: document })
  return true
}

async function archiveMatches(db: mongoose.mongo.Db, migrationId: string, collection: string, document: Row) {
  const entry = await (db.collection(archiveCollection) as any).findOne({ _id: archiveId(migrationId, collection, document._id) })
  return Boolean(entry && entry.migrationId === migrationId && entry.sourceCollection === collection && same(entry.sourceDocument, document))
}

async function applyReferenceChange(db: mongoose.mongo.Db, change: Row) {
  const collection = db.collection(change.collection)
  const current = await collection.findOne({ _id: change.documentId })
  const field = change.collection === 'quizzes' ? 'question_refs' : 'question_ids'
  const value = current?.[field] ?? []
  if (same(value, change.after)) return 'already-applied'
  if (!same(value, change.before)) throw new Error(`Reference CAS conflict in ${change.collection}/${String(change.documentId)}`)
  const result = await collection.updateOne({ _id: change.documentId, [field]: change.before }, { $set: { [field]: change.after } })
  if (result.modifiedCount !== 1) {
    const after = await collection.findOne({ _id: change.documentId })
    if (!same(after?.[field] ?? [], change.after)) throw new Error(`Reference CAS failed in ${change.collection}/${String(change.documentId)}`)
    return 'already-applied'
  }
  return 'applied'
}

async function applySurvivor(db: mongoose.mongo.Db, group: Row) {
  const collection = db.collection(group.collection)
  const current = await collection.findOne({ _id: group.survivorId })
  if (!current) throw new Error(`Missing survivor ${group.collection}/${String(group.survivorId)}`)
  const fields = survivorFields(group)
  const contentFields = ['text', 'options', 'correct_answer', 'explanation', 'image_url', 'category_id', 'created_by', 'updated_at']
  const contentMatches = contentFields.every(field => same(current[field], group.survivorBefore[field]))
  if (!contentMatches) throw new Error(`Survivor content changed in ${group.collection}/${String(group.survivorId)}`)
  if (fields.every(field => same(current[field], group.survivorAfter[field]))) return 'already-applied'
  if (!fields.every(field => same(current[field], group.survivorBefore[field]))) {
    throw new Error(`Survivor CAS conflict in ${group.collection}/${String(group.survivorId)}`)
  }
  const filter = fieldFilter(group.survivorBefore, [...new Set([...fields, 'text', 'options', 'correct_answer', 'category_id', 'created_by', 'updated_at'])])
  const result = await collection.updateOne(filter, { $set: group.survivorAfter })
  if (result.modifiedCount !== 1) {
    const after = await collection.findOne({ _id: group.survivorId })
    if (!fields.every(field => same(after?.[field], group.survivorAfter[field]))) throw new Error(`Survivor CAS failed in ${group.collection}/${String(group.survivorId)}`)
    return 'already-applied'
  }
  return 'applied'
}

async function restoreSurvivor(db: mongoose.mongo.Db, group: Row) {
  const collection = db.collection(group.collection)
  const current = await collection.findOne({ _id: group.survivorId })
  if (!current) throw new Error(`Missing survivor during restore ${group.collection}/${String(group.survivorId)}`)
  const fields = survivorFields(group)
  const contentFields = ['text', 'options', 'correct_answer', 'explanation', 'image_url', 'category_id', 'created_by', 'updated_at']
  if (!contentFields.every(field => same(current[field], group.survivorBefore[field]))) throw new Error(`Survivor content changed during restore in ${group.collection}/${String(group.survivorId)}`)
  if (fields.every(field => same(current[field], group.survivorBefore[field]))) return 'already-restored'
  if (!fields.every(field => same(current[field], group.survivorAfter[field]))) throw new Error(`Survivor restore conflict in ${group.collection}/${String(group.survivorId)}`)
  const set: Row = {}, unset: Row = {}
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(group.survivorBefore, field)) set[field] = group.survivorBefore[field]
    else unset[field] = ''
  }
  const update = { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }
  const filter = fieldFilter(group.survivorAfter, [...new Set([...fields, 'text', 'options', 'correct_answer', 'category_id', 'created_by', 'updated_at'])])
  const result = await collection.updateOne(filter, update)
  if (result.modifiedCount !== 1) throw new Error(`Survivor restore CAS failed in ${group.collection}/${String(group.survivorId)}`)
  return 'restored'
}

async function ensureDuplicatePresent(db: mongoose.mongo.Db, migrationId: string, group: Row, duplicate: Row) {
  const collection = db.collection(group.collection)
  const current = await collection.findOne({ _id: duplicate._id })
  if (current) {
    if (!same(current, duplicate)) throw new Error(`Duplicate restore conflict in ${group.collection}/${String(duplicate._id)}`)
    return 'already-restored'
  }
  const archived = await archiveMatches(db, migrationId, group.collection, duplicate)
  if (!archived) throw new Error(`Missing verified archive for ${group.collection}/${String(duplicate._id)}`)
  await collection.insertOne(duplicate)
  return 'restored'
}

async function deleteDuplicate(db: mongoose.mongo.Db, migrationId: string, group: Row, duplicate: Row) {
  const collection = db.collection(group.collection)
  const current = await collection.findOne({ _id: duplicate._id })
  if (!current) {
    if (await archiveMatches(db, migrationId, group.collection, duplicate)) return 'already-deleted'
    throw new Error(`Missing duplicate without verified archive: ${group.collection}/${String(duplicate._id)}`)
  }
  if (!same(current, duplicate)) throw new Error(`Duplicate CAS conflict in ${group.collection}/${String(duplicate._id)}`)
  const inboundQuizRefs = group.collection === 'questions'
    ? await db.collection('quizzes').countDocuments({ question_refs: duplicate._id })
    : 0
  const inboundSessionRefs = group.collection === 'questions'
    ? await db.collection('quizsessions').countDocuments({ question_ids: duplicate._id })
    : 0
  if (inboundQuizRefs || inboundSessionRefs) throw new Error(`Cannot delete referenced question ${String(duplicate._id)} (${inboundQuizRefs} quiz / ${inboundSessionRefs} session references remain)`)
  const result = await collection.deleteOne(fieldFilter(duplicate, Object.keys(duplicate).filter(field => field !== '_id')))
  if (result.deletedCount !== 1) throw new Error(`Duplicate delete CAS failed in ${group.collection}/${String(duplicate._id)}`)
  return 'deleted'
}

async function restoreReferenceChange(db: mongoose.mongo.Db, change: Row) {
  const collection = db.collection(change.collection)
  const current = await collection.findOne({ _id: change.documentId })
  const field = change.collection === 'quizzes' ? 'question_refs' : 'question_ids'
  const value = current?.[field] ?? []
  if (same(value, change.before)) return 'already-restored'
  if (!same(value, change.after)) throw new Error(`Reference restore conflict in ${change.collection}/${String(change.documentId)}`)
  const result = await collection.updateOne({ _id: change.documentId, [field]: change.after }, { $set: { [field]: change.before } })
  if (result.modifiedCount !== 1) throw new Error(`Reference restore CAS failed in ${change.collection}/${String(change.documentId)}`)
  return 'restored'
}

async function main() {
  const apply = process.argv.includes('--apply')
  const restore = process.argv.includes('--restore')
  const journalPath = argument('--journal')
  const backupRef = argument('--backup-ref')
  if (apply && restore) throw new Error('--apply and --restore are mutually exclusive')
  if ((apply || restore) && (!journalPath || !backupRef)) throw new Error('--journal and --backup-ref are required for apply or restore')
  if (!apply && !restore && !journalPath) throw new Error('--journal is required for dry-run')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  const databaseIndex = process.argv.indexOf('--database')
  const dbName = databaseIndex < 0 ? undefined : process.argv[databaseIndex + 1]
  await mongoose.connect(process.env.MONGODB_URI, { ...(dbName ? { dbName } : {}), serverSelectionTimeoutMS: 10000 })
  try {
    const db = mongoose.connection.db!
    const EJSON = mongoose.mongo.BSON.EJSON
    if (apply || restore) {
      const journal = EJSON.parse(fs.readFileSync(journalPath!, 'utf8'))
      if (journal.kind !== 'question-association-merge' || journal.database !== db.databaseName) throw new Error('Journal kind or database does not match the target')
      if (journal.blocked?.length) throw new Error('Journal contains blocked groups; do not apply a partial merge')
      const stat = fs.statSync(backupRef!)
      if (!stat.isFile() || stat.size === 0) throw new Error('Backup archive is missing or empty')
      const progressPath = `${journalPath}.progress.jsonl`
      const fd = fs.openSync(progressPath, 'a', 0o600)
      const record = (event: string, detail: Row = {}) => { fs.writeSync(fd, JSON.stringify({ at: new Date().toISOString(), event, ...detail }) + '\n'); fs.fsyncSync(fd) }
      try {
        if (restore) {
          let restored = 0
          for (const group of [...journal.groups].reverse()) {
            for (const duplicate of group.duplicates) { await ensureDuplicatePresent(db, journal.migrationId, group, duplicate); restored++ }
            await restoreSurvivor(db, group)
          }
          for (const change of [...journal.references].reverse()) { await restoreReferenceChange(db, change); restored++ }
          console.log(JSON.stringify({ database: db.databaseName, mode: 'restore', migrationId: journal.migrationId, restored, archivesRetained: true }))
          return
        }
        const at = journal.at
        for (const group of journal.groups) for (const duplicate of group.duplicates) {
          await ensureArchived(db, journal.migrationId, group.collection, duplicate, at)
          record('archived', { collection: group.collection, id: String(duplicate._id) })
        }
        let referencesApplied = 0
        for (const change of journal.references) {
          await applyReferenceChange(db, change)
          referencesApplied++
          record('reference-updated', { collection: change.collection, id: String(change.documentId) })
        }
        let survivorsApplied = 0
        for (const group of journal.groups) {
          await applySurvivor(db, group)
          survivorsApplied++
          record('survivor-updated', { collection: group.collection, id: String(group.survivorId) })
        }
        let deleted = 0
        for (const group of journal.groups) for (const duplicate of group.duplicates) {
          await deleteDuplicate(db, journal.migrationId, group, duplicate)
          deleted++
          record('duplicate-deleted', { collection: group.collection, id: String(duplicate._id) })
        }
        console.log(JSON.stringify({ database: db.databaseName, mode: 'apply', migrationId: journal.migrationId, groups: journal.groups.length, referencesApplied, survivorsApplied, duplicatesArchived: journal.groups.reduce((count: number, group: Row) => count + group.duplicates.length, 0), duplicatesDeleted: deleted, backupRef, backupBytes: stat.size }))
      } finally { fs.closeSync(fd) }
      return
    }

    const collections = await readCollections(db)
    const plan = buildQuestionAssociationMergePlan(collections)
    const summary = {
      at: new Date().toISOString(), database: db.databaseName, migrationId: randomUUID(), mode: 'dry-run',
      duplicateGroups: plan.groups.length,
      duplicateDocuments: plan.groups.reduce((count, group) => count + group.duplicates.length, 0),
      groupsByCollection: plan.groups.reduce<Record<string, number>>((out, group) => { out[group.collection] = (out[group.collection] ?? 0) + 1; return out }, {}),
      duplicatesByCollection: plan.groups.reduce<Record<string, number>>((out, group) => { out[group.collection] = (out[group.collection] ?? 0) + group.duplicates.length; return out }, {}),
      referenceDocuments: plan.references.length,
      blockedGroups: plan.blocked.length,
      blockedByReason: plan.blocked.reduce<Record<string, number>>((out, group) => { out[group.reason] = (out[group.reason] ?? 0) + 1; return out }, {}),
    }
    fs.writeFileSync(journalPath!, EJSON.stringify({ kind: 'question-association-merge', ...summary, groups: plan.groups, blocked: plan.blocked, references: plan.references }, { relaxed: false }), { flag: 'wx', mode: 0o600 })
    console.log(JSON.stringify(summary))
  } finally { await mongoose.disconnect() }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
