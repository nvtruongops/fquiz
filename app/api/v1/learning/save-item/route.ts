import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { parseJsonBody, validationErrorResponse } from '@/lib/core/api-helpers'
import { Language } from '@/lib/modules/learning/models/Language'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import { Sentence } from '@/lib/modules/learning/models/Sentence'
import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import type { JWTPayload } from '@/lib/modules/auth/auth'

const SaveItemSchema = z.object({
  loType: z.enum(['vocabulary', 'sentence', 'grammar']),
  languageCode: z.string().default('English'),
  data: z.object({
    lemma: z.string().optional(),
    display: z.string().optional(),
    ipa: z.string().optional(),
    definition: z.string().optional(),
    partOfSpeech: z.string().optional(),
    examples: z.array(z.string()).optional(),
    cefrLevel: z.string().optional(),
    text: z.string().optional(),
    translation: z.string().optional(),
    pattern: z.string().optional(),
    explanation: z.string().optional(),
  }),
})

/**
 * POST /api/v1/learning/save-item
 * Allows students, teachers, and admins to save AI-generated vocabulary/sentence/grammar
 * into system DB and automatically schedule for SRS Flashcard review.
 */
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const body = await parseJsonBody(req)
      if (body instanceof NextResponse) return body

      const parsed = SaveItemSchema.safeParse(body)
      if (!parsed.success) {
        return validationErrorResponse(parsed.error)
      }

      const { loType, languageCode, data } = parsed.data

      // 1. Resolve Language
      const codeValid = /^[a-zA-Z]{2,5}$/.test(languageCode)
      const codeClean = codeValid ? languageCode.toLowerCase() : languageCode.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'en'
      const escaped = codeClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      let lang = await Language.findOne({
        $or: [
          { code: codeClean },
          { name: { $regex: `^${escaped}$`, $options: 'i' } },
        ],
      })

      if (!lang) {
        const langCodeClean = languageCode.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'en'
        lang = await Language.create({
          code: langCodeClean,
          name: languageCode,
          nativeName: languageCode,
          status: 'published',
        })
      }

      let learningObjectId = ''
      let itemDoc: unknown = null

      // 2. Create or Find Learning Object
      if (loType === 'vocabulary') {
        const rawLemma = (data.lemma || data.display || data.text || 'word').trim()
        const normalizedLemma = rawLemma.toLowerCase()

        let vocab = await Vocabulary.findOne({ languageId: lang._id, normalizedLemma })
        if (!vocab) {
          vocab = await Vocabulary.create({
            languageId: lang._id,
            lemma: rawLemma,
            display: data.display || rawLemma,
            ipa: data.ipa || '',
            definition: data.definition || rawLemma,
            partOfSpeech: (data.partOfSpeech as any) || 'noun',
            examples: data.examples || [],
            cefrLevel: (data.cefrLevel as any) || 'A2',
            source: 'ai',
            status: 'published',
          })
        }
        learningObjectId = vocab._id.toString()
        itemDoc = vocab
      } else if (loType === 'sentence') {
        const rawText = (data.text || data.lemma || 'Sentence text').trim()
        const checksum = createHash('sha256').update(rawText).digest('hex')

        let sentence = await Sentence.findOne({ languageId: lang._id, checksum })
        if (!sentence) {
          sentence = await Sentence.create({
            languageId: lang._id,
            text: rawText,
            translation: data.translation || rawText,
            difficulty: (data.cefrLevel as any) || 'A2',
            checksum,
            source: 'ai',
            status: 'published',
          })
        }
        learningObjectId = sentence._id.toString()
        itemDoc = sentence
      } else if (loType === 'grammar') {
        const rawPattern = (data.pattern || data.lemma || 'Grammar pattern').trim()

        let grammar = await GrammarPattern.findOne({ languageId: lang._id, pattern: rawPattern })
        if (!grammar) {
          grammar = await GrammarPattern.create({
            languageId: lang._id,
            pattern: rawPattern,
            explanation: data.explanation || data.definition || rawPattern,
            examples: data.examples || [],
            cefrLevel: (data.cefrLevel as any) || 'A2',
            status: 'published',
          })
        }
        learningObjectId = grammar._id.toString()
        itemDoc = grammar
      }

      // 3. Upsert LearningProgress to schedule for SRS Flashcard
      const progressRepo = new LearningProgressRepository()
      const progress = await progressRepo.upsert(payload.userId, learningObjectId, loType, 1, {
        learningStrategy: 'fsrs',
        masteryLevel: 0,
        reviewCount: 0,
        firstReviewedAt: new Date(),
        lastReviewedAt: new Date(),
        nextReviewAt: new Date(), // due immediately
        status: 'published',
      })

      return NextResponse.json({
        success: true,
        item: itemDoc,
        progress,
      })
    } catch (err: any) {
      console.error('[API /api/v1/learning/save-item] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi lưu bài học vào thẻ ghi nhớ' },
        { status: 500 }
      )
    }
  },
  { roles: ['student', 'teacher', 'admin'] }
)
