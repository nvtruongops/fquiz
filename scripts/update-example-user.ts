import { config } from 'dotenv'
import { resolve } from 'path'
import mongoose, { Schema } from 'mongoose'

// Load .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!

// Define User Schema
const UserSchema = new Schema({
  username: String,
  email: String,
  password_hash: String,
  role: String,
  status: String,
}, { timestamps: false })

async function updateExampleUser() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')
    
    const User = mongoose.models.User || mongoose.model('User', UserSchema)
    
    const email = 'user@example.com'
    const newUsername = 'student' // Giống SEED_USER_USERNAME
    
    // Check if username 'student' already exists
    const existingStudent = await User.findOne({ username: newUsername, email: { $ne: email } })
    
    if (existingStudent) {
      console.log('⚠️  Username "student" đã tồn tại với email:', existingStudent.email)
      console.log('💡 Sử dụng username "examplestudent" thay thế...\n')
      
      const result = await User.updateOne(
        { email },
        { $set: { username: 'examplestudent' } }
      )
      
      if (result.modifiedCount > 0) {
        console.log('✅ Updated username to: examplestudent')
      }
    } else {
      const result = await User.updateOne(
        { email },
        { $set: { username: newUsername } }
      )
      
      if (result.modifiedCount > 0) {
        console.log('✅ Updated username to: student')
      } else {
        console.log('⚠️  No changes made (user might not exist or already has this username)')
      }
    }
    
    // Show updated user
    const user = await User.findOne({ email }).lean()
    if (user) {
      console.log('\n👤 Updated user:')
      console.log(`   Email: ${user.email}`)
      console.log(`   Username: ${user.username}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Status: ${user.status}`)
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

updateExampleUser()
