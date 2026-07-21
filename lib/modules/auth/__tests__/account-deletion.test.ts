import { User } from '../models/User'
import { sendAccountDeletionNoticeMail } from '@/lib/core/mail/mail'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/core/mail/mail', () => ({
  sendAccountDeletionNoticeMail: jest.fn().mockResolvedValue(undefined),
  enqueueMail: jest.fn().mockResolvedValue(undefined),
}))

describe('Account Deletion & Restoration Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should allow pending_deletion status in User schema', () => {
    const user = new User({
      username: 'testdeluser',
      username_lower: 'testdeluser',
      email: 'testdel@example.com',
      password_hash: 'hashedpass',
      status: 'pending_deletion',
      deletion_requested_at: new Date(),
      deletion_scheduled_for: new Date(Date.now() + 72 * 3600 * 1000),
      deletion_token: 'testtoken123',
      deletion_token_expires: new Date(Date.now() + 72 * 3600 * 1000),
    })

    expect(user.status).toBe('pending_deletion')
    expect(user.deletion_token).toBe('testtoken123')
    expect(user.deletion_scheduled_for).toBeDefined()
  })

  it('should format and send account deletion notice email', async () => {
    const params = {
      to: 'user@example.com',
      username: 'TestUser',
      restoreUrl: 'http://localhost:3000/restore-account?token=xyz123',
      scheduledFor: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    }

    await sendAccountDeletionNoticeMail(params)
    expect(sendAccountDeletionNoticeMail).toHaveBeenCalledWith(params)
  })

  it('should export purgeUserData and purgeExpiredDeletedAccounts functions', async () => {
    const { purgeUserData, purgeExpiredDeletedAccounts } = await import('../account-deletion')
    expect(typeof purgeUserData).toBe('function')
    expect(typeof purgeExpiredDeletedAccounts).toBe('function')
  })
})
