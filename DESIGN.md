# DESIGN.md — FQuiz Platform

> Tài liệu thiết kế kỹ thuật, phản ánh trạng thái thực tế của codebase.  
> Cập nhật lần cuối: 2026-07-19

---

## 1. Tổng quan hệ thống

FQuiz là nền tảng học ngôn ngữ và thi trắc nghiệm full-stack, xây dựng trên **Next.js 16 App Router**, triển khai trên **Vercel** (region `sin1`).

- **3 vai trò**: `admin`, `student`, `public` (unauthenticated)
- **3 chế độ thi**: `immediate` (chấm ngay), `review` (nộp cuối), `flashcard` (lật thẻ)
- **Mix Quiz**: trộn câu hỏi từ nhiều quiz/bộ đề
- **Ngân hàng câu hỏi (Question Bank)**: quản lý câu hỏi tái sử dụng, phát hiện conflict đáp án
- **AI Learning**: sinh nội dung học tập (từ vựng, ngữ pháp, câu, đoạn văn, quiz, flashcard) qua Gemini/OpenAI
- **Học ngôn ngữ**: khóa học theo lộ trình CEFR, spaced repetition (FSRS), community
- **Kiến trúc Module**: DI container, Repository pattern, Event bus cho learning module
- Frontend và API nằm trong cùng một Next.js project; database là **MongoDB Atlas** qua Mongoose.

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Vercel (sin1)                                    │
│                                                                              │
│  ┌─────────────────────┐   proxy.ts (Node.js Middleware)                     │
│  │  Next.js App Router │◄──────────────────────────────────────────────────  │
│  │  (RSC + Client)     │                                                     │
│  │                     │                                                     │
│  │  /(auth)/           │   ┌───────────────────────────────────────────────┐ │
│  │  /(student)/        │   │  Next.js API Route Handlers                   │ │
│  │  /(admin)/admin/    │◄──│  /api/**  (Serverless Functions)              │ │
│  │  /quiz/[id]/        │   │                                               │ │
│  │  /explore/          │   │  ┌─────────────────────────────────────────┐  │ │
│  └─────────────────────┘   │  │          DI Container                    │  │ │
│                            │  │  IAIProvider  ICache  ISearchProvider    │  │ │
│                            │  │  IEventBus    Services  Repositories     │  │ │
│                            │  └────────────────┬────────────────────────┘  │ │
│                            └───────────────────┼──────────────────────────┘ │
│                                                │ Mongoose (Singleton)        │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 │
              ┌──────────────────────────────────┼────────────────────────────┐
              │            MongoDB Atlas         │                            │
              │  Collections:                    │                            │
              │  - users, quizzes, quizsessions, │  - languages, topics        │
              │    categories, questionbanks,    │  - courses, modules, lessons│
              │    quizcomments, feedbacks       │  - vocabularies, sentences  │
              │  - posts (community)             │  - paragraphs, grammarpatterns│
              │  - emailverifications, loginlogs │  - learningprogresses       │
              │  - sitesettings                  │  - aiassets, ailearninglogs │
              │  - vocabularyembeddings,         │  - learningtags             │
              │    sentenceembeddings            │                             │
              └──────────────────────────────────┴────────────────────────────┘
                                                 │
              ┌──────────────────────────────────┼────────────────────────────┐
              │     Upstash QStash (Background Jobs)                          │
              │  - mail jobs (email verification, reset PW)                   │
              │  - quiz stats sync (studentCount)                             │
              │  - mix quiz temp session cleanup                              │
              └──────────────────────────────────────────────────────────────┘
                                                 │
              ┌──────────────────────────────────┼────────────────────────────┐
              │        External AI Services                                   │
              │  - Gemini API (gemini-2.0-flash-001, text-embedding-004)      │
              │  - OpenAI API (GPT-4o-mini, text-embedding-3-small)           │
              │  - Custom OpenAI-compatible endpoints                         │
              └──────────────────────────────────────────────────────────────┘
```

### External Services

| Service | Vai trò |
|---------|---------|
| **Cloudinary** | Upload và lưu ảnh câu hỏi |
| **Upstash QStash** | Background job queue (mail, stats) |
| **Nodemailer** | Gửi email (SMTP / Gmail App Password) |
| **Vercel** | Hosting, Serverless Functions, Edge Middleware |

---

## 3. Cấu trúc thư mục

```
.
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, Register, Forgot/Reset Password
│   ├── (student)/                # Dashboard, Courses, History, Profile, Settings, My-Quizzes, Create, Community, AI
│   ├── (admin)/admin/            # Users, Quizzes, Categories, Question Bank, Feedback, Settings
│   ├── quiz/[id]/                # Quiz Detail → Session (desktop/mobile/flashcard) → Result
│   ├── explore/                  # Khám phá quiz công khai
│   ├── maintenance/              # Trang bảo trì
│   ├── privacy/, terms/          # Legal pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout (font, providers, toploader)
│   └── api/                      # 80+ API route handlers
│       ├── auth/                 # login, register, logout, me, forgot-password, reset-password, send-code
│       ├── admin/                # quizzes, categories, users, settings, ban/unban
│       ├── student/              # profile, saved quizzes, community
│       ├── sessions/             # CRUD + answer/submit/result/activity
│       ├── question-bank/        # list, check, check-usage, sync
│       ├── courses/              # list, quizzes by code
│       ├── search/               # full-text search
│       ├── history/              # list + detail
│       ├── feedback/             # submit feedback
│       ├── import/               # import quiz từ JSON/TXT
│       ├── community/            # posts (CRUD + comments)
│       ├── jobs/                 # QStash job handlers (mail, quiz-stats)
│       ├── security/             # csp-report
│       └── v1/                   # Public API v1, AI, learning, explore, analytics, search
├── components/
│   ├── quiz/
│   │   ├── QuizEditor.tsx        # Editor tổng hợp (32KB — core component)
│   │   ├── detail/               # Quiz detail: header, stats, comments, action card
│   │   ├── explore/              # Explore: content grid, sidebar, display, search
│   │   ├── question-bank/        # QB: browser, warning, conflict dialog, import
│   │   ├── session/              # Session: layout, display, modals, header, sidebar, flashcard
│   │   ├── editor/               # Editor sub-components: control panel, metadata, question card
│   │   └── shared/               # Dùng chung: loader, timer, badge, upload, tabs
│   ├── admin/                    # Admin-specific components
│   ├── flashcard/                # Flashcard viewer
│   ├── layout/                   # Sidebar, navbar, mobile nav
│   └── shared/
│       ├── ui/                   # shadcn/ui primitives (button, dialog, select, tabs…)
│       ├── providers/            # QueryClientProvider
│       ├── landing/              # Landing page sections
│       ├── utils/                # Utility components
│       ├── ErrorBoundary.tsx     # Error boundary cho session pages
│       └── UnauthorizedView.tsx  # 403 view
├── lib/
│   ├── core/
│   │   ├── db/
│   │   │   ├── mongodb.ts        # Connection pool singleton + DNS SRV fallback
│   │   │   ├── model-registry.ts # Lazy model registration → bootstrapModels()
│   │   │   └── base-schema.ts    # BaseEntityFields (Mongoose schema fragment)
│   │   ├── di/                   # DI Container (lightweight, no decorators)
│   │   │   ├── container.ts      # Container class: register, resolve, singleton/transient
│   │   │   └── index.ts          # Wiring: providers + repositories + services
│   │   ├── ai/                   # AI Provider abstraction
│   │   │   ├── ai-provider-interface.ts  # IAIProvider (generate, embed, moderate)
│   │   │   ├── gemini-provider.ts        # GeminiProvider (gemini-2.0-flash-001)
│   │   │   ├── openai-provider.ts        # OpenAIProvider (GPT-4o-mini)
│   │   │   └── dynamic-ai-provider.ts    # DynamicAIProvider (runtime LLM switching)
│   │   ├── events/               # Event bus system
│   │   │   ├── event-bus-interface.ts    # IEventBus (domain/integration events)
│   │   │   ├── in-memory-event-bus.ts    # InMemoryEventBus implementation
│   │   │   ├── event-bus.ts              # Legacy EventBus (simple on/emit)
│   │   │   └── domain-event.ts           # IDomainEvent, DomainEventType
│   │   ├── cache/                # In-memory cache with TTL + tag invalidation
│   │   ├── search/               # Search provider abstraction (Atlas Search)
│   │   ├── security/             # csrf.ts, rate-limit/
│   │   ├── queue/qstash.ts       # publishJob() — Upstash QStash wrapper
│   │   ├── mail/mail.ts          # Nodemailer + email templates
│   │   ├── types/                # base-entity.ts, domain-metadata.ts
│   │   ├── schemas/common.ts     # Zod shared schemas
│   │   ├── constants/            # Cookie names, cookie max age, etc.
│   │   ├── validation/           # Input validation helpers
│   │   └── utils/                # cn(), logger (Pino), formatters, cache invalidation
│   └── modules/
│       ├── auth/                 # User, EmailVerification, LoginLog, SiteSettings, Feedback
│       │                         # auth.ts, authz.ts, dal.ts, with-auth.ts, UserService
│       ├── quiz/                 # Quiz, QuizSession, Category, QuestionBank, QuizComment
│       │                         # quiz-engine.ts, question-bank-manager.ts, session-api.ts
│       │                         # quiz-import/, question-id-generator.ts
│       ├── ai/                   # AIAsset, AILearningLog
│       │                         # AIContentService, prompt registry (11 prompt types)
│       │                         # Dedup (requestHash), Zod validation, event emission
│       ├── learning/             # Language, Topic, Course, Module, Lesson, Vocabulary,
│       │                         # GrammarPattern, Sentence, Paragraph, LearningProgress,
│       │                         # LearningTag + 3 join tables
│       │                         # 10 repositories, 5 services, FSRS review engine
│       │                         # DI-wired, IBaseEntity, application-level joins
│       └── community/            # Post (with embedded Comments)
│                                 # validatePostRequest utility
├── hooks/
│   ├── quiz/                     # useSubmitAnswer, useFlashcardSession, useQuizSessionQueries,
│   │                             # useSessionHydration, useSessionAnswerSync, useSessionActivityTracking,
│   │                             # useSessionFinalize, useQuestionBankCheck, useQuestionBankWarning
│   ├── auth/useAuth.ts
│   └── shared/useDebounce.ts
├── store/
│   ├── quiz/quiz-session.store.ts  # Zustand — quiz session state (persisted to localStorage)
│   └── shared/toast-store.ts       # Zustand — toast notifications
├── proxy.ts                        # Next.js Middleware (CORS, JWT, CSRF, maintenance, role routing)
├── scripts/                        # CLI: seed, migrate, audit, perf tests
└── Docs/                           # requirements.md, security.md, ui-colors.md, UI_UX_GUIDE.md
```

---

## 4. Middleware (`proxy.ts`)

File `proxy.ts` export hàm `proxy` được gọi từ `middleware.ts` ở root level. Chạy trên **Node.js runtime** (Next.js 16).

### Pipeline xử lý mỗi request

```
Request
  │
  ├─ 1. Mobile redirect: /quiz/[id]/session/[sid] → /mobile nếu user-agent là mobile
  │
  ├─ 2. CORS preflight (OPTIONS) → 204 + CORS headers
  │
  ├─ 3. Maintenance mode check (DB lookup với cookie cache 30s)
  │      └─ Non-admin → redirect /maintenance hoặc 503 JSON
  │
  ├─ 4. DEPLOY_TARGET=api guard (only /api/* paths allowed)
  │
  ├─ 5. Legacy history redirect: /history/[id]?sessionId=X → /history/[id]/X
  │
  ├─ 6. CSRF validation (mutations POST/PUT/PATCH/DELETE)
  │      └─ Double-submit cookie: csrf-token cookie === x-csrf-token header
  │
  ├─ 7. Ensure CSRF cookie (set nếu chưa có)
  │
  └─ 8. Auth & Role routing
         ├─ Public paths → pass through
         ├─ No token → 401 (API) hoặc redirect /login (page)
         ├─ Invalid JWT → 401 / redirect
         ├─ Admin paths với student role → redirect /dashboard
         ├─ Student paths với admin role → redirect /admin
         └─ /api/admin/* với non-admin → 403
```

### Public paths (no auth required)

```
/, /login, /register, /forgot-password, /reset-password,
/terms, /privacy, /explore,
/quiz/[id]  (detail page — start session requires auth),
/api/security/csp-report,
/api/auth/*, /api/jobs/mail,
/api/v1/public/*, /api/v1/explore/*
```

### CSRF Exempt paths

```
/api/auth/login, /api/auth/register, /api/auth/register/send-code,
/api/auth/forgot-password, /api/auth/reset-password,
/api/auth/logout, /api/jobs/mail
```

### JWT Token Rotation

Middleware thử verify với `JWT_SECRET`, nếu fail thử với `JWT_SECRET_PREV`. Hỗ trợ token rotation không downtime.

---

## 5. Authentication & Authorization

### JWT (jose)

- **Library**: `jose` (Edge-compatible, không phải `jsonwebtoken`)
- **Cookie**: `auth-token` (httpOnly, secure in production)
- **Payload**:

```typescript
interface JWTPayload {
  userId: string
  role: 'admin' | 'student'
  tokenVersion: number
  iat: number
  exp: number
}
```

- **Token versioning**: `token_version` trong User document. Khi admin ban user hoặc user đổi mật khẩu, `token_version` tăng lên — token cũ bị reject.

### withAuth HOF

Pattern bảo vệ API route handlers:

```typescript
// lib/modules/auth/with-auth.ts
export function withAuth<P = any>(
  handler: Handler<P>,
  options: { roles?: string[] } = {}
)

// Usage trong route handlers:
export const GET = withAuth(async (req, { params, payload }) => {
  // payload.userId, payload.role đã được verify
  return NextResponse.json({ data })
}, { roles: ['student'] })
```

### Password Security

- Hash: `bcryptjs` (cost factor 10)
- Reset: token ngẫu nhiên + TTL 1 giờ (`reset_token_expires`)
- Email verification: OTP 6 chữ số trong `emailverifications` collection

---

## 6. Model Registry & DI Container

### Model Registry (`lib/core/db/model-registry.ts`)

Ngăn `MissingSchemaError` trong Next.js Serverless Routes bằng cách lazy-register tất cả Mongoose models:

```typescript
// Mỗi module index.ts gọi registerModel():
// lib/modules/quiz/index.ts
registerModel(() => import('./models/Quiz'))
registerModel(() => import('./models/QuizSession'))
// ... 7 models total

// lib/modules/auth/index.ts
registerModel(() => import('./models/User'))
// ... 5 models total

// lib/modules/learning/index.ts
registerModel(() => import('./models/Language'))
// ... 15 models total

// lib/modules/community/index.ts
registerModel(() => import('./models/Post'))

// lib/modules/ai/index.ts
registerModel(() => import('./models/AIAsset'))
registerModel(() => import('./models/AILearningLog'))
```

`mongodb.ts` static-imports all 5 module indexes, sau đó `connectDB()` gọi `bootstrapModels()` — thực thi tất cả registrations sau khi kết nối thành công.

### DI Container (`lib/core/di/`)

Lightweight container, không decorator, không reflect-metadata:

```typescript
// lib/core/di/container.ts
class Container {
  register<T>(token: symbol, factory: () => T): void          // transient
  registerSingleton<T>(token: symbol, factory: () => T): void  // singleton
  resolve<T>(token: symbol): T
  has(token: symbol): boolean
  reset(): void
}

// lib/core/di/index.ts — Wiring
container.registerSingleton(IEventBus,        () => new InMemoryEventBus())
container.registerSingleton(ICache,           () => new InMemoryCache())
container.registerSingleton(ISearchProvider,  () => new AtlasSearchProvider())
container.registerSingleton(IAIProvider,      () => new DynamicAIProvider())

// 10 learning repositories → transient
container.register(LanguageRepository,        () => new LanguageRepository())
// ...

// 6 services (depends on repos + providers) → transient
container.register(VocabularyService,         () => new VocabularyService(
  container.resolve(VocabularyRepository), container.resolve(IEventBus)))
container.register(AIContentService,          () => new AIContentService(
  container.resolve(IAIProvider), container.resolve(ICache)))
```

**Quy tắc**: Learning module dùng DI cho repos/services. Legacy modules (auth, quiz, community) import trực tiếp.

### Core Infrastructure

| Component | Interface | Implementation | Purpose |
|-----------|-----------|---------------|---------|
| **Event Bus** | `IEventBus` | `InMemoryEventBus` | Pub/sub domain + integration events. AIContentService emits `AIAssetGenerated`; LessonLearningService emits `LessonCompleted`. Legacy `EventBus` (simple on/emit) vẫn dùng cho AIContentService và VocabularyService. |
| **Cache** | `ICache` | `InMemoryCache` | In-memory Map với TTL + tag-based invalidation. Dùng cho lesson content cache, course structure cache. |
| **Search** | `ISearchProvider` | `AtlasSearchProvider` | MongoDB Atlas Search. Learning module SearchService dùng cho full-text + semantic search (`$vectorSearch`). |
| **AI Provider** | `IAIProvider` | `DynamicAIProvider` | Runtime LLM switching qua `SiteSettings.llm_config.active_provider`. Routes to GeminiProvider (`gemini-2.0-flash-001`), OpenAIProvider (`GPT-4o-mini`), hoặc custom OpenAI-compatible endpoint. |

---

## 7. Base Entity (`IBaseEntity`)

Tất cả model Phase 2+ (learning, AIAsset) kế thừa `IBaseEntity`:

```typescript
// lib/core/types/base-entity.ts
type EntityStatus = 'draft' | 'pending' | 'published' | 'archived' | 'deleted'

interface IBaseMetadata {
  searchKeywords?: string[]
  normalizedText?: string
  embeddingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  source?: string
  sourceRef?: string
  tags?: string[]
  customFields?: Record<string, unknown>
}

interface IBaseEntity {
  _id: string
  createdAt: Date
  updatedAt: Date
  createdBy: string          // ref: User ObjectId
  updatedBy?: string
  deletedAt?: Date           // soft delete
  deletedBy?: string
  status: EntityStatus
  schemaVersion: number
  contentVersion: number
  metadata: IBaseMetadata
}

// lib/core/db/base-schema.ts — Mongoose schema fragment
const BaseEntityFields = { createdBy, updatedBy, deletedAt, deletedBy,
  status, schemaVersion, contentVersion, metadata }
```

### Domain Metadata (`lib/core/types/domain-metadata.ts`)

```typescript
interface IDomainMetadata {
  languageId?: string       // ref: Language
  languageCode?: string     // denormalized
  topicId?: string          // ref: Topic
  cefrLevel?: CEFRLevel     // A1-C2
  difficulty?: number       // 1-5
  frequency?: number
  tags?: string[]
  source: ContentSource     // manual | ai_generated | ai_assisted | imported
  isVerified: boolean
  verifiedBy?: string
  verifiedAt?: Date
}

interface IAIMetadata {
  aiProvider?: string
  aiModel?: string
  aiPromptVersion?: string
  aiGeneratedBy?: string    // ref: User
  aiGeneratedAt?: Date
  aiVerified: boolean
  aiReviewStatus: AIReviewStatus
  aiGenerationType: AIGenerationType
  aiAssetId?: string
  aiConfidence?: number
}
```

---

## 8. Data Models (MongoDB Collections)

### User

```typescript
interface IUser {
  _id: ObjectId
  username: string            // unique, 3-15 chars, \w+ only
  email: string               // unique, lowercase
  password_hash: string
  avatar_url: string | null
  profile_bio: string | null
  role: 'admin' | 'student'
  status: 'active' | 'banned'
  ban_reason: string | null
  sharing_violations: number
  timezone: string            // default: 'Asia/Ho_Chi_Minh'
  language: 'vi' | 'en'
  notify_email: boolean
  notify_quiz_reminder: boolean
  privacy_share_activity: boolean
  created_at: Date
  reset_token: string | null
  reset_token_expires: Date | null
  token_version: number       // for JWT invalidation
  pinned_categories: string[]
}
```

### Category

```typescript
interface ICategory {
  _id: ObjectId
  name: string    // unique
  created_at: Date
}
```

### Quiz (with embedded Questions)

```typescript
interface IQuestion {
  _id: ObjectId
  question_id?: string    // content-based hash (text + sorted options)
  text: string
  options: string[]
  correct_answer: number[]  // multi-select support
  explanation?: string
  image_url?: string
}

interface IQuiz {
  _id: ObjectId
  title: string
  description: string
  category_id: ObjectId       // ref: Category
  course_code: string         // UPPERCASE, trimmed; unique per (created_by, course_code) — partial index
  questions: IQuestion[]      // embedded
  questionCount: number       // denormalized count
  studentCount: number        // synced via background job
  created_by: ObjectId        // ref: User
  created_at: Date
  status: 'published' | 'draft'
  is_public: boolean
  price: number
  original_quiz_id?: ObjectId // nếu là bản copy từ Explore
  is_saved_from_explore: boolean
  is_temp: boolean            // mix quiz tạm thời (có TTL)
  expires_at?: Date           // TTL index (sparse) — auto-delete temp quizzes
  mix_config?: {
    quiz_ids: ObjectId[]
    question_count: number
    mode: 'immediate' | 'review' | 'flashcard'
    category_id: ObjectId
  }
}
```

**Indexes**:
- `{ category_id, status, studentCount: -1 }` — Explore listing
- Text index: `{ title, course_code }` — full-text search
- Unique partial: `{ created_by, course_code }` where `is_saved_from_explore != true`
- `{ expires_at }` with `expireAfterSeconds: 0` — TTL for temp quizzes

**Pre-save hooks**:
- `course_code` → `.trim().toUpperCase()`
- Auto-generate `question_id` (content hash) cho mỗi câu hỏi chưa có ID

### QuizSession

```typescript
interface UserAnswer {
  question_index: number    // display index (trong question_order)
  answer_index: number      // first selected option
  answer_indexes: number[]  // all selected options (multi-select)
  is_correct: boolean
}

interface FlashcardStats {
  total_cards: number
  cards_known: number
  cards_unknown: number
  time_spent_ms: number
  current_round: number
}

interface IQuizSession {
  _id: ObjectId
  student_id: ObjectId     // ref: User
  quiz_id?: ObjectId       // ref: Quiz (optional for mix quiz)
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random'
  status: 'preparing' | 'active' | 'completed' | 'paused' | 'expired'
  user_answers: UserAnswer[]
  current_question_index: number
  question_order: number[]           // shuffle index map cho random difficulty
  questions_cache: IQuestion[]       // server-side cache để tránh DB query mỗi lần submit
  score: number
  flashcard_stats?: FlashcardStats
  expires_at?: Date                  // TTL — unset khi session completed
  started_at: Date
  completed_at?: Date
  last_activity_at: Date
  paused_at?: Date
  total_paused_duration_ms: number
  is_temp: boolean                   // mix quiz session
}
```

**Indexes**:
- `{ expires_at }` with `expireAfterSeconds: 0` — MongoDB auto-delete expired active sessions
- `{ student_id, quiz_id }` — student session lookup
- `{ student_id, is_temp, expires_at }` — mix quiz concurrent check

### QuestionBank

```typescript
interface IQuestionBank {
  _id: ObjectId
  category_id: ObjectId     // ref: Category
  question_id: string       // content-based unique hash
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  created_by: ObjectId      // ref: User
  created_at: Date
  updated_at: Date
  usage_count: number
  used_in_quizzes: string[] // course_codes (legacy)
  used_in_quiz_ids: ObjectId[]
  has_conflicts: boolean
  conflict_notes?: string
}
```

**Indexes**:
- `{ category_id, question_id }` unique — 1 câu hỏi chỉ xuất hiện 1 lần trong 1 môn
- Text index: `{ text }` — search
- `{ category_id, usage_count: -1 }` — popular questions

### QuizComment

```typescript
interface IQuizComment {
  _id: ObjectId
  quiz_id: ObjectId         // ref: Quiz
  user_id: ObjectId         // ref: User
  username: string          // denormalized
  content: string
  created_at: Date
  updated_at: Date
}
```

### Community Post (module: community)

```typescript
interface IPost {
  _id: ObjectId
  title: string
  content: string
  authorId: ObjectId        // ref: User
  authorName: string        // denormalized
  tags: string[]
  likes: ObjectId[]         // ref: User[]
  comments: IComment[]      // embedded subdocuments
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**: Text `{ title, tags }`; `{ createdAt: -1 }`.

### AIAsset (module: ai)

```typescript
// Kế thừa IBaseEntity (status, createdBy, updatedBy, deletedAt, metadata...)
interface IAIAsset {
  requestHash: string          // SHA-256 dedup key
  responseHash: string
  aiProvider: string           // 'gemini' | 'openai' | 'custom'
  aiModel: string              // 'gemini-2.0-flash-001' | 'gpt-4o-mini'
  sourceType: AIGenerationType // vocabulary | sentence | paragraph | grammar |
                               // quiz | flashcard | translation | dialogue |
                               // story | example_sentences | writing | writing_eval
  promptTemplate: string       // versioned prompt key
  requestPayload: Record<string, any>
  responsePayload: Record<string, any>  // Zod-validated
  tokensUsed?: number
  costEstimated?: number
}
```

**Indexes**: Unique `{ requestHash, aiProvider }` — dedup trước khi gọi API. `{ status }`, `{ responseHash, sourceType }`, `{ aiProvider, aiModel, createdAt }`.

### AILearningLog (module: ai)

```typescript
interface IAILearningLog {
  _id: ObjectId
  userId: ObjectId
  languageId: ObjectId
  generationType: AIGenerationType
  promptKey: string
  requestPreview: string
  responsePreview: string
  tokensUsed: number
  costEstimated: number
  duration: number           // ms
  createdAt: Date
}
```

### Learning Models (module: learning)

Tất cả model learning đều dùng `IBaseEntity` + `BaseEntityFields`. Kế thừa: `status`, `createdBy`, `updatedBy`, `deletedAt`, `schemaVersion`, `contentVersion`, `metadata`.

**Domain Metadata**: Mỗi content model kèm `IDomainMetadata` (languageId, languageCode, topicId, cefrLevel, source, isVerified) và `IAIMetadata` (aiProvider, aiModel, aiAssetId, aiConfidence) nếu được AI sinh.

**Hierarchy**: `Language → Topic → Course → Module → Lesson`

```typescript
interface ILanguage {
  code: string               // unique: 'en', 'ja', 'zh', 'ko', 'fr'...
  name: string
  nativeName?: string
  isActive: boolean
}

interface ICourse {
  languageId: ObjectId
  topicId: ObjectId
  title: string
  slug: string
  cefrLevel: CEFRLevel      // A1-C2
  order: number
  isPublished: boolean
}

interface ILesson {
  moduleId: ObjectId
  title: string
  order: number
  type: 'vocabulary' | 'grammar' | 'reading' | 'mixed'
  prerequisiteId?: ObjectId  // previous lesson must be completed
  estimatedMinutes: number
}
```

**Content Models**:

```typescript
interface IVocabulary {
  languageId: ObjectId
  lemma: string              // normalized form (lowercase, trim)
  displayForm: string
  partOfSpeech: PartOfSpeech
  definitions: { languageCode: string, text: string }[]
  cefrLevel: CEFRLevel
}

interface IGrammarPattern {
  languageId: ObjectId
  name: string
  pattern: string            // template: "V-{te} + います"
  explanation: string
  examples: { sentence: string, translation: string }[]
  cefrLevel: CEFRLevel
}

interface ISentence {
  languageId: ObjectId
  text: string
  translation?: string
  checksum: string           // SHA-256 dedup
  source: ContentSource
}

interface IParagraph {
  lessonId: ObjectId
  title: string
  content: string
  translation?: string
  order: number
}
```

**Join Tables** (application-level joins, không `.populate()`):

```typescript
interface ISentenceVocabulary {   // sentence ↔ vocabulary
  sentenceId: ObjectId; vocabularyId: ObjectId
}
interface IGrammarSentence {      // grammar ↔ sentence
  grammarId: ObjectId; sentenceId: ObjectId
}
interface IParagraphSentence {    // paragraph ↔ sentence (với order)
  paragraphId: ObjectId; sentenceId: ObjectId; order: number
}
```

**Learning Progress (FSRS)**:

```typescript
interface ILearningProgress {
  userId: ObjectId
  learningObjectId: ObjectId
  learningObjectType: LearningObjectType
  status: 'new' | 'learning' | 'review' | 'mastered'
  fsrsState: {               // FSRS algorithm state
    stability: number; difficulty: number
    elapsedDays: number; scheduledDays: number
    reps: number; lapses: number
    state: number            // 0=New 1=Learning 2=Review 3=Relearning
    lastReview?: Date; due?: Date
  }
  reviewCount: number
  correctCount: number
  incorrectCount: number
  lastReviewAt?: Date
  nextReviewAt?: Date
  masteryLevel: number       // 0.0 — 1.0
}
```

**Indexes**: `{ userId, learningObjectId, learningObjectType }` unique; `{ userId, nextReviewAt }` for due reviews.

### Feedback

```typescript
interface IFeedback {
  _id: ObjectId
  user_id: ObjectId
  username: string
  content: string
  created_at: Date
}
```

### SiteSettings

```typescript
interface ISiteSettings {
  maintenance_mode: boolean
  maintenance_message?: string
  public_access_enabled: boolean
  max_public_quizzes_per_page: number
  rate_limit_enabled: boolean
  rate_limit_max_requests: number
  rate_limit_window_ms: number
  llm_config: {
    active_provider: 'gemini' | 'openai' | 'custom'
    openai: { apiKey: string; baseUrl: string; model: string }
    gemini: { apiKey: string; model: string }
    custom: { apiKey: string; baseUrl: string; model: string }
  }
}
```

---

## 7. Quiz Engine (`lib/modules/quiz/quiz-engine.ts`)

Core logic xử lý câu trả lời phía server. Không bao giờ tin state từ client.

### Immediate Mode

```
Client gửi: POST /api/sessions/[id]/answer { answer_indexes }
                     │
                     ▼
         Load questions_cache từ session (hoặc fetch từ Quiz)
                     │
                     ▼
         Map: display index → actual index (via question_order)
                     │
                     ▼
         Normalize submitted indexes + correct_answer indexes
         isCorrect = exact set match (sorted deduped arrays)
                     │
                     ▼
         Atomic DB update:
           - user_answers (upsert by question_index)
           - current_question_index (advance nếu không phải câu cuối)
           - score (running tally)
           - last_activity_at
                     │
                     ▼
         Response: { isCorrect, correctAnswer, correctAnswers, explanation }
         (Session NOT auto-completed — chờ explicit submit)
```

### Review Mode

```
Tương tự Immediate, NHƯNG:
- Response không bao giờ chứa correct_answer hoặc explanation
- Khi không phải câu cuối: trả về next question (stripped)
- Khi là câu cuối: persist score, trả về { completed: false }
- Session hoàn thành chỉ khi user explicit submit
```

### Flashcard Mode

- Quản lý bởi `useFlashcardSession` hook phía client
- Server chỉ lưu `flashcard_stats` (known/unknown/time)
- Không có scoring như Immediate/Review

### Score Calculation

```typescript
function calculateScore(
  userAnswers: UserAnswer[],
  questions: IQuestion[],
  questionOrder?: number[]
): number
// Đếm số câu đúng — exact set match
// Sử dụng question_order để map display index → actual question
```

### Atomic Session Completion (Race Condition Prevention)

```typescript
async function atomicCompleteSession(sessionId, score, userAnswers, currentIndex)
// findOneAndUpdate với condition: { status: { $ne: 'completed' } }
// Unset expires_at để giữ lại kết quả (không bị TTL xóa)
// Returns false nếu session đã completed trước đó (409)
```

---

## 8. Question Bank Manager (`lib/modules/quiz/question-bank-manager.ts`)

Quản lý ngân hàng câu hỏi dùng chung theo môn học.

### Content-based Question ID

```typescript
// question-id-generator.ts
// ID = sha256-like hash của: text + sorted(options) + sorted(correct_answer)
// Đảm bảo: cùng câu hỏi → cùng ID, bất kể thứ tự lưu
```

### Conflict Detection

```
checkQuestionInBank(categoryId, question):
  Layer 1: Tìm theo question_id (hash match)
  Layer 2: So sánh đáp án theo TEXT của option (không phải index)
           → Tránh false conflict khi options thứ tự khác nhau
  
  Kết quả:
    - { hasConflict: false } → câu mới
    - { hasConflict: true, conflictType: 'same_answer' } → trùng, đáp án giống
    - { hasConflict: true, conflictType: 'different_answer' } → CONFLICT THẬT — cần review
```

### Sync Flow

```
syncQuestionsToBank(quizId, categoryId, questions):
  Với mỗi câu hỏi:
    1. Tính question_id
    2. Upsert vào QuestionBank (findOneAndUpdate with upsert)
    3. Cập nhật used_in_quiz_ids, usage_count
    4. Đánh dấu has_conflicts nếu phát hiện conflict
```

---

## 9. State Management

### Server State — TanStack Query v5

| Query Key | staleTime | gcTime | Mô tả |
|-----------|-----------|--------|-------|
| `['sessions', id]` | 0 | default | Active session — always fresh |
| `['sessions', id, 'questions']` | Infinity | 1h | Questions cache — immutable trong session |
| `['history', page]` | 30s | default | History list |
| `['history', id]` | 1h | 24h | History detail — completed session là immutable |
| `['courses']` | 5min | default | Course list |
| `['search', params]` | 1min | default | Search results |

**Rationale cho `historyDetail` cache dài**: `QuizSession` với `status === 'completed'` là immutable trong DB — score và answers không bao giờ thay đổi. Cache 1 giờ → 0ms load khi xem lại kết quả cũ.

### Client State — Zustand v5

```typescript
// store/quiz/quiz-session.store.ts
interface QuizSessionState {
  // Session identity
  sessionId: string | null
  quizId: string | null
  mode: 'immediate' | 'review' | null

  // Navigation
  currentQuestionIndex: number
  totalQuestions: number

  // Answer tracking (client mirror of server state)
  answeredQuestions: Set<number>
  pendingAnswerIndex: number | null   // optimistic update tracking

  // Immediate mode feedback
  lastAnswerResult: {
    isCorrect: boolean
    correctAnswer: number
    correctAnswers?: number[]
    explanation?: string
  } | null

  // Actions
  initSession, resumeSession, navigateToQuestion, markAnswered,
  optimisticallyMarkAnswered, rollbackOptimisticAnswer, confirmAnswer,
  setLastAnswerResult, resetSession, restoreAnswers
}
```

**Persistence**: `zustand/middleware/persist` → `localStorage`, key `quiz-session`.  
`currentQuestionIndex` **không** persist (luôn restore từ server để tránh stale).  
`answeredQuestions` serialize thành `number[]` vì `Set` không JSON-serializable.

### Optimistic Updates (`useSubmitAnswer`)

```typescript
useMutation({
  onMutate: ({ questionIndex }) => {
    optimisticallyMarkAnswered(questionIndex)  // Question Map đổi màu ngay
  },
  onSuccess: (_, __, { questionIndex }) => {
    confirmAnswer(questionIndex)               // Clear pending state
  },
  onError: (_, __, { questionIndex }) => {
    rollbackOptimisticAnswer(questionIndex)    // Revert nếu API fail
  }
})
```

### Toast State

```typescript
// store/shared/toast-store.ts (Zustand)
// Global toast notifications — không persist
```

---

## 10. Hooks (`hooks/quiz/`)

| Hook | Vai trò |
|------|---------|
| `useSubmitAnswer` | Optimistic answer submission + TQ mutation |
| `useFlashcardSession` | Flashcard state machine (known/unknown/rounds) |
| `useQuizSessionQueries` | Compose TQ queries cho session + questions |
| `useSessionHydration` | Init/resume Zustand store từ server data |
| `useSessionAnswerSync` | Sync answered set từ server vào Zustand |
| `useSessionActivityTracking` | Báo pause/resume → `/api/sessions/[id]/activity` |
| `useSessionFinalize` | Submit bài → `atomicCompleteSession` |
| `useQuestionBankCheck` | Check question conflict với Question Bank |
| `useQuestionBankWarning` | Warning UI khi detect conflict |

---

## 11. API Design

### Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/register/send-code` | Public | Gửi OTP email |
| POST | `/api/auth/register` | Public | Đăng ký (verify OTP) |
| POST | `/api/auth/login` | Public | Login → set auth-token cookie |
| POST | `/api/auth/logout` | Student | Clear cookie |
| GET | `/api/auth/me` | Student | Lấy thông tin user hiện tại |
| POST | `/api/auth/forgot-password` | Public | Gửi email reset |
| POST | `/api/auth/reset-password` | Public | Reset với token |

### Quiz Sessions

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/sessions` | Student | Tạo session mới (cache questions vào session.questions_cache) |
| GET | `/api/sessions/[id]` | Student | Lấy session info |
| GET | `/api/sessions/[id]/questions` | Student | Preload tất cả câu hỏi (stripped correct_answer cho review) |
| POST | `/api/sessions/[id]/answer` | Student | Submit câu trả lời |
| POST | `/api/sessions/[id]/submit` | Student | Nộp bài (trigger atomicCompleteSession) |
| GET | `/api/sessions/[id]/result` | Student | Kết quả cuối cùng |
| POST | `/api/sessions/[id]/activity` | Student | Báo pause/resume |

### Question Bank

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/question-bank/list` | Student | Danh sách câu hỏi theo category |
| POST | `/api/question-bank/check` | Student | Check conflict 1 câu hỏi |
| POST | `/api/question-bank/check-usage` | Student | Check usage của nhiều câu hỏi |
| POST | `/api/question-bank/sync` | Student | Sync quiz questions vào bank |

### Admin

| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST | `/api/admin/quizzes` | Admin |
| GET/PUT/DELETE | `/api/admin/quizzes/[id]` | Admin |
| GET/POST | `/api/admin/categories` | Admin |
| PUT/DELETE | `/api/admin/categories/[id]` | Admin |
| GET | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/[id]/ban` | Admin |
| GET/POST | `/api/admin/settings` | Admin |
| GET | `/api/admin/feedback` | Admin |
| GET | `/api/admin/question-bank` | Admin |

### Public API v1

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/v1/public/quizzes` | Public |
| GET | `/api/v1/public/quizzes/[id]` | Public |
| GET | `/api/v1/explore/quizzes` | Optional auth |

### AI API v1

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/v1/ai/generate` | Student | Sinh nội dung AI (từ vựng, câu, đoạn...) |
| GET | `/api/v1/ai/history` | Student | Lịch sử generation |
| GET | `/api/v1/ai/stats` | Student | Thống kê usage |

### Community

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/community/posts` | Student | Danh sách posts |
| POST | `/api/community/posts` | Student | Tạo post |
| GET/PUT/DELETE | `/api/community/posts/[id]` | Student | CRUD post |
| POST | `/api/community/posts/[id]/comments` | Student | Thêm comment |
| POST | `/api/community/posts/[id]/like` | Student | Like/unlike |

---

## 12. Security Design

### CSRF Protection — Double-Submit Cookie Pattern

```
Middleware (proxy.ts):
  - Sinh CSRF token ngẫu nhiên (32 bytes hex) → set cookie `csrf-token`
    httpOnly: false (cần đọc từ JS), sameSite: strict, secure: production
  
  - Với mỗi mutation request:
    Verify: csrf-token cookie === x-csrf-token header
    Fail → 403

Client (lib/core/security/csrf.ts):
  - getCsrfTokenFromCookie() → đọc cookie
  - withCsrfHeaders(headers) → inject x-csrf-token header tự động
```

### Server-side CSRF Validation (API handlers)

```typescript
// csrf.ts - validateCsrfRequest(request)
// 1. Origin check: request.headers.origin phải match site URL
// 2. Referer fallback nếu không có Origin header
```

### Rate Limiting

- Áp dụng cho public API (`/api/v1/public/`)
- Implement trong `lib/core/security/rate-limit/`

### Content Security Policy

- Cấu hình trong `next.config.js`
- CSP violation report endpoint: `/api/security/csp-report`

### Input Validation

- Tất cả API inputs validate qua **Zod schemas** (`lib/core/schemas/`, `lib/modules/*/schemas/`)
- Mongoose schema cũng validate ở tầng DB

### JWT Security

- Library: `jose` (Edge-compatible)
- Token rotation: hỗ trợ `JWT_SECRET_PREV` để rotate không downtime
- Token versioning: `token_version` field trong User — invalidate cụ thể user
- Cookie: `httpOnly`, `sameSite: strict`, `secure` in production

---

## 13. Background Jobs (Upstash QStash)

```typescript
// lib/core/queue/qstash.ts
async function publishJob(destination: string, body: any, delay?: number)
// Local dev: fallback về direct fetch (QStash không thể gọi localhost)
```

### Job Types

| Job | Endpoint | Trigger |
|-----|----------|---------|
| Send verification email | `/api/jobs/mail` | Register |
| Send reset password email | `/api/jobs/mail` | Forgot password |
| Sync student count | `/api/jobs/quiz-stats` | Session created |
| Mix quiz cleanup | Internal | Session expires |

---

## 14. Database Connection (`lib/core/db/mongodb.ts`)

### Singleton Pattern

```typescript
// Global cache để tái sử dụng connection qua Serverless invocations
declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise | null }
}

