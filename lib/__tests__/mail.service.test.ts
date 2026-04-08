jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

import nodemailer from 'nodemailer'
import logger from '@/lib/logger'
import { isMailConfigured, sendRegistrationMail, sendResetPasswordMail, verifyMailTransport } from '@/lib/mail'

const createTransportMock = nodemailer.createTransport as jest.Mock
const loggerWarnMock = (logger as any).warn as jest.Mock

function setMailEnv() {
  process.env.MAIL_HOST = 'smtp.gmail.com'
  process.env.MAIL_PORT = '587'
  process.env.MAIL_SECURE = 'false'
  process.env.MAIL_USER = 'test@example.com'
  process.env.MAIL_APP_PASSWORD = 'ab cd ef gh'
  process.env.MAIL_FROM = 'FQuiz <test@example.com>'
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
}

describe('mail service', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns false when mail env is missing', () => {
    delete process.env.MAIL_HOST
    delete process.env.MAIL_USER
    delete process.env.MAIL_APP_PASSWORD
    delete process.env.MAIL_FROM

    expect(isMailConfigured()).toBe(false)
  })

  it('returns true when mail env is configured', () => {
    setMailEnv()
    expect(isMailConfigured()).toBe(true)
  })

  it('sends registration mail with expected SMTP config and payload', async () => {
    setMailEnv()
    const sendMail = jest.fn().mockResolvedValue(undefined)
    createTransportMock.mockReturnValue({ sendMail })

    await sendRegistrationMail({ to: 'user@example.com', username: 'tester' })

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          // App password should be normalized (spaces removed)
          pass: 'abcdefgh',
        },
      })
    )

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'FQuiz <test@example.com>',
        to: 'user@example.com',
        subject: expect.stringContaining('FQuiz'),
      })
    )
  })

  it('sends reset password mail with reset URL', async () => {
    setMailEnv()
    const sendMail = jest.fn().mockResolvedValue(undefined)
    createTransportMock.mockReturnValue({ sendMail })

    await sendResetPasswordMail({
      to: 'user@example.com',
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
    })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        text: expect.stringContaining('reset-password?token=abc'),
        html: expect.stringContaining('reset-password?token=abc'),
      })
    )
  })

  it('throws when trying to send mail without required env config', async () => {
    delete process.env.MAIL_HOST
    process.env.MAIL_USER = 'test@example.com'
    process.env.MAIL_APP_PASSWORD = 'abc123'
    process.env.MAIL_FROM = 'FQuiz <test@example.com>'

    await expect(
      sendRegistrationMail({ to: 'user@example.com', username: 'tester' })
    ).rejects.toThrow('Mail service is not configured')
  })

  it('verifyMailTransport does nothing when not configured', async () => {
    delete process.env.MAIL_HOST
    delete process.env.MAIL_USER
    delete process.env.MAIL_APP_PASSWORD

    await verifyMailTransport()

    expect(createTransportMock).not.toHaveBeenCalled()
    expect(loggerWarnMock).not.toHaveBeenCalled()
  })

  it('verifyMailTransport logs warning when transporter verify fails', async () => {
    setMailEnv()
    const verify = jest.fn().mockRejectedValue(new Error('smtp failed'))
    createTransportMock.mockReturnValue({ verify })

    await verifyMailTransport()

    expect(verify).toHaveBeenCalledTimes(1)
    expect(loggerWarnMock).toHaveBeenCalled()
  })
})
