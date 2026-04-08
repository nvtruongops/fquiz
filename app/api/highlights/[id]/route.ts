import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserHighlight } from '@/models/UserHighlight'
import { authorizeResource } from '@/lib/authz'
import { logSecurityEvent } from '@/lib/logger'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get('x-request-id') || 'unknown'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const { id } = await params
  const route = `/api/highlights/${id}`

  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const highlight = await authorizeResource(payload, id, UserHighlight, 'highlight', 'student_id')
    await (highlight as any).deleteOne()

    return NextResponse.json({ message: 'Deleted' }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