// Pre-register tất cả Mongoose models để tránh MissingSchemaError
// khi Mongoose populate trong các routes khác nhau
import '@/lib/modules/auth/models/User'
import '@/lib/modules/quiz/models/Category'
import '@/lib/modules/quiz/models/Quiz'
import '@/lib/modules/quiz/models/QuizSession'
import '@/lib/modules/quiz/models/QuizComment'
```

### DNS SRV Fallback

```
mongodb+srv:// yêu cầu DNS SRV lookup.
Một số ISP/môi trường block querySrv → connection fail.

Fallback:
  1. Thử connect với system DNS resolver
  2. Nếu DNS error → switch sang 8.8.8.8 / 1.1.1.1 (Google/Cloudflare)
  3. Restore system DNS sau khi connect
```

**Connection options**: `serverSelectionTimeoutMS: 5000`, `connectTimeoutMS: 10000`, `socketTimeoutMS: 45000`, `bufferCommands: false`

---

## 15. Session Lifecycle Flow

```
1. Client: POST /api/sessions { quiz_id, mode, difficulty }
   Server:
     - Validate quiz tồn tại và published
     - Tạo question_order (sequential hoặc Fisher-Yates shuffle)
     - Cache questions vào session.questions_cache
     - Set expires_at (TTL cho active sessions)
     - Status: 'preparing' → 'active'
     - Trigger QStash job: sync studentCount

