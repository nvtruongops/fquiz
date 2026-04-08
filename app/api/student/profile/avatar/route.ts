import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { uploadImage } from '@/lib/cloudinary'
import { ImageUploadSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Validate image upload with schema
    const validation = ImageUploadSchema.safeParse({ image_url: body?.image })
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Ảnh tải lên không hợp lệ',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const image = body.image

    await connectDB()
    const existingUser = await User.findById(payload.userId)
      .select('_id')
      .lean() as { _id: string } | null

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const nextAvatarUrl = await uploadImage(image, {
      folder: `fquiz/users/${payload.userId}/avatar`,
      public_id: 'avatar',
      overwrite: true,
      invalidate: true,
    })

    const updateResult = await User.findByIdAndUpdate(payload.userId, {
      $set: { avatar_url: nextAvatarUrl },
    })

    if (!updateResult) {
      return NextResponse.json({ error: 'Không cập nhật được avatar vào hồ sơ người dùng' }, { status: 500 })
    }

    const persistedUser = await User.findById(payload.userId)
      .select('avatar_url avatarUrl')
      .lean() as { avatar_url?: string | null; avatarUrl?: string | null } | null

    const persistedAvatarUrl = persistedUser?.avatar_url ?? persistedUser?.avatarUrl ?? nextAvatarUrl

    return NextResponse.json({ avatarUrl: persistedAvatarUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
