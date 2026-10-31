import { getQuestionIdentity } from '../../packages/models/src/utils/question-identity'

type Row = Record<string, any>
export interface IdentityChange {
  collection: string
  id: unknown
  filter: Row
  set: Row
  before: Array<{ path: string; exists: boolean; value?: unknown }>
  previousMarker?: string
}
export interface IdentityConflict { collection: string; id: unknown; reason: string; canonicalId?: string }
const locations = new Map([
  ['quizzes', 'questions'], ['quizsessions', 'questions_cache'],
  ['questions', ''], ['questionbanks', ''], ['pinnedquestions', ''],
])

function validContent(question: Row) {
  return typeof question.text === 'string' && question.text.trim().length > 0 &&
    Array.isArray(question.options) && question.options.length >= 2 &&
    question.options.every((option: unknown) => typeof option === 'string' && option.trim().length > 0)
}

function duplicateAssociations(collection: string, rows: Row[]) {
  const identities = new Map<string, number>()
  if (collection !== 'questionbanks' && collection !== 'questions') return identities
  for (const row of rows) {
    if (!validContent(row)) continue
    const id = getQuestionIdentity(row as any).question_id
    const key = collection === 'questionbanks' ? `${row.category_id}:${id}` : id
    identities.set(key, (identities.get(key) ?? 0) + 1)
  }
  return identities
}

function currentIdentityOwners(collection: string, rows: Row[]) {
  const owners = new Map<string, Set<string>>()
  if (collection !== 'questionbanks' && collection !== 'questions') return owners
  for (const row of rows) {
    const key = collection === 'questionbanks' ? `${row.category_id}:${row.question_id}` : row.question_id
    const ids = owners.get(key) ?? new Set<string>()
    ids.add(String(row._id))
    owners.set(key, ids)
  }
  return owners
}

function duplicateCanonicalIds(collections: Record<string, Row[]>) {
  const duplicateIds = new Set<string>()
  for (const collection of ['questions', 'questionbanks']) {
    const counts = new Map<string, number>()
    for (const row of collections[collection] ?? []) {
      if (!validContent(row)) continue
      const id = getQuestionIdentity(row as any).question_id
      const association = collection === 'questionbanks' ? `${row.category_id}:${id}` : id
      counts.set(association, (counts.get(association) ?? 0) + 1)
    }
    for (const [association, count] of counts) {
      if (count < 2) continue
      duplicateIds.add(collection === 'questionbanks' ? association.slice(association.indexOf(':') + 1) : association)
    }
  }
  return duplicateIds
}

function namespaceCollisionIds(collections: Record<string, Row[]>) {
  const owners = new Map<string, Set<string>>()
  for (const [collection, field] of locations) {
    for (const row of collections[collection] ?? []) {
      const questions: Row[] = field ? row[field] ?? [] : [row]
      for (const question of questions) {
        if (!validContent(question)) continue
        const canonicalId = getQuestionIdentity(question as any).question_id
        const identities = owners.get(canonicalId) ?? new Set<string>()
        identities.add(canonicalId)
        owners.set(canonicalId, identities)
        for (const existingId of [question.question_id, ...(question.question_id_aliases ?? [])]) {
          if (typeof existingId !== 'string' || !existingId) continue
          const existingOwners = owners.get(existingId) ?? new Set<string>()
          existingOwners.add(canonicalId)
          owners.set(existingId, existingOwners)
        }
      }
    }
  }
  const collisions = new Set<string>()
  for (const identities of owners.values()) {
    if (identities.size < 2) continue
    for (const id of identities) collisions.add(id)
  }
  return collisions
}

function attachMetadata(change: IdentityChange, question: Row, prefix: string) {
  const identity = getQuestionIdentity(question as any)
  for (const [field, value] of Object.entries(identity)) {
    if (JSON.stringify(question[field]) === JSON.stringify(value)) continue
    const key = `${prefix}${field}`
    const exists = question[field] !== undefined
    change.before.push({ path: key, exists, ...(exists ? { value: question[field] } : {}) })
    change.filter[key] = exists ? question[field] : { $exists: false }
    change.set[key] = value
  }
  // A content edit since the dry-run invalidates the whole field-level change.
  change.filter[`${prefix}text`] = question.text
  change.filter[`${prefix}options`] = question.options
  if (question._id !== undefined) change.filter[`${prefix}_id`] = question._id
}