2. Client: GET /api/sessions/[id]/questions
   Server:
     - Trả về tất cả câu hỏi (stripped correct_answer/explanation cho review mode)
     - Client preload toàn bộ → không cần fetch từng câu

3. Client: POST /api/sessions/[id]/answer { answer_indexes }
   Server (quiz-engine.ts):
     - Dùng questions_cache (không query DB)
     - Map display_index → actual_index qua question_order
     - Normalize + validate answers
     - Upsert UserAnswer vào session
     - Cập nhật running score
     - Immediate: trả về { isCorrect, correctAnswer, explanation }
     - Review: trả về next question (stripped) hoặc { completed: false }

4. Client: POST /api/sessions/[id]/submit
   Server:
     - atomicCompleteSession(): findOneAndUpdate với $ne: 'completed'
     - $unset expires_at (giữ kết quả vĩnh viễn, không bị TTL xóa)
     - Status: 'completed'
     - Race condition safe (concurrent submits → chỉ 1 thành công)

5. Client: GET /api/sessions/[id]/result
   Server: Trả về toàn bộ session + questions với correct_answers (đã completed)
```

---

## 16. Mix Quiz

```
1. Admin/Student tạo Mix Quiz:
   - Chọn nhiều quiz_ids + question_count + mode
   - Server tạo Quiz is_temp=true với expires_at (TTL)
   - mix_config lưu cấu hình gốc

