import nodemailer from 'nodemailer'
import logger from '@/lib/logger'

interface SendResetPasswordMailParams {
  to: string
  resetUrl: string
}

interface SendVerificationCodeMailParams {
  to: string
  code: string
  purpose: 'register' | 'reset-password'
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

export async function verifyMailTransport(): Promise<void> {
  if (!isMailConfigured()) return
  try {
    const transporter = createTransporter()
    await transporter.verify()
  } catch (err) {
    logger.warn({ err }, 'Mail transporter verification failed')
  }
}
