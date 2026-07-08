import { NextResponse } from 'next/server'
import { validatePostRequest } from '@/lib/modules/community/utils'
import mongoose from 'mongoose'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { Post } from '@/lib/modules/community/models/Post'

const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const validation = await validatePostRequest(id)
    if (!validation.isValid) return validation.response

    const { post, session } = validation

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = CreateCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues.map(issue => issue.message)
      }, { status: 400 })
    }

    const { content } = parsed.data
    const cleanContent = DOMPurify.sanitize(content)

    const newComment = {
      authorId: new mongoose.Types.ObjectId(session.userId),
      authorName: session.username,
      content: cleanContent,
      createdAt: new Date()
    }

    // Use atomic $push to prevent race conditions
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $push: { comments: newComment } },
      { new: true }
    )

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const savedComment = updatedPost.comments[updatedPost.comments.length - 1]
    return NextResponse.json({ comment: savedComment }, { status: 201 })
  } catch (error: any) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