2. Session tạo từ Mix Quiz:
   - Tương tự normal session
   - is_temp=true → được xóa sau khi complete hoặc expire

3. Concurrent Mix Quiz check:
   - Index { student_id, is_temp, expires_at }
   - Prevent duplicate active mix sessions
```

---

## 17. Explore, Community & AI Learning

### Explore
```
/explore page:
  - Duyệt quiz public (is_public=true, status=published)
  - Filter theo category, search theo title/course_code
  - Lưu quiz vào library: tạo bản copy với original_quiz_id, is_saved_from_explore=true
```

### Community
```
/community (student):
  - Xem quiz của người dùng khác (privacy_share_activity=true)
  - Comment trên Quiz (QuizComment collection)
  - Post bài thảo luận (Post collection với embedded comments)
  - Tag-based filtering
```

### Community API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/community/posts` | Student | Danh sách posts |
| POST | `/api/community/posts` | Student | Tạo post mới |
| GET | `/api/community/posts/[id]` | Student | Chi tiết post |
| PUT | `/api/community/posts/[id]` | Student | Cập nhật post |
| DELETE | `/api/community/posts/[id]` | Student | Xóa post |
| POST | `/api/community/posts/[id]/comments` | Student | Thêm comment |
| POST | `/api/community/posts/[id]/like` | Student | Like/unlike post |

