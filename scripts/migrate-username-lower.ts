import mongoose from 'mongoose'
import { User } from '../lib/modules/auth/models/User'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function run() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected.')

    console.log('Migrating existing users to populate username_lower...')
    const result = await User.collection.updateMany({}, [
      { $set: { username_lower: { $toLower: '$username' } } }
    ])
    console.log(`Successfully migrated users. Modified: ${result.modifiedCount}`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected.')
  }
}

run()
