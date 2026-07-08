import { NextResponse } from 'next/server'
import { validatePostRequest } from '@/lib/modules/community/utils'
import mongoose from 'mongoose'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

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
      content,
      createdAt: new Date()
    }

    post.comments.push(newComment as any)
    await post.save()

    return NextResponse.json({ comment: post.comments[post.comments.length - 1] }, { status: 201 })
  } catch (error: any) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
