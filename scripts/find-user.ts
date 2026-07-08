import { config } from 'dotenv'
import { resolve } from 'path'
import mongoose, { Schema } from 'mongoose'

// Load .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not found in .env.local')
}

// Define User Schema
const UserSchema = new Schema({
  username: String,
  email: String,
  password_hash: String,
  role: String,
  status: String,
  created_at: Date,
}, { timestamps: false })

async function findUser() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')
    
    const User = mongoose.models.User || mongoose.model('User', UserSchema)
    
    const email = 'user@example.com'
    const user = await User.findOne({ email }).select('email username password_hash role status').lean()
    
    if (user) {
      console.log('\n✅ User found:')
      console.log(JSON.stringify(user, null, 2))
    } else {
      console.log('\n❌ User not found with email:', email)
      
      // Tìm tất cả users để xem có user nào
      const allUsers = await User.find({}).select('email username role status').limit(10).lean()
      console.log('\n📋 Available users (first 10):')
      allUsers.forEach((u: any) => {
        console.log(`  - ${u.email} (${u.username}) - ${u.role} [${u.status}]`)
      })
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

findUser()
