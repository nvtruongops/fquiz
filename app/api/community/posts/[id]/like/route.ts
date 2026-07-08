import { NextResponse } from 'next/server'
import { validatePostRequest } from '@/lib/modules/community/utils'
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
