import { NextResponse } from 'next/server';
import { verifyQStashRequest } from '@/lib/core/queue/qstash';
import { sendResetPasswordMail, sendVerificationCodeMail } from '@/lib/core/mail/mail';
import logger from '@/lib/core/utils/logger';

export const runtime = 'nodejs';

/**
 * API route to process email jobs from QStash
 */
export async function POST(req: Request) {
  // 1. Verify QStash Signature (Security)
  const verification = await verifyQStashRequest(req);
  if (!verification.isValid) {
    return new Response(verification.error ?? 'Unauthorized', { status: verification.status });
  }

  try {
    const job = JSON.parse(verification.bodyText);
    const { type, data } = job;

    logger.info({ type }, 'Processing email job')

    if (type === 'reset-password') {
      await sendResetPasswordMail(data);
    } else if (type === 'verification-code') {
      await sendVerificationCodeMail(data);
    } else {
      return NextResponse.json({ error: 'Unknown job type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to process email job')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
