import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { QuizComment } from '@/models/QuizComment'
import { verifyToken } from '@/lib/auth'
import { Types } from 'mongoose'
import '@/models/User' // Ensure User model is registered for populate

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const comments = await QuizComment.find({ quiz_id: new Types.ObjectId(id) })
      .populate('user_id', 'username avatar_url')
      .sort({ created_at: -1 })
      .lean()
    
    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const body = await req.json()
    let { content } = body
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Nội dung bình luận không được để trống' }, { status: 400 })
    }
    
    // Sanitization: Strip HTML tags
    content = content.replace(/<[^>]*>?/gm, '').trim()
    
    if (content.length === 0) {
      return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Bình luận quá dài (tối đa 1000 ký tự)' }, { status: 400 })
    }

    // Rate Limiting: 1 comment per 30 seconds per user on this quiz
    const lastComment = await QuizComment.findOne({
      quiz_id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(payload.userId),
      created_at: { $gt: new Date(Date.now() - 30 * 1000) }
    })

    if (lastComment) {
      return NextResponse.json({ 
        error: 'Bạn đang bình luận quá nhanh. Vui lòng đợi 30 giây.' 
      }, { status: 429 })
    }

    const newComment = await QuizComment.create({
      quiz_id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(payload.userId),
      content: content,
    })
    
    const populatedComment = await QuizComment.findById(newComment._id)
      .populate('user_id', 'username avatar_url')
      .lean()
      
    return NextResponse.json(populatedComment)
  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const commentId = searchParams.get('commentId')

    if (!commentId || !Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 })
    }

    const comment = await QuizComment.findById(commentId)
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check ownership
    if (comment.user_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa bình luận này' }, { status: 403 })
    }

    await QuizComment.findByIdAndDelete(commentId)

    return NextResponse.json({ message: 'Đã xóa bình luận' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
