# Quiz Module (`lib/modules/quiz/`)

Manages quizzes, sessions, question bank integration, quiz imports, and schema diagnostics.

## Structure

```
quiz/
├── models/
│   ├── Category.ts            # Category (name)
│   ├── Quiz.ts                # Quiz (embedded Questions, course_code, mix_config)
│   ├── QuizSession.ts         # QuizSession (user_answers, questions_cache, score)
│   ├── QuizComment.ts         # QuizComment (quiz_id, user_id, content)
│   ├── Question.ts            # Question standalone
│   ├── QuestionBank.ts        # QuestionBank (question_id hash, usage_count, conflicts)
│   ├── PinnedQuestion.ts      # PinnedQuestion (student_id, question_id, bookmarking)
│   └── MigrationLog.ts        # Migration tracking
├── types/
│   ├── quiz.ts                # IQuestion, IQuiz, ICategory, form types
│   └── session.ts             # UserAnswer, IQuizSession, FlashcardStats
├── schemas/
│   ├── quiz.ts                # QuestionSchema, CreateQuizSchema, SubmitAnswerSchema...
│   └── category.ts            # CategorySchema, CreateCategorySchema...
├── services/
│   ├── IUserService.ts        # Cross-module interface (implemented by auth module)
│   └── question-usage.service.ts # Tracks question bank usage and occurrences
├── constants/
│   └── mix-quiz.ts            # MIX_QUIZ_MAX_SELECT, rate limits...
├── utils/
│   ├── ast-normalizer.ts      # Normalizes markdown/HTML math and text AST
│   ├── mix-quiz-processor.ts  # Shuffles and mixes questions from multiple quizzes
│   ├── question-selection-helper.ts # Smart question selection algorithm
│   └── quiz-similarity.ts     # Computes cosine similarity between quizzes
├── quiz-engine.ts             # Server-side answer processing
├── session-api.ts             # Session management API
├── session-utils.ts           # Session utilities
├── question-id-generator.ts   # SHA-256 question ID generation
├── question-validator.ts      # Question validation
├── feedback-utils.ts          # Feedback helpers
├── quiz-analyzer.ts           # Validation error codes + analysis
├── index.ts                   # registerModel() bootstrap (8 models)
├── quiz-import/               # Import sub-module
│   ├── index.ts               # buildQuizImportPreview() pipeline
│   ├── parser.ts              # parseImportPayload()
│   ├── normalizer.ts          # normalizeImportedQuiz()
│   ├── validator.ts           # validateImportedQuiz()
│   ├── duplicate-checker.ts   # Duplicate detection
│   └── types.ts               # Import types
└── __tests__/
```

## Quiz Engine (`quiz-engine.ts`)

### Modes

| Mode | Behavior |
|------|----------|
| **Immediate** | Real-time grading, displays `correct_answer` + `explanation` |
| **Review** | Answers hidden until final submission |
| **Flashcard** | Client-managed deck, server saves `flashcard_stats` |

### Server-Side Processing
- Never trust client-provided state
- Uses `questions_cache` stored in session document (zero quiz DB queries during active exams)
- Maps display index $\rightarrow$ actual index via `question_order` array
- Exact set match validation for multiple-select answers

### Atomic Session Completion
```typescript
// Race condition prevention
findOneAndUpdate({ _id: sessionId, status: { $ne: 'completed' } }, update)
// Only first submit succeeds; concurrent submits receive HTTP 409 Conflict
```

## Question ID Generation

```typescript
// question-id-generator.ts
generateQuestionId(text, options): string
// SHA-256 hash of: text + sorted(options)
// Same question → same ID regardless of option order

generateQuestionFingerprint(text, options, correctAnswer, type, topic): string
// SHA-256 hash of: text + sorted(options) + sorted(correctAnswer) + type + topic
// Exact deduplication (same question + same answer = same fingerprint)
```

## Question Bank Manager

### Conflict Detection
```
checkQuestionInBank(categoryId, question):
  Layer 1: question_id hash match
  Layer 2: Compare answers by option TEXT (not index)
  → same_answer / different_answer / no_conflict
```

### Sync Flow
```
syncQuestionsToBank(quizId, categoryId, questions):
  For each question:
    1. Generate question_id
    2. Upsert to QuestionBank
    3. Update used_in_quiz_ids, usage_count
    4. Mark has_conflicts if conflict detected
```

## Quiz Import Pipeline

```
Input (JSON/TXT) → parseImportPayload() → normalizeImportedQuiz()
                                         → validateImportedQuiz()
                                         → buildQuizImportPreview()
```

### Validation Error Codes
```
MISSING_TITLE, MISSING_CATEGORY, MISSING_QUESTIONS,
NO_QUESTIONS, INVALID_QUESTION_TEXT, MISSING_OPTIONS,
INSUFFICIENT_OPTIONS, MISSING_CORRECT_ANSWER, INVALID_PRICE,
INVALID_CATEGORY_FORMAT, EXCEEDS_BATCH_LIMIT,
MALFORMED_JSON, EMPTY_PAYLOAD, FILE_TOO_LARGE
```

## Quiz Schema (Mongoose)

### Indexes
- `{ category_id, status, studentCount: -1 }` — Explore catalog listing
- Text: `{ title, course_code }` — full-text search
- Unique partial: `{ created_by, course_code }` where `is_saved_from_explore != true`
- `{ expires_at }` TTL — auto-deletes temporary mixed quizzes

### Pre-save Hooks
- `course_code` $\rightarrow$ `.trim().toUpperCase()`
- Auto-generate `question_id` for questions lacking an ID

## Mix Quiz

```
POST /api/sessions/mix
  → Create temporary Quiz (is_temp=true, expires_at TTL)
  → Create session with is_temp=true
  → Concurrent quota check: { student_id, is_temp, expires_at } index
```

## Cross-Module Interface

```typescript
// IUserService — defined in quiz module, implemented by auth module
interface IUserService {
  getUsernames(userIds: string[]): Promise<Map<string, string>>
}
```
