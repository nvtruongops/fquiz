import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'

export async function validatePostRequest(id: string): Promise<
  | { isValid: true; post: any; session: any; response?: undefined }
  | { isValid: false; post?: undefined; session?: undefined; response: NextResponse }
> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Invalid post id' }, { status: 400 }),
    }
  }

  const session = await verifySession()
  if (!session?.userId) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  await connectDB()

  const post = await Post.findById(id)
  if (!post) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Post not found' }, { status: 404 }),
    }
  }

  return { isValid: true, post, session }
}
