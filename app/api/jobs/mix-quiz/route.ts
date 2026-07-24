import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '@/lib/core/db/mongodb';
import { Quiz } from '@/lib/modules/quiz/models/Quiz';
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession';
import { verifyQStashRequest } from '@/lib/core/queue/qstash';
import { processMixQuizGeneration } from '@/lib/modules/quiz/utils/mix-quiz-processor';

/**
 * Generate a unique temp course_code.
 */
async function generateTempCourseCode(): Promise<string> {
  return `TEMP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export const runtime = 'nodejs'; // Use Node.js for heavy processing
export const maxDuration = 60;   // Allow more time if needed on Vercel

/**
 * POST /api/jobs/mix-quiz
 * Background job to process quiz mixing.
 */
export async function POST(req: Request) {
  // 1. Verify QStash Signature (Security)
  const verification = await verifyQStashRequest(req);
  if (!verification.isValid) {
    return new Response(verification.error ?? 'Unauthorized', { status: verification.status });
  }

  try {
    const payload = JSON.parse(verification.bodyText);
    const { sessionId, quiz_ids, question_count, mode, difficulty, studentId } = payload;

    const result = await processMixQuizGeneration({
      sessionId,
      quiz_ids,
      question_count,
      mode,
      difficulty,
      studentId,
    });

    return NextResponse.json({ success: true, quizId: result.quizId });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
