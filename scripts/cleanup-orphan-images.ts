/**
 * Cleanup orphaned Cloudinary images
 * Finds images in Cloudinary that are no longer referenced by any quiz question
 * 
 * Usage: npm run cleanup:images
 * Add --apply flag to actually delete: npm run cleanup:images -- --apply
 */

import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const APPLY = process.argv.includes('--apply')
const FOLDER = 'fquiz/quizzes'

async function getAllCloudinaryImages(): Promise<Array<{ public_id: string; url: string; bytes: number; created_at: string }>> {
  const results: Array<{ public_id: string; url: string; bytes: number; created_at: string }> = []
  let nextCursor: string | undefined

  do {
    const res: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: FOLDER,
      max_results: 500,
      next_cursor: nextCursor,
    })
    for (const r of res.resources) {
      results.push({
        public_id: r.public_id,
        url: r.secure_url,
        bytes: r.bytes,
        created_at: r.created_at,
      })
    }
    nextCursor = res.next_cursor
  } while (nextCursor)

  return results
}

async function getAllReferencedImageUrls(): Promise<Set<string>> {
  const quizzes = await Quiz.find({}, { 'questions.image_url': 1 }).lean()
  const urls = new Set<string>()

  for (const quiz of quizzes as any[]) {
    for (const q of quiz.questions ?? []) {
      if (q.image_url && q.image_url.includes('res.cloudinary.com')) {
        urls.add(q.image_url)
      }
    }
  }

  return urls
}

function extractPublicIdFromUrl(url: string): string | null {
  // e.g. https://res.cloudinary.com/cloud/image/upload/v123/fquiz/quizzes/id/q_0_123.webp
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/)
  return match ? match[1] : null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

async function main() {
  console.log(`🔍 Cloudinary Orphan Image Cleanup`)
  console.log(`Mode: ${APPLY ? '🗑️  APPLY (will delete)' : '👀 DRY RUN (no deletion)'}`)
  console.log(`Folder: ${FOLDER}\n`)

  await connectDB()

  console.log('📦 Fetching all Cloudinary images...')
  const cloudinaryImages = await getAllCloudinaryImages()
  console.log(`   Found ${cloudinaryImages.length} images in Cloudinary\n`)

  console.log('🗄️  Fetching all referenced image URLs from MongoDB...')
  const referencedUrls = await getAllReferencedImageUrls()
  console.log(`   Found ${referencedUrls.size} referenced images in quizzes\n`)

  // Find orphans: in Cloudinary but not referenced by any quiz
  const orphans = cloudinaryImages.filter(img => {
    // Check if this cloudinary image URL is referenced
    const isReferenced = Array.from(referencedUrls).some(refUrl => {
      const refPublicId = extractPublicIdFromUrl(refUrl)
      return refPublicId === img.public_id || refUrl.includes(img.public_id)
    })
    return !isReferenced
  })

  const totalOrphanBytes = orphans.reduce((sum, img) => sum + img.bytes, 0)

  console.log(`📊 Results:`)
  console.log(`   Total Cloudinary images: ${cloudinaryImages.length}`)
  console.log(`   Referenced images:       ${referencedUrls.size}`)
  console.log(`   Orphaned images:         ${orphans.length}`)
  console.log(`   Wasted storage:          ${formatBytes(totalOrphanBytes)}\n`)

  if (orphans.length === 0) {
    console.log('✅ No orphaned images found!')
    await mongoose.disconnect()
    return
  }

  console.log('🗑️  Orphaned images:')
  for (const img of orphans) {
    console.log(`   - ${img.public_id}`)
    console.log(`     Size: ${formatBytes(img.bytes)} | Created: ${img.created_at}`)
  }

  if (!APPLY) {
    console.log(`\n⚠️  DRY RUN - No images deleted.`)
    console.log(`   Run with --apply to delete ${orphans.length} orphaned images (${formatBytes(totalOrphanBytes)})`)
    await mongoose.disconnect()
    return
  }

  // Delete orphans
  console.log(`\n🗑️  Deleting ${orphans.length} orphaned images...`)
  let deleted = 0
  let failed = 0

  for (const img of orphans) {
    try {
      await cloudinary.uploader.destroy(img.public_id)
      console.log(`   ✅ Deleted: ${img.public_id}`)
      deleted++
    } catch (err) {
      console.log(`   ❌ Failed: ${img.public_id} - ${(err as Error).message}`)
      failed++
    }
  }

  console.log(`\n✅ Done! Deleted: ${deleted}, Failed: ${failed}`)
  console.log(`   Freed: ${formatBytes(totalOrphanBytes)}`)

  await mongoose.disconnect()
}

main().catch(console.error)
