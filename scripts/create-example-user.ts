import { config } from 'dotenv'
import { resolve } from 'path'
import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

// Load .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not found in .env.local')
}

// Define User Schema
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'student' },
  status: { type: String, default: 'active' },
  avatar_url: { type: String, default: null },
  profile_bio: { type: String, default: null },
  ban_reason: { type: String, default: null },
  sharing_violations: { type: Number, default: 0 },
  timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
  language: { type: String, default: 'vi' },
  notify_email: { type: Boolean, default: true },
  notify_quiz_reminder: { type: Boolean, default: true },
  privacy_share_activity: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  reset_token: { type: String, default: null },
  reset_token_expires: { type: Date, default: null },
  token_version: { type: Number, default: 1 },
}, { timestamps: false })

async function createExampleUser() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')
    
    const User = mongoose.models.User || mongoose.model('User', UserSchema)
    
    const email = 'user@example.com'
    const username = 'exampleuser'
    const password = 'Student@123456' // Same as SEED_USER_PASSWORD
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    
    if (existingUser) {
      console.log('\n⚠️  User already exists:')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Username: ${existingUser.username}`)
      console.log('\n💡 Updating password...')
      
      // Hash password
      const salt = await bcrypt.genSalt(10)
      const password_hash = await bcrypt.hash(password, salt)
      
      // Update password
      await User.updateOne(
        { _id: existingUser._id },
        { password_hash }
      )
      
      console.log('✅ Password updated successfully!')
    } else {
      console.log('\n📝 Creating new user...')
      
      // Hash password
      const salt = await bcrypt.genSalt(10)
      const password_hash = await bcrypt.hash(password, salt)
      
      // Create user
      const newUser = await User.create({
        username,
        email,
        password_hash,
        role: 'student',
        status: 'active',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
        notify_email: true,
        notify_quiz_reminder: true,
        privacy_share_activity: true,
        token_version: 1,
      })
      
      console.log('✅ User created successfully!')
      console.log(`   Email: ${newUser.email}`)
      console.log(`   Username: ${newUser.username}`)
    }
    
    console.log('\n🔑 Login credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createExampleUser()
