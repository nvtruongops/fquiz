import { z } from 'zod'
import { MongoIdSchema, stripHtml } from '@/lib/core/schemas/common'

const CEFRLevelEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
const SourceEnum = z.enum(['manual', 'ai_generated', 'imported', 'seed', 'user_created'])

// ============================================
// COURSE SCHEMAS
// ============================================
export const CreateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).transform(stripHtml),
  description: z.string().max(1000).transform(stripHtml).optional(),
  prerequisites: z.array(MongoIdSchema).optional(),
  publishedVersion: z.number().int().min(1).default(1),
  draftVersion: z.number().int().min(1).default(1),
  // DomainMetadata
  languageId: MongoIdSchema,
  cefrLevel: CEFRLevelEnum.optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  tags: z.array(MongoIdSchema).optional(),
  source: SourceEnum.optional().default('manual'),
})

export const UpdateCourseSchema = CreateCourseSchema.partial()

// ============================================
// LESSON SCHEMAS
// ============================================
export const CreateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).transform(stripHtml),
  objective: z.string().max(500).transform(stripHtml).optional(),
  learningObjective: z.string().max(1000).transform(stripHtml).optional(),
  moduleId: MongoIdSchema,
  order: z.number().int().min(0),
  prerequisites: z.array(MongoIdSchema).optional(),
  cefrLevel: CEFRLevelEnum.optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
})

export const UpdateLessonSchema = CreateLessonSchema.partial()

// ============================================
// VOCABULARY SCHEMAS
// ============================================
export const CreateVocabularySchema = z.object({
  lemma: z.string().min(1, 'Lemma is required').max(100).trim(),
  display: z.string().min(1, 'Display text is required').max(100).trim(),
  ipa: z.string().max(100).optional().nullable(),
  definition: z.string().min(1, 'Definition is required').max(1000).trim(),
  partOfSpeech: z.enum([
    'noun',
    'verb',
    'adjective',
    'adverb',
    'preposition',
    'conjunction',
    'pronoun',
    'interjection',
  ]),
  examples: z.array(z.string().max(500)).default([]),
  // DomainMetadata
  languageId: MongoIdSchema,
  topicId: MongoIdSchema.optional().nullable(),
  cefrLevel: CEFRLevelEnum.optional().nullable(),
  difficulty: z.number().int().min(1).max(10).optional().nullable(),
  frequency: z.number().optional().nullable(),
  tags: z.array(MongoIdSchema).optional(),
  source: SourceEnum.optional().default('manual'),
})

export const UpdateVocabularySchema = CreateVocabularySchema.partial()

// ============================================
// SENTENCE SCHEMAS
// ============================================
export const CreateSentenceSchema = z.object({
  text: z.string().min(1, 'Text is required').max(1000).trim(),
  translation: z.string().max(1000).trim().optional().nullable(),
  // DomainMetadata
  languageId: MongoIdSchema,
  topicId: MongoIdSchema.optional().nullable(),
  cefrLevel: CEFRLevelEnum.optional().nullable(),
  difficulty: z.number().int().min(1).max(10).optional().nullable(),
  tags: z.array(MongoIdSchema).optional(),
  source: SourceEnum.optional().default('manual'),
  vocabLinks: z.array(
    z.object({
      vocabularyId: MongoIdSchema,
      position: z.number().int().min(0).optional(),
      meaningInContext: z.string().max(500).optional(),
    })
  ).optional(),
})

export const UpdateSentenceSchema = CreateSentenceSchema.partial()

// ============================================
// PROGRESS/REVIEW SCHEMAS
// ============================================
export const SubmitReviewSchema = z.object({
  learningObjectId: MongoIdSchema,
  loType: z.enum(['vocabulary', 'grammar', 'sentence', 'lesson']),
  version: z.number().int().min(1).default(1),
  result: z.enum(['correct', 'incorrect', 'partial']),
  strategy: z.enum(['fsrs', 'sm2', 'manual', 'ai']).default('manual'),
})
