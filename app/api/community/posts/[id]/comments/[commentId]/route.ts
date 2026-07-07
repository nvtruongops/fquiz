import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifySession } from '@/lib/modules/auth/dal'
import { Post } from '@/lib/modules/community/models/Post'
import mongoose from 'mongoose'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 })
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

    const comment = post.comments.find((c: any) => c._id.toString() === commentId)
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Allow comment author, post author, or admin to delete
    if (
      comment.authorId.toString() !== session.userId &&
      post.authorId.toString() !== session.userId &&
      session.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    post.comments = post.comments.filter((c: any) => c._id.toString() !== commentId)
    await post.save()

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error: any) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
