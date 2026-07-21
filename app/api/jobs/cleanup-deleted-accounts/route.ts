import { NextResponse } from 'next/server'
import { purgeExpiredDeletedAccounts } from '@/lib/modules/auth/account-deletion'
import logger from '@/lib/core/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron / Maintenance job API route to permanently purge accounts past 72h deletion schedule
 */
export async function POST() {
  try {
    const purgedCount = await purgeExpiredDeletedAccounts()
    return NextResponse.json({ success: true, purgedCount })
  } catch (error) {
    logger.error({ err: error }, 'Failed to process cleanup-deleted-accounts job')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
