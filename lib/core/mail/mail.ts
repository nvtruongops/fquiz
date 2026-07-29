import nodemailer from 'nodemailer'
import logger from '@/lib/core/utils/logger'
import { publishJob } from '@/lib/core/queue/qstash'
import { resolveAppBaseUrl } from '@/lib/core/utils/url-utils'

export type MailJobType = 'reset-password' | 'verification-code' | 'account-deletion-notice' | 'new-quiz-notification'

interface SendResetPasswordMailParams {
  to: string
  resetUrl: string
}

interface SendVerificationCodeMailParams {
  to: string
  code: string
  purpose: 'register' | 'reset-password'
}

interface SendAccountDeletionNoticeMailParams {
  to: string
  username: string
  restoreUrl: string
  scheduledFor: string
}

export interface OtherQuizSummary {
  id: string
  title: string
  questionCount?: number
}

export interface SendNewQuizNotificationMailParams {
  to: string
  username: string
  courseCode: string
  quizTitle: string
  quizId: string
  otherQuizzes?: OtherQuizSummary[]
}

function getMailConfig() {
  const host = process.env.MAIL_HOST
  const port = Number(process.env.MAIL_PORT ?? '587')
  const secure = process.env.MAIL_SECURE === 'true'
  const user = process.env.MAIL_USER
  const appPassword = (process.env.MAIL_APP_PASSWORD ?? '').replaceAll(/\s+/g, '')
  const from = process.env.MAIL_FROM ?? user

  return { host, port, secure, user, appPassword, from }
}

export function isMailConfigured(): boolean {
  const { host, user, appPassword, from } = getMailConfig()
  return Boolean(host && user && appPassword && from)
}

function createTransporter() {
  const { host, port, secure, user, appPassword } = getMailConfig()

  if (!host || !user || !appPassword) {
    throw new Error('Mail service is not configured. Missing MAIL_HOST/MAIL_USER/MAIL_APP_PASSWORD')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: appPassword,
    },
  })
}

export async function sendResetPasswordMail({ to, resetUrl }: SendResetPasswordMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const transporter = createTransporter()

  await transporter.sendMail({
    from,
    to,
    subject: 'FQuiz - Đặt lại mật khẩu',
    text: `Bạn vừa yêu cầu đặt lại mật khẩu.\n\nNhấn vào đường dẫn sau (hiệu lực 15 phút):\n${resetUrl}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
        <h2>Đặt lại mật khẩu</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu tài khoản FQuiz.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;background:#5D7B6F;color:#fff;text-decoration:none;border-radius:6px">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>Liên kết có hiệu lực trong 15 phút.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `,
  })
}

export async function sendVerificationCodeMail({ to, code, purpose }: SendVerificationCodeMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const transporter = createTransporter()
  const isRegister = purpose === 'register'
  const title = isRegister ? 'FQuiz - Mã xác thực đăng ký' : 'FQuiz - Mã xác thực quên mật khẩu'
  const intro = isRegister ? 'Mã xác thực đăng ký của bạn là:' : 'Mã xác thực quên mật khẩu của bạn là:'

  await transporter.sendMail({
    from,
    to,
    subject: title,
    text: `${intro} ${code}\nHiệu lực: 10 phút.\nNếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <p>${intro}</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
        <p>Hiệu lực: 10 phút.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
      </div>
    `,
  })
}

