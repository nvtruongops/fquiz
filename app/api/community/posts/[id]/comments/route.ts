import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    await connectDB()

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

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
