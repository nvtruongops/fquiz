import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import { Language } from '@/lib/modules/learning/models/Language'
import type { JWTPayload } from '@/lib/modules/auth/auth'

/**
 * POST /api/v1/learning/vocabulary/quick-save
 * Lưu nhanh một từ/cụm từ từ Quiz hoặc Flashcard vào Sổ từ vựng cá nhân của User kèm ngữ cảnh.
 */
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const body = await req.json()
      const {
        expression,
        contextSentence,
        customTranslation,
        personalNote,
        sourceType = 'quiz',
        sourceId,
        sourceLanguageId,
        targetLanguageId,
      } = body

      if (!expression || typeof expression !== 'string' || !expression.trim()) {
        return NextResponse.json({ error: 'Từ/cụm từ không được để trống' }, { status: 400 })
      }

      const trimmedExpr = expression.trim()
      const normalizedExpr = trimmedExpr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

      // 1. Tìm hoặc xác định Language ID
      let langId = sourceLanguageId
      if (!langId) {
        const defaultLang = await Language.findOne({ code: 'en' }).lean()
        if (defaultLang) {
          langId = defaultLang._id.toString()
        }
      }

      // 2. Tìm hoặc Tạo mới Vocabulary Record (Global Lexicon)
      let vocab = await Vocabulary.findOne({
        normalizedLemma: normalizedExpr,
        ...(langId ? { languageId: langId } : {}),
      })

      if (!vocab) {
        try {
          vocab = await Vocabulary.create({
            lemma: trimmedExpr,
            normalizedLemma: normalizedExpr,
            display: trimmedExpr,
            definition: customTranslation || trimmedExpr,
            partOfSpeech: trimmedExpr.includes(' ') ? 'noun' : 'noun',
            examples: contextSentence ? [contextSentence] : [],
            languageId: langId,
            source: 'user_created',
            createdBy: payload.userId,
          })
        } catch (createErr: any) {
          if (createErr.code === 11000) {
            vocab = await Vocabulary.findOne({
              normalizedLemma: normalizedExpr,
              ...(langId ? { languageId: langId } : {}),
            })
          }
          if (!vocab) throw createErr
        }
      }

      // 3. Upsert LearningProgress cho User với userContext & encounters
      const entryType = trimmedExpr.includes(' ') ? 'phrase' : 'word'
      const newEncounter = {
        expression: trimmedExpr,
        contextSentence: contextSentence || null,
        sourceType,
        sourceId: sourceId || null,
        customTranslation: customTranslation || null,
        createdAt: new Date(),
      }

      const userContextData = {
        expression: trimmedExpr,
        normalizedExpression: normalizedExpr,
        entryType,
        sourceLanguageId: langId || null,
        targetLanguageId: targetLanguageId || null,
        contextSentence: contextSentence || null,
        customTranslation: customTranslation || null,
        personalNote: personalNote || null,
        sourceType,
        sourceId: sourceId || null,
      }

      const nextReviewDate = new Date()

      const progress = await LearningProgress.findOneAndUpdate(
        {
          userId: payload.userId,
          learningObjectId: vocab._id,
          loType: 'vocabulary',
        },
        {
          $set: {
            userContext: userContextData,
            status: 'published',
            updatedBy: payload.userId,
          },
          $push: {
            'userContext.encounters': newEncounter,
          },
          $setOnInsert: {
            learningStrategy: 'fsrs',
            strategyState: { state: 'new', reps: 0, lapses: 0, stability: 1, difficulty: 5 },
            masteryLevel: 0,
            reviewCount: 0,
            nextReviewAt: nextReviewDate,
            firstReviewedAt: new Date(),
            createdBy: payload.userId,
          },
        },
        { upsert: true, new: true }
      )

      return NextResponse.json({
        success: true,
        message: `Đã lưu "${trimmedExpr}" vào sổ từ vựng cá nhân`,
        progressId: progress._id.toString(),
        vocabularyId: vocab._id.toString(),
      })
    } catch (err: any) {
      console.error('[API /api/v1/learning/vocabulary/quick-save] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi khi lưu từ vựng' },
        { status: 500 }
      )
    }
  },
  { roles: ['student', 'teacher', 'admin'] }
)
