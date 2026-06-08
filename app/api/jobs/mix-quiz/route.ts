import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '@/lib/core/db/mongodb';
import { Quiz } from '@/lib/modules/quiz/models/Quiz';
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession';
import { qstashReceiver } from '@/lib/core/queue/qstash';
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator';
import type { IQuestion } from '@/lib/modules/quiz/types/quiz';

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    const payload = JSON.parse(bodyText);
    const { sessionId, quiz_ids, question_count, mode, difficulty, studentId } = payload;

    await connectDB();

    // Load quizzes — only public + published
    const quizObjectIds = quiz_ids.map((id: string) => new mongoose.Types.ObjectId(id));
    const quizzes = await Quiz.find({
      _id: { $in: quizObjectIds },
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
    })
      .select('title course_code questions category_id')
      .lean() as any[];

    const validQuizzes = quizzes.filter((q) => q.questions && q.questions.length > 0);

    if (validQuizzes.length < 2) {
      await QuizSession.updateOne({ _id: sessionId }, { status: 'expired' });
      return NextResponse.json({ error: 'Not enough valid quizzes' }, { status: 400 });
    }

    // Deduplicate questions
    const seenKeys = new Set<string>();
    const uniquePoolsPerQuiz: IQuestion[][] = validQuizzes.map((quiz) => {
      const pool: IQuestion[] = [];
      for (const q of quiz.questions as IQuestion[]) {
        const key = q.question_id ?? q._id.toString();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          pool.push(q);
        }
      }
      return pool;
    });

    // Đảm bảo mọi question đều có question_id trước khi trộn
    for (const pool of uniquePoolsPerQuiz) {
      for (const q of pool) {
        if (!q.question_id) {
          q.question_id = generateQuestionId(q);
        }
      }
    }

    const deduplicatedQuizzes = uniquePoolsPerQuiz.filter((pool) => pool.length > 0);

    // Sample proportionally
    const numQuizzes = deduplicatedQuizzes.length;
    const baseQuota = Math.floor(question_count / numQuizzes);
    const remainder = question_count % numQuizzes;

    const sorted = [...deduplicatedQuizzes].sort((a, b) => b.length - a.length);
    const quotas = sorted.map((pool, i) => ({
      pool,
      quota: baseQuota + (i < remainder ? 1 : 0),
    }));

    let surplus = 0;
    const firstPass = quotas.map(({ pool, quota }) => {
      const available = pool.length;
      if (available >= quota) return { questions: pool, quota };
      surplus += quota - available;
      return { questions: pool, quota: available };
    });

    const sampled: IQuestion[] = [];
    for (const pass of firstPass) {
      const shuffledPool = shuffleArray(pass.questions);
      let take = pass.quota;
      if (surplus > 0) {
        const extra = Math.min(surplus, shuffledPool.length - take);
        if (extra > 0) { take += extra; surplus -= extra; }
      }
      sampled.push(...shuffledPool.slice(0, take));
    }

    const finalSampled = shuffleArray(sampled);
    const actualCount = finalSampled.length;

    // Create temp quiz
    const quizTitles = validQuizzes.map((q) => q.course_code as string);
    const titlePreview = quizTitles.join(' + ');

    let tempQuiz: any = null;
    let retries = 0;
    while (retries < 2) {
      try {
        const courseCode = await generateTempCourseCode();
        tempQuiz = await Quiz.create({
          title: `Quiz Trộn · ${titlePreview}`,
          course_code: courseCode,
          category_id: validQuizzes[0].category_id,
          questions: finalSampled,
          questionCount: actualCount,
          is_public: false,
          is_temp: true,
          created_by: new mongoose.Types.ObjectId(studentId),
          status: 'published',
          mix_config: {
            quiz_ids: quizObjectIds,
            question_count: question_count,
            mode: mode,
            category_id: validQuizzes[0].category_id,
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === 11000 && retries < 1) { 
          retries++; 
          continue; 
        }
        throw err;
      }
    }

    // Update session
    const questionOrder = difficulty === 'random'
      ? shuffleArray(Array.from({ length: actualCount }, (_, i) => i))
      : Array.from({ length: actualCount }, (_, i) => i);

    await QuizSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          quiz_id: tempQuiz._id,
          questions_cache: finalSampled,
          question_order: questionOrder,
          status: 'active',
          flashcard_stats: mode === 'flashcard' ? {
            total_cards: actualCount,
            cards_known: 0,
            cards_unknown: 0,
            time_spent_ms: 0,
            current_round: 1
          } : undefined,
          last_activity_at: new Date()
        }
      }
    );

    return NextResponse.json({ success: true, quizId: tempQuiz._id });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
