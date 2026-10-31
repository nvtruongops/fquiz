import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizComment } from '@/lib/modules/quiz/models/QuizComment'
import { User } from '@/lib/modules/auth/models/User'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Types } from 'mongoose'
import { findStudentAccessibleQuiz } from '@/lib/modules/quiz/utils/student-quiz-access'

export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    await connectDB()
    const { id } = await params
    
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const quiz = await findStudentAccessibleQuiz(id, payload.userId)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const comments = await QuizComment.find({ quiz_id: new Types.ObjectId(id) })
      .sort({ created_at: -1 })
      .lean() as any[]
    
    const userIds = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean)))
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('username avatar_url').lean() as any[]
      : []
    const userMap = new Map(users.map((u) => [u._id.toString(), { _id: u._id, username: u.username, avatar_url: u.avatar_url }]))

    const populatedComments = comments.map((c) => ({
      ...c,
      user_id: userMap.get(c.user_id?.toString()) ?? null,
    }))
    
    return NextResponse.json(populatedComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student', 'teacher'] })

export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    await connectDB()

    const { id } = await params
    
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const quiz = await findStudentAccessibleQuiz(id, payload.userId)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const body = await req.json()
    let { content } = body
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 })
    }
    
    // Sanitization: Multi-pass HTML tag stripping & entity escaping to neutralize XSS
    let sanitizedContent = String(content)
    let previousContent = ''
    while (previousContent !== sanitizedContent) {
      previousContent = sanitizedContent
      sanitizedContent = sanitizedContent.replace(/<[^>]*>/g, '')
    }
    content = sanitizedContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim()
    
    if (content.length === 0) {
      return NextResponse.json({ error: 'Invalid comment content' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment is too long (maximum 1000 characters)' }, { status: 400 })
    }

    // Rate Limiting: 1 comment per 30 seconds per user on this quiz
    const lastComment = await QuizComment.findOne({
      quiz_id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(payload.userId),
      created_at: { $gt: new Date(Date.now() - 30 * 1000) }
    }).lean()

    if (lastComment) {
      return NextResponse.json({ 
        error: 'You are commenting too fast. Please wait 30 seconds.' 
      }, { status: 429 })
    }

    const newComment = await QuizComment.create({
      quiz_id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(payload.userId),
      content: content,
    })
    
    const user = await User.findById(payload.userId).select('username avatar_url').lean() as any
    const populatedComment = {
      ...newComment.toObject(),
      user_id: user ? { _id: user._id, username: user.username, avatar_url: user.avatar_url } : null,
    }
      
    return NextResponse.json(populatedComment)
  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const { id } = await params
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }
    const quiz = await findStudentAccessibleQuiz(id, payload.userId)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const commentId = searchParams.get('commentId')

    if (!commentId || !Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 })
    }

    const comment = await QuizComment.findById(commentId).lean()
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check ownership
    if (comment.user_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'You do not have permission to delete this comment' }, { status: 403 })
    }

    await QuizComment.findByIdAndDelete(commentId)

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student', 'teacher'] })