---

## 18. AI Module (`lib/modules/ai/`)

Module quản lý nội dung sinh bởi AI (Gemini/OpenAI) cho dịch vụ học ngôn ngữ.

### AI Provider Architecture

```
DynamicAIProvider (runtime switching)
    ├── GeminiProvider  (gemini-2.0-flash-001, text-embedding-004)
    ├── OpenAIProvider  (GPT-4o-mini, text-embedding-3-small)
    └── Custom OpenAI-compatible endpoint

Provider selection: SiteSettings.llm_config.active_provider
Fallback: Gemini nếu active provider không khả dụng
```

### Prompt Registry (`lib/modules/ai/prompts/`)

11 loại prompt, mỗi loại có Zod schema validate structured JSON output từ AI:

| Prompt Type | Output | Schema |
|-------------|--------|--------|
| `vocabularyGeneration` | Từ vựng + định nghĩa + ví dụ | `GeneratedVocabularySchema` |
| `sentenceGeneration` | Câu ví dụ theo ngữ pháp | `GeneratedSentenceSchema` |
| `paragraphGeneration` | Đoạn văn theo chủ đề | `GeneratedParagraphSchema` |
| `grammarGeneration` | Pattern ngữ pháp + giải thích | `GeneratedGrammarSchema` |
| `quizGeneration` | Câu hỏi trắc nghiệm | `GeneratedQuizSchema` |
| `flashcardGeneration` | Flashcard hai mặt | `GeneratedFlashcardSchema` |
| `translation` | Bản dịch + giải thích | `GeneratedTranslationSchema` |
| `dialogueGeneration` | Hội thoại theo ngữ cảnh | `GeneratedDialogueSchema` |
| `storyGeneration` | Truyện ngắn theo trình độ | `GeneratedStorySchema` |
| `writingGeneration` | Đề bài viết + gợi ý | `GeneratedWritingPromptSchema` |
| `writingEvaluation` | Chấm bài viết + feedback | `GeneratedWritingEvalSchema` |

