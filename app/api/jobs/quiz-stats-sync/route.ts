import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/core/db/mongodb';
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine';
import { verifyQStashRequest } from '@/lib/core/queue/qstash';

/**
 * POST /api/jobs/quiz-stats-sync
 * Background job to sync quiz statistics like unique student count.
 */
export async function POST(req: Request) {
  // 1. Verify QStash Signature (Security)
  const verification = await verifyQStashRequest(req);
  if (!verification.isValid) {
    return new Response(verification.error ?? 'Unauthorized', { status: verification.status });
  }

  try {
    const { quizId } = JSON.parse(verification.bodyText);

    await connectDB();
    await syncUniqueStudentCount(quizId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Quiz Stats Sync Job Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
