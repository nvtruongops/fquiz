# Learning Module (`lib/modules/learning/`)

Module quản lý lộ trình học ngôn ngữ với DI container, Repository pattern, và FSRS spaced repetition.

## Cấu trúc

```
learning/
├── models/                        # 15 Mongoose models (all IBaseEntity)
│   ├── Language.ts                # Language (code, name, isActive)
│   ├── Topic.ts                   # Topic (slug, path, parent, order)
│   ├── Course.ts                  # Course (languageId, topicId, cefrLevel)
│   ├── Module.ts                  # Module (courseId, order)
│   ├── Lesson.ts                  # Lesson (moduleId, type, prerequisite)
│   ├── Vocabulary.ts              # Vocabulary (lemma, partOfSpeech, cefrLevel)
│   ├── GrammarPattern.ts          # GrammarPattern (name, pattern, explanation)
│   ├── Sentence.ts                # Sentence (text, checksum, source)
│   ├── Paragraph.ts               # Paragraph (lessonId, content, order)
│   ├── LearningTag.ts             # Tagging system
│   ├── LearningProgress.ts        # Progress (userId, learningObjectId, fsrsState)
│   ├── SentenceVocabulary.ts      # JOIN: sentence ↔ vocabulary
│   ├── GrammarSentence.ts         # JOIN: grammar ↔ sentence
│   └── ParagraphSentence.ts       # JOIN: paragraph ↔ sentence (with order)
├── repositories/                  # 10 repositories (leann queries)
│   ├── language.repository.ts
│   ├── topic.repository.ts
│   ├── course.repository.ts
│   ├── module.repository.ts
│   ├── lesson.repository.ts
│   ├── vocabulary.repository.ts
│   ├── grammar.repository.ts
│   ├── sentence.repository.ts
│   ├── paragraph.repository.ts
│   ├── learning-progress.repository.ts
│   └── sentence-read.repository.ts  # Read-only: batch joins 5 collections
├── services/                      # 5 services
│   ├── vocabulary.service.ts
│   ├── sentence.service.ts
│   ├── learning-progress.service.ts
│   ├── lesson-learning.service.ts
│   └── course-learning.service.ts
├── schemas/
│   └── learning.ts               # Zod schemas (106 lines)
├── types/
│   └── learning.ts               # All interfaces (234 lines)
├── events/
│   └── learning-events.ts        # 9 event types
├── review-engine.ts              # FSRS wrapper (fsrs.js)
├── search-service.ts             # Full-text + semantic search ($vectorSearch)
├── index.ts                      # registerModel() bootstrap (15 models)
└── __tests__/
    ├── integration/               # End-to-end tests
    └── models/                    # Unit tests
```

## Architecture

```
API Route Handlers
       │
       ▼
   Services (5)         ←── DI Container resolves repos + providers
       │
       ▼
   Repositories (10)    ←── Mongoose models với .lean()
       │
       ▼
   Models (15)          ←── IBaseEntity + BaseEntityFields
```

## Key Patterns

### No Cross-Module Imports
Learning module chỉ import model của chính nó. Không import từ quiz, auth, community.

### Application-Level Joins
`SentenceReadRepository.getSentenceWithRelations()` batch queries 5 collections với `$in`:
```
Sentence → SentenceVocabulary → Vocabulary
         → GrammarSentence → GrammarPattern
         → ParagraphSentence → Paragraph
```

### DI Container Wiring
Tất cả repositories và services được wire trong `lib/core/di/index.ts`:

```typescript
container.register(LanguageRepository, () => new LanguageRepository())
container.register(CourseLearningService, () => new CourseLearningService(
  container.resolve(CourseRepository),
  container.resolve(ModuleRepository),
  container.resolve(LessonRepository),
  container.resolve(LearningProgressRepository),
  container.resolve(ICache)
))
```

### Events
9 event types defined in `learning-events.ts`:
- `VocabularyCreated`, `SentenceVerified`, `LessonCompleted`
- `AIAssetGenerated`, `CourseEnrolled`, `ReviewSubmitted`
- `ProgressUpdated`, `AchievementUnlocked`, `LearningStreakUpdated`

## FSRS Review Engine

```typescript
class ReviewEngine {
  getInitialState(): FSRSState
  calculateNext(state: FSRSState, rating: Rating): {
    state: FSRSState; retrievability: number
  }
}

// Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy
// States: 0=New, 1=Learning, 2=Review, 3=Relearning
```

Wraps `fsrs.js` library. `LearningProgressService.recordReview()` uses this engine.

## Services

| Service | Key Methods |
|---------|------------|
| `VocabularyService` | `findByLemma`, `create` (emits event), `bulkCreate` |
| `SentenceService` | `getWithRelations`, `createWithVocabLinks` |
| `LearningProgressService` | `getDueReviews`, `recordReview`, `getDetailedAnalytics` |
| `LessonLearningService` | `loadLesson` (orchestrated + cached), `completeLesson` |
| `CourseLearningService` | `getCourseStructure` (cached), `getRoadmap` (prerequisite-aware) |

## SearchService

```typescript
class SearchService {
  search(query, options): Promise<SearchResult[]>
  semanticSearch(query, languageId): Promise<SearchResult[]>  // $vectorSearch
  autocomplete(prefix, options): Promise<string[]>
}
```

Notable: `SearchService` directly imports Quiz model (cross-module exception for search aggregation).

## Base Entity

All 15 learning models extend `IBaseEntity` + `BaseEntityFields`:
- `status`: draft/pending/published/archived/deleted
- `createdBy`, `updatedBy`, `deletedAt` — soft delete support
- `schemaVersion`, `contentVersion` — versioning
- `metadata` — searchKeywords, normalizedText, embeddingStatus, tags

## Testing

```bash
npm run test -- --testPathPattern="learning"
```
- Unit: repository methods, service logic, FSRS engine
- Integration: `__tests__/integration/` — lesson loading, review flow