### AIContentService

```typescript
// lib/modules/ai/services/ai-content.service.ts
class AIContentService {
  async generate<T>(request: AIContentRequest): Promise<AIContentResult<T>>
}

interface AIContentRequest {
  promptType: PromptType
  params: Record<string, any>
  languageId?: string
  userId?: string
  enableCache?: boolean        // default: true
}

interface AIContentResult<T> {
  success: boolean
  data?: T                     // Zod-validated
  error?: string
  fromCache: boolean
  aiAssetId?: string
  tokensUsed?: number
  costEstimated?: number
}
```

### Dedup Flow

```
generate() request
  │
  ├─ 1. Build canonical prompt từ promptRegistry + params
  ├─ 2. SHA-256(requestHash) từ prompt + params
  ├─ 3. Check AIAsset DB: { requestHash, aiProvider } unique index
  │      └─ Found → reuse response (skip API call, emit log)
  ├─ 4. Check in-memory cache (ICache, TTL-based)
  │      └─ Hit → return cached result
  ├─ 5. Call IAIProvider.generate() → Gemini/OpenAI
  ├─ 6. Validate response với Zod schema từ promptRegistry
  ├─ 7. Persist vào AIAsset collection
  ├─ 8. Emit AIAssetGenerated event (EventBus)
  └─ 9. Return AIContentResult<T>
```

