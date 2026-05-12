import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/core/db/mongodb';
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession';
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine';
import { qstashReceiver } from '@/lib/core/queue/qstash';

const MAX_COMPLETED_ATTEMPTS_PER_QUIZ = 10;

/**
 * POST /api/jobs/quiz-post-submit
 * Background job to handle cleanup and stats after a quiz is submitted.
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
    const { studentId, quizId } = JSON.parse(bodyText);

    await connectDB();

    // 1. Housekeeping: Keep only latest N completed attempts
    const overflowAttempts = await QuizSession.find(
      {
        student_id: studentId,
        quiz_id: quizId,
        status: 'completed',
      },
      { _id: 1 }
    )
      .sort({ completed_at: -1, _id: -1 })
      .skip(MAX_COMPLETED_ATTEMPTS_PER_QUIZ)
      .lean();

    if (overflowAttempts.length > 0) {
      await QuizSession.deleteMany({
        _id: { $in: overflowAttempts.map((attempt) => attempt._id) },
      });
    }

    // 2. Sync global stats
    await syncUniqueStudentCount(quizId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Quiz Post-Submit Job Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
