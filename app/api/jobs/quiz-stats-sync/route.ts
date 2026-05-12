import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/core/db/mongodb';
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine';
import { qstashReceiver } from '@/lib/core/queue/qstash';

/**
 * POST /api/jobs/quiz-stats-sync
 * Background job to sync quiz statistics like unique student count.
 */
export async function POST(req: Request) {
  // 1. Verify QStash Signature (Security)
  const signature = req.headers.get("upstash-signature");
  if (!signature) return new Response("Missing signature", { status: 401 });

  // Allow local development mock signature
  const isLocalMock = signature === 'mock-signature-for-local-dev' && process.env.NODE_ENV === 'development';

  const bodyText = await req.text();
  
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && !isLocalMock) {
    const isValid = await qstashReceiver.verify({ signature, body: bodyText });
    if (!isValid) return new Response("Invalid signature", { status: 401 });
  }

  try {
    const { quizId } = JSON.parse(bodyText);

    await connectDB();
    await syncUniqueStudentCount(quizId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Quiz Stats Sync Job Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
