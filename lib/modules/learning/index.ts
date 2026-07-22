/**
 * Learning Module Bootstrap — Đăng ký tất cả model trong module learning.
 * Sprint 1: Language, Topic, Course, Module, Lesson, LearningTag
 * Sprint 2: Vocabulary, GrammarPattern, Sentence, Paragraph,
 *           SentenceVocabulary, GrammarSentence, ParagraphSentence
 */
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { LearningProgress } from './models/LearningProgress'

registerModel(() => {
  // Sprint 1
  import('./models/Language')
  import('./models/Topic')
  import('./models/Course')
  import('./models/Module')
  import('./models/Lesson')
  import('./models/LearningTag')
  // Sprint 2
  import('./models/Vocabulary')
  import('./models/GrammarPattern')
  import('./models/Sentence')
  import('./models/Paragraph')
  import('./models/SentenceVocabulary')
  import('./models/GrammarSentence')
  import('./models/ParagraphSentence')
  // Sprint 3
  import('./models/LearningProgress')
})

registerUserCleanupHandler('learning', async (userId: string) => {
  await LearningProgress.deleteMany({ createdBy: userId })
})
