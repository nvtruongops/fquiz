/**
 * One-time migration:
 * Remove expires_at from completed quiz sessions so TTL no longer deletes history/results.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-preserve-completed-session-results.ts
 *   npx tsx --env-file=.env.local scripts/migrate-preserve-completed-session-results.ts --dry-run
 */
import mongoose from 'mongoose'
import { QuizSession } from '../lib/modules/quiz/models/QuizSession'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')
  const isDryRun = process.argv.includes('--dry-run')

  const targetFilter = {
    status: 'completed',
    expires_at: { $exists: true },
  } as const

  const beforeCount = await QuizSession.countDocuments(targetFilter)
  const result = isDryRun
    ? { matchedCount: beforeCount, modifiedCount: 0 }
    : await QuizSession.updateMany(targetFilter, { $unset: { expires_at: 1 } })
  const afterCount = await QuizSession.countDocuments(targetFilter)

  console.log(`Migration: preserve completed session results${isDryRun ? ' (dry run)' : ''}`)
  console.log(`- Matched: ${result.matchedCount}`)
  console.log(`- Modified: ${result.modifiedCount}`)
  console.log(`- Remaining completed docs with expires_at: ${afterCount}`)
  console.log(`- Before count: ${beforeCount}`)

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Migration failed:', error)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
