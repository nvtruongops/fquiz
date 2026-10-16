import nodemailer from 'nodemailer'
import logger from '@/lib/core/utils/logger'
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

  const appUrl = resolveAppBaseUrl()
  const transporter = createTransporter()

  await transporter.sendMail({
    from,
    to,
    subject: 'FQuiz - Reset Your Password',
    text: `You recently requested to reset your password.\n\nClick the link below (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:580px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:28px;background-color:#ffffff">
        <div style="margin-bottom:20px;border-bottom:1px solid #f3f4f6;padding-bottom:16px">
          <span style="font-size:18px;font-weight:900;color:#059669;letter-spacing:-0.5px">FQuiz</span>
        </div>
        <h2 style="color:#111827;margin-top:0;font-size:20px;font-weight:800">Reset Your Password</h2>
        <p style="font-size:14px;color:#4b5563">You recently requested to reset the password for your FQuiz account.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;box-shadow:0 2px 4px rgba(5,150,105,0.2)">
            Reset Password Now
          </a>
        </div>
        <p style="font-size:13px;color:#6b7280;line-height:1.5">
          This link is valid for <strong>15 minutes</strong>. If you did not make this request, your account remains secure and you can safely disregard this email.
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">FQuiz — Smart Multiple-Choice Learning & Practice Platform</p>
      </div>
    `,
  })
}

export async function sendVerificationCodeMail({ to, code, purpose }: SendVerificationCodeMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const transporter = createTransporter()
  const isRegister = purpose === 'register'
  const title = isRegister ? 'FQuiz - Verification Code for Registration' : 'FQuiz - Password Reset Verification Code'
  const intro = isRegister ? 'Your FQuiz registration verification code is:' : 'Your password reset verification code is:'

  await transporter.sendMail({
    from,
    to,
    subject: title,
    text: `${intro} ${code}\nValid for: 10 minutes.\nIf you did not request this, please disregard this email.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111827;max-width:580px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:28px;background-color:#ffffff">
        <div style="margin-bottom:20px;border-bottom:1px solid #f3f4f6;padding-bottom:16px">
          <span style="font-size:18px;font-weight:900;color:#059669;letter-spacing:-0.5px">FQuiz</span>
        </div>
        <p style="font-size:14px;color:#4b5563;margin-top:0">${intro}</p>
        <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin:20px 0">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#059669;font-family:monospace">${code}</span>
        </div>
        <p style="font-size:13px;color:#6b7280;margin:0">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">FQuiz — Smart Multiple-Choice Learning & Practice Platform</p>
      </div>
    `,
  })
}

