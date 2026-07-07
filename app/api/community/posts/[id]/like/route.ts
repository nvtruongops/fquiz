import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'
import mongoose from 'mongoose'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const userIdStr = session.userId.toString()
    const likeIndex = post.likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userIdStr)

    if (likeIndex === -1) {
      // Like
      post.likes.push(new mongoose.Types.ObjectId(session.userId))
    } else {
      // Unlike
      post.likes.splice(likeIndex, 1)
    }

    await post.save()

    return NextResponse.json({ 
      liked: likeIndex === -1,
      likesCount: post.likes.length 
    })
  } catch (error: any) {
    console.error('Toggle like error:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
