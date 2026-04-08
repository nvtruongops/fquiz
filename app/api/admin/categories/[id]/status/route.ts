import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Category } from '@/models/Category'
import { UpdateCategoryStatusSchema, MongoIdSchema } from '@/lib/schemas'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    // Validate ObjectId
    const idValidation = MongoIdSchema.safeParse(id)
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 })
    }

    // Validate body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = UpdateCategoryStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { status } = parsed.data

    await connectDB()
    const category = await Category.findById(id)
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    category.status = status
    if (status === 'approved') {
      category.is_public = true // For requests from users to be public
    }
    
    await category.save()

    return NextResponse.json({ category })
  } catch (err) {
    console.error('Error updating category status:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
