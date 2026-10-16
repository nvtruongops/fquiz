# 📐 FQuiz — Technical Design Specification (`docs/DESIGN.md`)

> **Version**: 2.0.0 (Pure Symmetrical Monorepo Architecture)  
> **Tech Stack**: Next.js 16 App Router, TypeScript 5, Mongoose 9 / MongoDB Atlas, React 18, Tailwind CSS 3, GSAP.

---

## 1. System Design Overview

The **FQuiz** platform is designed following a **Pure Symmetrical Turborepo Monorepo** architecture:
- **Applications**: `apps/web` (Students, Teachers, Guests, Community / Port 3000) and `apps/admin` (System Admin Portal / Port 3001).
- **Shared Packages**: `@fquiz/database`, `@fquiz/models`, `@fquiz/auth`, `@fquiz/ui`, `@fquiz/config-typescript`.

---

## 2. Database Design & Data Models (`@fquiz/models`)

All entities extend `IBaseEntity` and are centrally defined within `@fquiz/models`:

### 2.1. Base Entity Standard (`IBaseEntity`)
```typescript
export interface IBaseEntity {
  _id: string | Types.ObjectId
  createdAt: Date
  updatedAt: Date
  createdBy?: string | Types.ObjectId
  updatedBy?: string | Types.ObjectId
  deletedAt?: Date | null
  status?: 'draft' | 'pending' | 'published' | 'archived' | 'deleted'
}
```

### 2.2. Core Model Catalog
1. **`User` (`packages/models/src/models/User.ts`)**:
   - `username` (3–30 characters), `email`, `password_hash` (`select: false` enforced at schema level), `role` (`student`, `teacher`, `admin`, `dev`), `avatar_url`, `token_version`.
2. **`Category` (`packages/models/src/models/Category.ts`)**:
   - `name`, `description`, `slug` (`sparse: true`), `owner_id`, `is_public`, `status`, `type`.
3. **`Quiz` & `Question` (`packages/models/src/models/Quiz.ts`, `Question.ts`)**:
   - `title`, `category_id`, `course_code`, `creator_id`, `questions` (Embedded array), `question_refs` (Standalone question references).
   - Each question contains: `question_id`, `text` (up to 10,000 characters), `options`, `correct_answer`, `explanation`, `image_url`.
4. **`QuizSession` (`packages/models/src/models/QuizSession.ts`)**:
   - `user_id` (or null for Guest sessions), `quiz_id`, `mode` (`immediate`, `review`, `flashcard`), `status` (`in_progress`, `completed`), `questions_cache` (Snapshot of questions upon session creation), `answers`, `score`, `duration_minutes`.
5. **`QuestionBank` (`packages/models/src/models/QuestionBank.ts`)**:
   - `question_id`, `text`, `options`, `correct_answer`, `category_id`, `usage_count`, `has_conflicts`, `conflict_notes`, text index `{ text: 'text' }`.
6. **`PinnedQuestion` (`packages/models/src/models/PinnedQuestion.ts`)**:
   - `student_id`, `course_code`, `text`, `options`, `correct_answer`, `explanation`, `image_url`. Compound unique index `{ student_id: 1, text: 1, course_code: 1 }`.
7. **`AIAsset` (`packages/models/src/models/AIAsset.ts`)**:
   - `requestHash` (Unique SHA-256 index), `responseHash`, `aiProvider`, `promptType`, `payload`, `status`. Extends `BaseEntityFields`.
8. **`Classroom`, `QuizAssignment`, `QuizAssignmentProgress`, `Post`, `SiteSettings`, `Feedback`, `MigrationLog`**:
   - Virtual classrooms, assignment workflows, community forums, system configurations, and migration history logs.

---

## 3. Quiz Engine Architecture

The Quiz Engine operates under **Server-Authoritative** guarantees:

1. **3 Quiz Modes**:
   - **`Immediate` (Practice Mode)**: Instant right/wrong scoring and detailed step-by-step explanations upon submitting each choice.
   - **`Review` (Exam Mode)**: Transient answer collection during the test; comprehensive scoring and review displayed only upon final submission.
   - **`Flashcard` (Spaced Repetition)**: 3D interactive flashcards displaying prompts on the front face and solutions/explanations on the reverse face.
2. **Question Snapshotting (`questions_cache`)**:
   - Upon session creation, questions are snapshotted into `session.questions_cache`. Subsequent modifications to the parent quiz never corrupt active examination sessions.
3. **Race Condition & Double-Submit Prevention**:
   - Exam finalization utilizes atomic queries:
     ```typescript
     const session = await QuizSession.findOneAndUpdate(
       { _id: sessionId, status: { $ne: 'completed' } },
       { $set: { status: 'completed', completed_at: new Date() } },
       { new: true }
     )
     ```
4. **Question Hashing Algorithms**:
   - `generateQuestionId(text, options)`: SHA-256 hash of question text + options (excluding answers). Used for Conflict Detection.
   - `generateQuestionFingerprint(text, options, answer, courseCode)`: Comprehensive SHA-256 fingerprint for absolute deduplication across quizzes.

---

## 4. Artificial Intelligence Pipeline (AI Pipeline)

1. **AI Content Service**:
   - 11 prompt templates generating questions, flashcards, vocabulary, grammar exercises, and reading comprehension passages.
   - SHA-256 deduplication via `AIAsset` prior to invoking external Gemini API calls.
   - Structured JSON validation enforced via Zod Schemas.
2. **Quiz AI Assistant**:
   - Real-time exam assistant providing Intent Resolution, Context Packaging, Similar Question Retrieval, and Confidence Scoring.

---

## 5. Module Boundaries & Database Standards

1. **No Cross-Module Model Imports**: Feature modules across `apps/web` and `apps/admin` never cross-import models directly. All models are consumed through `@fquiz/models`.
2. **Mongoose `.populate()` is Forbidden**: All inter-collection data relationships are resolved via Application-Level joins using batch `$in` queries.
3. **Lazy Model Registration**: Schemas are registered via `ModelRegistry`, eliminating `MissingSchemaError` in serverless Next.js runtimes.
