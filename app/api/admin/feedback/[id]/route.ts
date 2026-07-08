import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { isMailConfigured } from '@/lib/core/mail/mail'
import nodemailer from 'nodemailer'
import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '@/lib/core/api-helpers'

const UpdateSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved']),
}).strict()

const ReplySchema = z.object({
  reply_message: z.string().trim().min(10).max(2000),
}).strict()

function createTransporter() {
  const host = process.env.MAIL_HOST
  const port = Number(process.env.MAIL_PORT ?? '587')
  const secure = process.env.MAIL_SECURE === 'true'
  const user = process.env.MAIL_USER
  const pass = (process.env.MAIL_APP_PASSWORD ?? '').replaceAll(/\s+/g, '')
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export const PATCH = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    await connectDB()

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status: parsed.data.status },
      { new: true }
    ).lean()

    if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ feedback })
  } catch (err) {
    console.error('PATCH /api/admin/feedback/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
}, { roles: ['admin'] })

export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    await connectDB()
    await Feedback.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/feedback/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
}, { roles: ['admin'] })

export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const idCheck = invalidIdResponse(id)
    if (idCheck) return idCheck

    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const parsed = ReplySchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    await connectDB()
    const feedback = await Feedback.findById(id).lean() as any
    if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!isMailConfigured()) {
      return NextResponse.json({ error: 'Mail chưa được cấu hình' }, { status: 503 })
    }

    const from = process.env.MAIL_FROM ?? process.env.MAIL_USER
    const transporter = createTransporter()

    const TYPE_VI: Record<string, string> = {
      bug: 'Báo lỗi', feature: 'Đề xuất tính năng',
      content: 'Góp ý nội dung', other: 'Khác',
    }

    await transporter.sendMail({
      from,
      to: feedback.user_email,
      subject: 'FQuiz - Phản hồi góp ý của bạn',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px">
          <h2 style="color:#5D7B6F">Cảm ơn bạn đã góp ý!</h2>
          <p>Xin chào <strong>${feedback.username}</strong>,</p>
          <p>Chúng tôi đã nhận được góp ý <strong>${TYPE_VI[feedback.type] ?? feedback.type}</strong> của bạn và xin gửi phản hồi:</p>
          <blockquote style="border-left:3px solid #5D7B6F;padding:12px 16px;background:#f9fafb;border-radius:4px;margin:16px 0">
            ${parsed.data.reply_message.replaceAll('\n', '<br>')}
          </blockquote>
          <p>Cảm ơn bạn đã đồng hành cùng FQuiz!</p>
          <p style="color:#6b7280;font-size:13px">— Đội ngũ FQuiz</p>
        </div>
      `,
    })

    // Cập nhật status → resolved và lưu nội dung phản hồi
    await Feedback.findByIdAndUpdate(id, { 
      status: 'resolved',
      reply_message: parsed.data.reply_message,
      replied_at: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/admin/feedback/[id] reply error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['admin'] })