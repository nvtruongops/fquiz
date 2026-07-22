import { NextResponse } from 'next/server'
import { purgeExpiredDeletedAccounts } from '@/lib/modules/auth/account-deletion'
import logger from '@/lib/core/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') return false
    return true // Allow unauthenticated execution only in local dev if CRON_SECRET is missing
  }

  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  const token = bearerToken || cronHeader

  return token === cronSecret
}

/**
 * Cron / Maintenance job API route to permanently purge accounts past 72h deletion schedule
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const purgedCount = await purgeExpiredDeletedAccounts()
    return NextResponse.json({ success: true, purgedCount })
  } catch (error) {
    logger.error({ err: error }, 'Failed to process cleanup-deleted-accounts job')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return POST(req)
}
