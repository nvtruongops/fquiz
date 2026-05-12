import { NextResponse } from 'next/server';
import { qstashReceiver } from '@/lib/core/queue/qstash';
import { sendResetPasswordMail, sendVerificationCodeMail } from '@/lib/core/mail/mail';

export const runtime = 'nodejs';

/**
 * API route to process email jobs from QStash
 */
export async function POST(req: Request) {
  // 1. Verify QStash Signature (Security)
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const bodyText = await req.text();
  
  // Skip verification if keys are not set (for initial setup/dev)
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const isValid = await qstashReceiver.verify({
      signature,
      body: bodyText,
    });

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  try {
    const job = JSON.parse(bodyText);
    const { type, data } = job;

    console.log(`Processing email job: ${type} for ${data.to}`);

    if (type === 'reset-password') {
      await sendResetPasswordMail(data);
    } else if (type === 'verification-code') {
      await sendVerificationCodeMail(data);
    } else {
      return NextResponse.json({ error: 'Unknown job type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process email job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