export async function sendAccountDeletionNoticeMail({ to, username, restoreUrl, scheduledFor }: SendAccountDeletionNoticeMailParams): Promise<void> {
  const { from } = getMailConfig()
  if (!from) throw new Error('Missing MAIL_FROM')

  const transporter = createTransporter()
  const formattedDate = new Date(scheduledFor).toUTCString()

  await transporter.sendMail({
    from,
    to,
    subject: 'FQuiz - Account Deletion Notice (Recoverable within 72 hours)',
    text: `Hello ${username},\n\nWe received a request to delete your FQuiz account.\n\nYour account is scheduled for permanent deletion on: ${formattedDate} (72 hours from request).\n\nIf YOU DID NOT request this deletion, please click the following link immediately to RECOVER YOUR ACCOUNT within 72 hours:\n${restoreUrl}\n\nBest regards,\nThe FQuiz Team`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:28px;background-color:#ffffff">
        <div style="margin-bottom:20px;border-bottom:1px solid #f3f4f6;padding-bottom:16px">
          <span style="font-size:18px;font-weight:900;color:#dc2626;letter-spacing:-0.5px">FQuiz Account Security</span>
        </div>
        <h2 style="color:#dc2626;margin-top:0;font-size:20px;font-weight:800">Account Deletion Request Notice</h2>
        <p style="font-size:14px;color:#374151">Hello <strong>${username}</strong>,</p>
        <p style="font-size:14px;color:#374151">We received a request to delete your FQuiz account.</p>
        <div style="background-color:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;margin:18px 0;border-radius:8px">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600">
            Your account is scheduled for permanent deletion on:<br/>
            <span style="font-size:16px;color:#dc2626;font-weight:800">${formattedDate}</span> (72 hours from request).
          </p>
        </div>
        <p style="color:#374151;font-size:14px;margin-top:20px">
          <strong>IMPORTANT:</strong> If you <em>did not request this</em> (or wish to keep your account), click the button below to recover your account immediately:
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${restoreUrl}" style="display:inline-block;padding:12px 28px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 2px 4px rgba(5,150,105,0.2)">
            Recover Account Now
          </a>
        </div>
        <p style="font-size:12px;color:#6b7280;line-height:1.4">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${restoreUrl}" style="color:#2563eb;word-break:break-all">${restoreUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">FQuiz — Smart Multiple-Choice Learning & Practice Platform</p>
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
  const settingsUrl = `${appUrl}/settings`
  const transporter = createTransporter()

  const otherQuizzesHtml = otherQuizzes.length > 0 ? `
    <div style="margin-top:24px;border-top:1px dashed #e5e7eb;padding-top:16px">
      <p style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px 0">Other quizzes in ${courseCode}:</p>
      <ul style="padding-left:20px;margin:0;color:#4b5563;font-size:14px">
        ${otherQuizzes.map(q => `
          <li style="margin-bottom:8px">
            <a href="${appUrl}/quiz/${q.id}" style="color:#059669;text-decoration:none;font-weight:600">${q.title}</a>
            ${q.questionCount ? `<span style="color:#6b7280;font-size:12px"> (${q.questionCount} questions)</span>` : ''}
          </li>
        `).join('')}
      </ul>
      <div style="margin-top:14px">
        <a href="${courseUrl}" style="font-size:13px;color:#059669;text-decoration:underline;font-weight:600">
          View all quizzes for ${courseCode} →
        </a>
      </div>
    </div>
  ` : ''

  const formatOtherQuizLine = (q: { id: string; title: string; questionCount?: number }) => {
    const countStr = q.questionCount ? ` (${q.questionCount} questions)` : ''
    return `- ${q.title}${countStr}: ${appUrl}/quiz/${q.id}`
  }

  const otherQuizzesText = otherQuizzes.length > 0 ? `\n\nOther quizzes in ${courseCode}:\n` +
    otherQuizzes.map(formatOtherQuizLine).join('\n') +
    `\n\nView all quizzes for ${courseCode}: ${courseUrl}` : ''

  await transporter.sendMail({
    from,
    to,
    subject: `[FQuiz] New Quiz Available for ${courseCode}`,
    text: `Hello ${username},\n\nA new quiz was just published for your pinned course ${courseCode}: "${quizTitle}".\n\nTake the quiz now at:\n${quizUrl}${otherQuizzesText}\n\nManage your notification settings at: ${settingsUrl}\n\nBest regards,\nThe FQuiz Team`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:28px;background-color:#ffffff">
        <div style="margin-bottom:20px;border-bottom:1px solid #f3f4f6;padding-bottom:16px">
          <span style="font-size:18px;font-weight:900;color:#059669;letter-spacing:-0.5px">FQuiz Course Notification</span>
        </div>
        <h2 style="color:#059669;margin-top:0;font-size:20px;font-weight:800">New Quiz Available for ${courseCode}</h2>
        <p style="font-size:14px;color:#374151">Hello <strong>${username}</strong>,</p>
        <p style="font-size:14px;color:#374151">A new quiz has just been released for your pinned course <strong>${courseCode}</strong> on FQuiz:</p>
        <div style="background-color:#f0fdf4;border-left:4px solid #059669;padding:16px 20px;margin:18px 0;border-radius:8px">
          <p style="margin:0;color:#065f46;font-size:16px;font-weight:800">✨ ${quizTitle}</p>
          <div style="margin-top:14px">
            <a href="${quizUrl}" style="display:inline-block;padding:10px 22px;background-color:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 2px 4px rgba(5,150,105,0.2)">
              Start Quiz Now →
            </a>
          </div>
        </div>
        ${otherQuizzesHtml}
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 16px 0"/>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;line-height:1.5">
          You are receiving this email because you pinned this course and enabled notifications on FQuiz.<br/>
          You can <a href="${settingsUrl}" style="color:#059669;text-decoration:underline">manage notification preferences</a> anytime.
        </p>
      </div>
    `,
  })
}

/**
 * Enqueue a mail job for background/direct processing
 */
export async function enqueueMail(type: MailJobType, data: any) {
  logger.info({ type, to: data?.to }, 'Dispatching mail job')
  if (type === 'reset-password') return sendResetPasswordMail(data)
  if (type === 'verification-code') return sendVerificationCodeMail(data)
  if (type === 'account-deletion-notice') return sendAccountDeletionNoticeMail(data)
  if (type === 'new-quiz-notification') return sendNewQuizNotificationMail(data)
}
