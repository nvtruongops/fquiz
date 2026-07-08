import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function run() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected.')

    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not established')
    }

    console.log('Dropping index started_at_1 on quizsessions collection...')
    try {
      await db.collection('quizsessions').dropIndex('started_at_1')
      console.log('Successfully dropped index started_at_1.')
    } catch (e: any) {
      if (e.codeName === 'IndexNotFound' || e.message?.includes('index not found')) {
        console.log('Index started_at_1 not found, skipping drop.')
      } else {
        throw e
      }
    }

    console.log('Creating partial index started_at_1 on quizsessions collection...')
    await db.collection('quizsessions').createIndex(
      { started_at: 1 },
      {
        expireAfterSeconds: 604800,
        partialFilterExpression: { status: { $in: ['preparing', 'active', 'paused'] } }
      }
    )
    console.log('Successfully created partial index started_at_1.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected.')
  }
}

run()
