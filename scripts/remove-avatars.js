/**
 * Script to remove avatar URLs from all users
 * Run with: node scripts/remove-avatars.js
 */

const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

async function removeAvatars() {
  try {
    // Load environment variables
    loadEnv()

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables')
      console.error('Please set MONGODB_URI in .env.local file')
      process.exit(1)
    }

    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))

    // Count users with avatars
    const usersWithAvatars = await User.countDocuments({
      $or: [
        { avatar_url: { $exists: true, $ne: null, $ne: '' } },
        { avatarUrl: { $exists: true, $ne: null, $ne: '' } }
      ]
    })

    console.log(`📊 Found ${usersWithAvatars} users with avatar URLs`)

    if (usersWithAvatars === 0) {
      console.log('✅ No avatars to remove')
      await mongoose.disconnect()
      return
    }

    // Ask for confirmation
    console.log('\n⚠️  This will remove all avatar URLs from users')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Remove avatar fields
    const result = await User.updateMany(
      {},
      { 
        $unset: { 
          avatar_url: '',
          avatarUrl: '' 
        } 
      }
    )

    console.log(`✅ Updated ${result.modifiedCount} users`)
    console.log('✅ All avatar URLs have been removed')

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
removeAvatars()