---

## 19. Learning Module (`lib/modules/learning/`)

Module quản lý lộ trình học ngôn ngữ, sử dụng DI container, Repository pattern, và FSRS spaced repetition.

### Architecture

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

### Repositories (10)

| Repository | Model | Key Methods |
|------------|-------|-------------|
| `LanguageRepository` | Language | `findByCode`, `upsertByCode`, `findAll` |
| `TopicRepository` | Topic | `findBySlug`, `findByPath`, `findChildren` |
| `CourseRepository` | Course | `findByLanguage`, `findByCEFR`, `findByTopic` |
| `ModuleRepository` | Module | `findByCourse` |
| `LessonRepository` | Lesson | `findByModule`, `findByPrerequisite` |
| `VocabularyRepository` | Vocabulary | `findByLemma` (normalized), `findByLanguage`, `bulkCreate` |
| `GrammarRepository` | GrammarPattern | `findByName`, `findByLanguage` |
| `SentenceRepository` | Sentence | `findByChecksum`, `findByLanguage`, `bulkCreate` |
| `ParagraphRepository` | Paragraph | `findByLesson` |
| `LearningProgressRepository` | LearningProgress | `findDueReviews`, `upsert`, `getDetailedAnalytics` |
| `SentenceReadRepository` | (read-only, joins 3 tables) | `getSentenceWithRelations` (batch query join 5 collections) |

### Services (5)

| Service | Responsibilities |
|---------|-----------------|
| `VocabularyService` | CRUD vocabulary + emit `VocabularyCreated` event |
| `SentenceService` | CRUD sentences + createWithVocabLinks (lazy-import SentenceVocabulary join table) |
| `LearningProgressService` | `getDueReviews`, `recordReview` (FSRS or Simple), `getDetailedAnalytics` |
| `LessonLearningService` | `loadLesson` (orchestration: lesson→paragraphs→sentences with relations + cache), `completeLesson` (upserts progress + emits `LessonCompleted`) |
| `CourseLearningService` | `getCourseStructure` (course→modules→lessons→progress + cache), `getRoadmap` (computes locked/available/completed status per lesson based on prerequisites) |

### FSRS Review Engine (`lib/modules/learning/review-engine.ts`)

```typescript
class ReviewEngine {
  getInitialState(): FSRSState
  calculateNext(state: FSRSState, rating: ReviewRating): FSRSState
  calculateNextWithRetrievability(state: FSRSState, rating: ReviewRating): {
    state: FSRSState; retrievability: number
  }
  getRetrievability(state: FSRSState): number
}

// Wraps fsrs.js library
// Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
// State: 0=New, 1=Learning, 2=Review, 3=Relearning
```

