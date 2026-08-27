import { NextResponse } from 'next/server'
import { validatePostRequest } from '@/lib/modules/community/utils'
import { Post } from '@/lib/modules/community/models/Post'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const validation = await validatePostRequest(id)
    if (!validation.isValid) return validation.response

    const { post, session } = validation

    // Allow author or admin to delete
    if (post.authorId.toString() !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await Post.findByIdAndDelete(id)

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error: any) {
    console.error('Delete post error:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