export function buildIdentityPlan(collections: Record<string, Row[]>, blockedIds: Iterable<string> = []) {
  const changes: IdentityChange[] = []
  const conflicts: IdentityConflict[] = []
  const namespaceCollisions = namespaceCollisionIds(collections)
  const blockedCanonicalIds = new Set([...blockedIds, ...duplicateCanonicalIds(collections), ...namespaceCollisions])
  let scanned = 0
  for (const [collection, field] of locations) {
    const rows = collections[collection] ?? []
    const duplicates = duplicateAssociations(collection, rows)
    const owners = currentIdentityOwners(collection, rows)
    for (const row of rows) {
      const change: IdentityChange = { collection, id: row._id, filter: { _id: row._id, _question_identity_migration: row._question_identity_migration ?? { $exists: false } }, set: {}, before: [], previousMarker: row._question_identity_migration }
      const questions: Row[] = field ? row[field] ?? [] : [row]
      questions.forEach((question, index) => {
        scanned++
        if (!validContent(question)) {
          conflicts.push({ collection, id: question._id ?? row._id, reason: 'missing-content-evidence' })
          return
        }
        const identity = getQuestionIdentity(question as any).question_id
        const association = collection === 'questionbanks' ? `${row.category_id}:${identity}` : identity
        const occupied = [...(owners.get(association) ?? [])].some(id => id !== String(row._id))
        if ((duplicates.get(association) ?? 0) > 1 || occupied) {
          conflicts.push({ collection, id: row._id, reason: 'duplicate-canonical-association', canonicalId: identity })
          return
        }
        if (namespaceCollisions.has(identity)) {
          conflicts.push({ collection, id: question._id ?? row._id, reason: 'legacy-id-namespace-collision', canonicalId: identity })
          return
        }
        if (blockedCanonicalIds.has(identity)) {
          conflicts.push({ collection, id: question._id ?? row._id, reason: 'ambiguous-canonical-identity', canonicalId: identity })
          return
        }
        attachMetadata(change, question, field ? `${field}.${index}.` : '')
      })
      if (Object.keys(change.set).length) changes.push(change)
    }
  }
  return { scanned, changes, conflicts, blockedCanonicalIds: [...blockedCanonicalIds].sort() }
}

interface MigrationDatabase { collection(name: string): {
  updateOne(filter: Row, update: Row): Promise<{ matchedCount: number }>
  findOne?(filter: Row): Promise<unknown>
} }

export async function applyIdentityChanges(db: MigrationDatabase, changes: IdentityChange[], migrationId: string, onResult?: (index: number, state: string) => void) {
  let applied = 0
  for (const [index, change] of changes.entries()) {
    const marker = `${migrationId}:${index}`
    const collection = db.collection(change.collection)
    onResult?.(index, 'started')
    const result = await collection.updateOne(change.filter, { $set: { ...change.set, _question_identity_migration: marker } })
    const resumed = result.matchedCount === 0 && collection.findOne
      ? await collection.findOne({ ...change.filter, ...change.set, _question_identity_migration: marker }) : null
    const matched = result.matchedCount > 0 || Boolean(resumed)
    if (matched) applied++
    onResult?.(index, matched ? 'applied' : 'skipped')
  }
  return { applied, skipped: changes.length - applied }
}

export async function restoreIdentityChanges(db: MigrationDatabase, changes: IdentityChange[], migrationId: string) {
  let applied = 0
  for (const [index, change] of [...changes.entries()].reverse()) {
    const set: Row = {}, unset: Row = {}
    for (const field of change.before) {
      if (field.exists) set[field.path] = field.value
      else unset[field.path] = ''
    }
    if (change.previousMarker !== undefined) set._question_identity_migration = change.previousMarker
    else unset._question_identity_migration = ''
    const update = { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }
    const result = await db.collection(change.collection).updateOne({ ...change.filter, ...change.set, _question_identity_migration: `${migrationId}:${index}` }, update)
    applied += result.matchedCount
  }
  return { applied, skipped: changes.length - applied }
}
