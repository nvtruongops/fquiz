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

    console.log('Auditing username_lower collisions...')
    const collisions = await db.collection('users').aggregate([
      {
        $group: {
          _id: { $toLower: '$username' },
          n: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          n: { $gt: 1 }
        }
      }
    ]).toArray()

    if (collisions.length > 0) {
      console.warn('CRITICAL WARNING: Found duplicate lowercase usernames!')
      console.warn(JSON.stringify(collisions, null, 2))
      console.warn('You must resolve these collisions before creating the unique index!')
      process.exit(1)
    } else {
      console.log('No username collisions found. Safe to proceed.')
    }
  } catch (error) {
    console.error('Audit failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected.')
  }
}

run()