### Learning API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/v1/learning/courses` | Student | Danh sách khóa học |
| GET | `/api/v1/learning/courses/[id]` | Student | Chi tiết khóa học + roadmap |
| GET | `/api/v1/learning/lessons/[id]` | Student | Nội dung bài học (có cache) |
| POST | `/api/v1/learning/lessons/[id]/complete` | Student | Hoàn thành bài học |
| GET | `/api/v1/learning/reviews/due` | Student | Danh sách reviews đến hạn |
| POST | `/api/v1/learning/reviews` | Student | Submit review (FSRS rating) |
| GET | `/api/v1/learning/progress` | Student | Thống kê tiến độ học |
| GET | `/api/v1/learning/search` | Student | Search vocabulary/sentence/grammar |

### Cross-module Rules

- **No cross-module model imports**: Learning module chỉ import model của chính nó
- **Application-level joins**: `SentenceReadRepository` dùng batch queries với `$in` thay vì `.populate()`
- **DI for cross-module deps**: Quiz module dùng `IUserService` interface; auth module implement
- **Exception**: `SearchService` (learning module) import trực tiếp Quiz model từ quiz module (known tradeoff)

---

## 20. UI/UX & Frontend Stack

### Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js App Router | 16 |
| Language | TypeScript | 5 (strict) |
| Styling | Tailwind CSS | 3.4 |
| UI Components | shadcn/ui (Radix primitives) | latest |
| Animation | Framer Motion | 12 |
| 3D | React Three Fiber + Drei | 9/10 |
| Icons | lucide-react | 1.7 |
| Server State | TanStack Query | 5 |
| Client State | Zustand | 5 |
| Forms/Validation | Zod | 4 |

### Responsive Layout

- **Desktop**: 3-column layout (sidebar navigation, question display, question map)
- **Mobile**: Middleware auto-redirect `/quiz/[id]/session/[sid]` → `/mobile` nếu detect mobile user-agent

### Component Architecture

```
Server Components (RSC):
  - Dashboard, Course list, History list, Explore
  - Data fetching + SEO, không cần interactivity

Client Components:
  - Quiz session page (real-time interaction, Zustand store)
  - Quiz editor (drag-and-drop, dynamic form)
  - Auth forms (form state, validation)
  - Question Map (interactive navigation)
  - Admin tables (sorting, filtering)
```

### Color System (từ `Docs/ui-colors.md`)

| Token | Usage |
|-------|-------|
| `--color-primary` | Buttons, headers, active states |
| `--color-success` | Correct answer, success alerts |
| `--color-app-bg` | Page background |
| `--color-error` | Incorrect answer |

---

## 21. Testing Strategy

### Unit Tests (Jest + ts-jest)

```bash
npm run test
```

- Logic: quiz-engine, question-id-generator, validation schemas, review-engine (FSRS)
- Property-based: `fast-check` cho các invariants cốt lõi
- Module isolation: auth (@/lib/modules/auth/__tests__/), quiz (@/lib/modules/quiz/__tests__/), learning (@/lib/modules/learning/__tests__/), AI (@/lib/modules/ai/__tests__/)
- Core: lib/core/__tests__/ (schemas, validation, utils, db, security)

### Performance Tests (tsx scripts)

```bash
npm run test:performance    # Quiz answer processing
npm run test:mongodb        # MongoDB query latency
npm run test:session-perf   # Session creation speed
npm run test:answer-perf    # Answer submission throughput
```

### Audit Scripts

```bash
npm run audit:quiz-codes         # Detect duplicate course_codes
npm run audit:answer-conflicts   # Detect answer conflicts trong Question Bank
npm run reconcile:question-bank  # Sync Question Bank với Quiz data
```

### Learning Module Tests

```bash
npm run test -- --testPathPattern="learning"
```
- Unit: repository methods, service logic, FSRS review-engine
- Integration: `lib/modules/learning/__tests__/integration/` — end-to-end lesson loading, review flow

### Seed Scripts (Learning)

```bash
npm run seed:language      # Seed languages (en, ja, zh, ko, fr...)
npm run seed:topic         # Seed topic hierarchy
npm run seed:vocabulary    # Seed vocabulary data
npm run seed:learning      # Runs seed:language + seed:topic
```

---

## 22. Deployment

### Vercel

- **Region**: `sin1` (Singapore)
- **Auto-deploy**: branch `main` → production
- **Runtime**: Node.js (không phải Edge — do middleware dùng `connectDB`)

### Environment Variables

| Biến | Mô tả |
|------|-------|
| `MONGODB_URI` | MongoDB connection string (srv:// hoặc standard) |
| `JWT_SECRET` | JWT signing key (≥32 chars) |
| `JWT_SECRET_PREV` | JWT cũ để hỗ trợ token rotation |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_APP_PASSWORD`, `MAIL_FROM` | SMTP config |
| `CLOUDINARY_*`, `NEXT_PUBLIC_CLOUDINARY_*` | Cloudinary credentials |
| `ALLOWED_IMAGE_DOMAINS` | Comma-separated domains cho next/image |
| `LOG_LEVEL` | trace/debug/info/warn/error (default: info) |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL (để trống nếu same-origin) |
| `QSTASH_TOKEN`, `QSTASH_URL` | Upstash QStash credentials |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | QStash signature verification |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins (default: fquiz-web.vercel.app) |
| `DEPLOY_TARGET` | `api` nếu deploy chỉ API (block non-API routes) |

---

## 23. Known Design Decisions & Tradeoffs

| Quyết định | Lý do | Tradeoff |
|-----------|-------|---------|
| `questions_cache` trong session | Tránh query Quiz mỗi lần submit answer | Tăng storage session document |
| `jose` thay vì `jsonwebtoken` | Edge-compatible, dùng được trong middleware | API khác với jsonwebtoken |
| Embedded questions trong Quiz | Atomic read/write, no join | Document size limit 16MB |
| TTL index cho active sessions | Auto-cleanup không cần cron | Requires `expires_at` field management |
| `$unset expires_at` khi complete | Giữ lại kết quả vĩnh viễn | Completed sessions không bị cleanup tự động |
| `atomicCompleteSession` với `$ne` | Prevent double-submit race condition | 1 extra DB query |
| `question_order` array | Support random difficulty mà không reorder DB data | Thêm mapping step |
| Singleton MongoDB connection | Tái sử dụng qua Serverless invocations | Global state |
| DNS SRV fallback | Hỗ trợ ISP block SRV lookup | Thêm complexity connection logic |
| `token_version` trong User | Invalidate token cụ thể user (ban, đổi PW) | Thêm 1 DB lookup khi verify |
| DI Container cho learning module | Testability, dependency inversion | Legacy modules chưa migrate sang DI |
| Model Registry | Prevent MissingSchemaError trong Serverless | Lazy import pattern |
| IBaseEntity cho Phase 2+ models | Consistent schema (status, soft delete, versioning) | Legacy models không tương thích |
| Application-level joins (learning) | Không `.populate()`, batch query với `$in` | N+1 queries thay vì 1 |
| DynamicAIProvider | Runtime LLM switching qua SiteSettings | Cần DB query để resolve provider |
| AIAsset dedup trước API call | Tiết kiệm chi phí Gemini/OpenAI | DB query overhead trước mỗi generate |
| Join tables (SentenceVocabulary...) | M-N relations với metadata (order) | 3 collections thay vì embedded arrays |
| FSRS (fsrs.js) cho spaced repetition | Thuật toán tối ưu hơn SM-2 | Complexity cao hơn simple interval |
