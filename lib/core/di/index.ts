export { Container } from './container'

import { Container } from './container'
import { InMemoryEventBus } from '@/lib/core/events/in-memory-event-bus'
import { InMemoryCache } from '@/lib/core/cache/in-memory-cache'
import { AtlasSearchProvider } from '@/lib/core/search/atlas-search-provider'
import { GeminiProvider } from '@/lib/core/ai/gemini-provider'

import { LanguageRepository } from '@/lib/modules/learning/repositories/language.repository'
import { TopicRepository } from '@/lib/modules/learning/repositories/topic.repository'
import { CourseRepository } from '@/lib/modules/learning/repositories/course.repository'
import { ModuleRepository } from '@/lib/modules/learning/repositories/module.repository'
import { LessonRepository } from '@/lib/modules/learning/repositories/lesson.repository'
import { ParagraphRepository } from '@/lib/modules/learning/repositories/paragraph.repository'
import { SentenceRepository } from '@/lib/modules/learning/repositories/sentence.repository'
import { VocabularyRepository } from '@/lib/modules/learning/repositories/vocabulary.repository'
import { GrammarRepository } from '@/lib/modules/learning/repositories/grammar.repository'
import { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import { SentenceReadRepository } from '@/lib/modules/learning/repositories/sentence-read.repository'

import { VocabularyService } from '@/lib/modules/learning/services/vocabulary.service'
import { SentenceService } from '@/lib/modules/learning/services/sentence.service'
import { LearningProgressService } from '@/lib/modules/learning/services/learning-progress.service'
import { LessonLearningService } from '@/lib/modules/learning/services/lesson-learning.service'
import { CourseLearningService } from '@/lib/modules/learning/services/course-learning.service'

import { AIContentService } from '@/lib/modules/ai/services/ai-content.service'
import { DynamicAIProvider } from '@/lib/core/ai/dynamic-ai-provider'

export const container = new Container()

// Wire Providers
container.registerSingleton('IEventBus', () => new InMemoryEventBus())
container.registerSingleton('ICache', () => new InMemoryCache())
container.registerSingleton('ISearchProvider', () => new AtlasSearchProvider())
container.registerSingleton('IAIProvider', () => new DynamicAIProvider())

// Wire Repositories
container.registerSingleton('LanguageRepository', () => new LanguageRepository())
container.registerSingleton('TopicRepository', () => new TopicRepository())
container.registerSingleton('CourseRepository', () => new CourseRepository())
container.registerSingleton('ModuleRepository', () => new ModuleRepository())
container.registerSingleton('LessonRepository', () => new LessonRepository())
container.registerSingleton('ParagraphRepository', () => new ParagraphRepository())
container.registerSingleton('SentenceRepository', () => new SentenceRepository())
container.registerSingleton('VocabularyRepository', () => new VocabularyRepository())
container.registerSingleton('GrammarRepository', () => new GrammarRepository())
container.registerSingleton('LearningProgressRepository', () => new LearningProgressRepository())
container.registerSingleton('SentenceReadRepository', () => new SentenceReadRepository(
  container.resolve('SentenceRepository'),
  container.resolve('VocabularyRepository'),
  container.resolve('GrammarRepository')
))

// Wire Services
container.registerSingleton('VocabularyService', () => new VocabularyService(
  container.resolve('VocabularyRepository')
))
container.registerSingleton('SentenceService', () => new SentenceService(
  container.resolve('SentenceRepository'),
  container.resolve('VocabularyRepository'),
  container.resolve('GrammarRepository')
))
container.registerSingleton('LearningProgressService', () => new LearningProgressService(
  container.resolve('LearningProgressRepository')
))
container.registerSingleton('LessonLearningService', () => new LessonLearningService(
  container.resolve('LessonRepository'),
  container.resolve('ParagraphRepository'),
  container.resolve('SentenceReadRepository'),
  container.resolve('LearningProgressRepository'),
  container.resolve('ICache'),
  container.resolve('IEventBus')
))
container.registerSingleton('CourseLearningService', () => new CourseLearningService(
  container.resolve('CourseRepository'),
  container.resolve('ModuleRepository'),
  container.resolve('LessonRepository'),
  container.resolve('LearningProgressRepository'),
  container.resolve('ICache')
))
container.registerSingleton('AIContentService', () => new AIContentService(
  container.resolve('IAIProvider'),
  container.resolve('ICache')
))
