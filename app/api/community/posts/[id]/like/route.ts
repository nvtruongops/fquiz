import { NextResponse } from 'next/server'
import { validatePostRequest } from '@/lib/modules/community/utils'
import { Post } from '@/lib/modules/community/models/Post'
import mongoose from 'mongoose'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validatePostRequest(id)
    if (!validation.isValid) return validation.response

    const { post, session } = validation

    const userIdObj = new mongoose.Types.ObjectId(session.userId)

    // Use atomic $addToSet / $pull to prevent race conditions
    // First try to remove (unlike)
    const unliked = await Post.findByIdAndUpdate(
      id,
      { $pull: { likes: userIdObj } },
      { new: true }
    )

    if (!unliked) {
      // If we get here, the post was already deleted concurrently
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const wasRemoved = unliked.likes.length < (post.likes?.length || 0)

    if (wasRemoved) {
      // Successfully unliked
      return NextResponse.json({
        liked: false,
        likesCount: unliked.likes.length
      })
    }

    // User hadn't liked → add like
    const liked = await Post.findByIdAndUpdate(
      id,
      { $addToSet: { likes: userIdObj } },
      { new: true }
    )

    return NextResponse.json({
      liked: true,
      likesCount: liked?.likes?.length ?? (post.likes?.length || 0) + 1
    })
  } catch (error: any) {
    console.error('Toggle like error:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