export async function sendAccountDeletionNoticeMail({ to, username, restoreUrl, scheduledFor }: SendAccountDeletionNoticeMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const transporter = createTransporter()
  const formattedDate = new Date(scheduledFor).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  await transporter.sendMail({
    from,
    to,
    subject: 'FQuiz - Thông báo yêu cầu xóa tài khoản (Khôi phục trong 72h)',
    text: `Xin chào ${username},\n\nHệ thống đã nhận được yêu cầu xóa tài khoản FQuiz của bạn.\n\nTài khoản sẽ được giữ và chính thức xóa hoàn toàn vào thời điểm: ${formattedDate} (sau 72 giờ).\n\nNếu KHÔNG PHẢI BẠN yêu cầu xóa tài khoản, vui lòng nhấn vào đường dẫn sau để KHÔI PHỤC TÀI KHOẢN ngay lập tức trước 72 giờ:\n${restoreUrl}\n\nTrân trọng,\nFQuiz Team`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px;background-color:#ffffff">
        <h2 style="color:#dc2626;margin-top:0">Thông báo yêu cầu xóa tài khoản</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Hệ thống FQuiz đã ghi nhận yêu cầu xóa tài khoản của bạn.</p>
        <div style="background-color:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:4px">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600">
            Tài khoản của bạn sẽ được giữ tạm thời và chính thức xóa vĩnh viễn vào lúc:<br/>
            <span style="font-size:16px;color:#dc2626">${formattedDate}</span> (72 giờ kể từ khi yêu cầu).
          </p>
        </div>
        <p style="color:#374151;font-size:14px;margin-top:20px">
          <strong>LƯU Ý QUAN TRỌNG:</strong> Nếu bạn <em>không phải là người thực hiện yêu cầu này</em> (hoặc đổi ý muốn giữ lại tài khoản), vui lòng nhấn vào nút bên dưới để khôi phục tài khoản trước thời hạn 72 giờ:
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${restoreUrl}" style="display:inline-block;padding:12px 24px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
            Khôi phục tài khoản ngay
          </a>
        </div>
        <p style="font-size:12px;color:#6b7280;line-height:1.4">
          Nếu đường dẫn trên không bấm được, bạn có thể sao chép liên kết sau dán vào trình duyệt:<br/>
          <a href="${restoreUrl}" style="color:#2563eb;word-break:break-all">${restoreUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">FQuiz — Nền tảng ôn tập & luyện thi thông minh</p>
      </div>
    `,
  })
}

export async function sendNewQuizNotificationMail({ to, username, courseCode, quizTitle, quizId, otherQuizzes = [] }: SendNewQuizNotificationMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const appUrl = resolveAppBaseUrl()
  const quizUrl = `${appUrl}/quiz/${quizId}`
  const courseUrl = `${appUrl}/courses/${encodeURIComponent(courseCode)}`
  const transporter = createTransporter()

  const otherQuizzesHtml = otherQuizzes.length > 0 ? `
    <div style="margin-top:24px;border-top:1px dashed #e5e7eb;padding-top:16px">
      <p style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px 0">Các bài quiz khác thuộc môn ${courseCode}:</p>
      <ul style="padding-left:20px;margin:0;color:#4b5563;font-size:14px">
        ${otherQuizzes.map(q => `
          <li style="margin-bottom:8px">
            <a href="${appUrl}/quiz/${q.id}" style="color:#5D7B6F;text-decoration:none;font-weight:600">${q.title}</a>
            ${q.questionCount ? `<span style="color:#6b7280;font-size:12px"> (${q.questionCount} câu hỏi)</span>` : ''}
          </li>
        `).join('')}
      </ul>
      <div style="margin-top:14px">
        <a href="${courseUrl}" style="font-size:13px;color:#5D7B6F;text-decoration:underline;font-weight:600">
          Xem tất cả bài quiz của môn ${courseCode} →
        </a>
      </div>
    </div>
  ` : ''

  const otherQuizzesText = otherQuizzes.length > 0 ? `\n\nCác bài quiz khác thuộc môn ${courseCode}:\n` +
    otherQuizzes.map(q => `- ${q.title}${q.questionCount ? ` (${q.questionCount} câu)` : ''}: ${appUrl}/quiz/${q.id}`).join('\n') +
    `\n\nXem tất cả quiz của môn ${courseCode}: ${courseUrl}` : ''

  await transporter.sendMail({
    from,
    to,
    subject: `[FQuiz] Quiz mới cho môn ${courseCode}`,
    text: `Xin chào ${username},\n\nMôn học ${courseCode} mà bạn đã ghim vừa có quiz mới: "${quizTitle}".\n\nVào làm bài ngay tại:\n${quizUrl}${otherQuizzesText}\n\nTrân trọng,\nFQuiz Team`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px;background-color:#ffffff">
        <h2 style="color:#5D7B6F;margin-top:0">Quiz mới cho môn ${courseCode}</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Môn học <strong>${courseCode}</strong> mà bạn đã ghim vừa có bài quiz mới được phát hành trên FQuiz:</p>
        <div style="background-color:#f4f7f5;border-left:4px solid #5D7B6F;padding:14px 18px;margin:16px 0;border-radius:6px">
          <p style="margin:0;color:#2c3e35;font-size:16px;font-weight:700">✨ ${quizTitle}</p>
          <div style="margin-top:10px">
            <a href="${quizUrl}" style="display:inline-block;padding:8px 16px;background-color:#5D7B6F;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">
              Vào làm Quiz ngay
            </a>
          </div>
        </div>
        ${otherQuizzesHtml}
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">Bạn nhận được email này vì đã ghim môn học và bật nhận thông báo trên FQuiz.</p>
      </div>
    `,
  })
}

/**
 * Enqueue a mail job to QStash for background processing
 */
export async function enqueueMail(type: MailJobType, data: any) {
  const appUrl = resolveAppBaseUrl()
  const destination = `${appUrl}/api/jobs/mail`
  
  // If no QStash token, fallback to direct (sync) sending for local dev convenience
  if (!process.env.QSTASH_TOKEN) {
    logger.info({ type, to: data.to }, 'QStash not configured, sending mail synchronously')
    if (type === 'reset-password') return sendResetPasswordMail(data)
    if (type === 'verification-code') return sendVerificationCodeMail(data)
    if (type === 'account-deletion-notice') return sendAccountDeletionNoticeMail(data)
    if (type === 'new-quiz-notification') return sendNewQuizNotificationMail(data)
    return
  }

  return publishJob(destination, { type, data })
}
