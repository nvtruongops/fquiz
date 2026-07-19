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

    // Only count view if the viewer is NOT the author of the post
    if (post.authorId.toString() === session.userId) {
      return NextResponse.json({
        viewsCount: post.views?.length || 0,
        message: 'Author view not counted'
      })
    }

    const userIdObj = new mongoose.Types.ObjectId(session.userId)

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $addToSet: { views: userIdObj } },
      { new: true }
    )

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      viewsCount: updatedPost.views?.length ?? 0
    })
  } catch (error: any) {
    console.error('Record post view error:', error)
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
  }
}
