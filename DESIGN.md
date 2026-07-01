# DESIGN.md — FQuiz Platform

> Tài liệu thiết kế kỹ thuật, phản ánh trạng thái thực tế của codebase.  
> Cập nhật lần cuối: 2026-07-01

---

## 1. Tổng quan hệ thống

FQuiz là nền tảng thi trắc nghiệm full-stack, xây dựng trên **Next.js 16 App Router**, triển khai trên **Vercel** (region `sin1`).

- **3 vai trò**: `admin`, `student`, `public` (unauthenticated)
- **3 chế độ thi**: `immediate` (chấm ngay), `review` (nộp cuối), `flashcard` (lật thẻ)
- **Mix Quiz**: trộn câu hỏi từ nhiều quiz/bộ đề
- **Ngân hàng câu hỏi (Question Bank)**: quản lý câu hỏi tái sử dụng, phát hiện conflict đáp án
- Frontend và API nằm trong cùng một Next.js project; database là **MongoDB Atlas** qua Mongoose.

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Vercel (sin1)                             │
│                                                                     │
│  ┌─────────────────────┐   proxy.ts (Node.js Middleware)            │
│  │  Next.js App Router │◄─────────────────────────────────────────  │
│  │  (RSC + Client)     │                                            │
│  │                     │                                            │
│  │  /(auth)/           │   ┌──────────────────────────────────────┐ │
│  │  /(student)/        │   │  Next.js API Route Handlers          │ │
│  │  /(admin)/admin/    │◄──│  /api/**  (Serverless Functions)     │ │
│  │  /quiz/[id]/        │   └─────────────────┬────────────────────┘ │
│  │  /explore/          │                     │                      │
│  └─────────────────────┘                     │                      │
│                                              │ Mongoose (Singleton)  │
└──────────────────────────────────────────────┼─────────────────────┘
                                               │
                   ┌───────────────────────────▼──────────────────┐
                   │               MongoDB Atlas                   │
                   │  Collections:                                 │
                   │  - users         (User schema)                │
                   │  - quizzes       (Quiz + embedded Questions)  │
                   │  - quizsessions  (QuizSession)                │
                   │  - categories    (Category)                   │
                   │  - questionbanks (QuestionBank)               │
                   │  - quizcomments  (QuizComment)                │
                   │  - feedbacks     (Feedback)                   │
                   │  - emailverifications                         │
                   │  - loginlogs                                  │
                   │  - sitesettings                               │
                   └──────────────────────────────────────────────┘
                                               │
                   ┌───────────────────────────▼──────────────────┐
                   │           Upstash QStash (Background Jobs)    │
                   │  - mail jobs (email verification, reset PW)   │
                   │  - quiz stats sync (studentCount)             │
                   │  - mix quiz temp session cleanup              │
                   └──────────────────────────────────────────────┘
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
│   ├── (student)/                # Dashboard, Courses, History, Profile, Settings, My-Quizzes, Create, Community
│   ├── (admin)/admin/            # Users, Quizzes, Categories, Question Bank, Feedback, Settings
│   ├── quiz/[id]/                # Quiz Detail → Session (desktop/mobile/flashcard) → Result
│   ├── explore/                  # Khám phá quiz công khai
│   ├── maintenance/              # Trang bảo trì
│   ├── privacy/, terms/          # Legal pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout (font, providers, toploader)
│   └── api/                      # 69 API route handlers
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
│       ├── jobs/                 # QStash job handlers (mail, quiz-stats)
│       ├── security/             # csp-report
│       └── v1/public/            # Public API v1 (unauthenticated)
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
│   │   ├── db/mongodb.ts         # Connection pool singleton + DNS SRV fallback
│   │   ├── security/             # csrf.ts, rate-limit/
│   │   ├── queue/qstash.ts       # publishJob() — Upstash QStash wrapper
│   │   ├── mail/mail.ts          # Nodemailer + email templates
│   │   ├── schemas/common.ts     # Zod shared schemas
│   │   ├── constants/            # Cookie names, cookie max age, etc.
│   │   └── utils/                # cn(), logger (Pino), formatters, cache invalidation
│   └── modules/
│       ├── auth/                 # auth.ts, authz.ts, dal.ts, with-auth.ts, models/, schemas/, types/
│       └── quiz/                 # quiz-engine.ts, question-bank-manager.ts, quiz-analyzer.ts,
│                                 # question-id-generator.ts, session-api.ts, feedback-utils.ts,
│                                 # quiz-import/, models/, schemas/, types/, constants/
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
└── Docs/                           # design.md (cũ), requirements.md, security.md, ui-colors.md
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

## 6. Data Models

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

## 17. Explore & Community

```
/explore page:
  - Duyệt quiz public (is_public=true, status=published)
  - Filter theo category, search theo title/course_code
  - Lưu quiz vào library: tạo bản copy với original_quiz_id, is_saved_from_explore=true

/community (student):
  - Xem quiz của người dùng khác (privacy_share_activity=true)
  - Comment trên Quiz (QuizComment collection)
```

---

## 18. UI/UX & Frontend Stack

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

## 19. Testing Strategy

### Unit Tests (Jest + ts-jest)

```bash
npm run test
```

- Logic: quiz-engine, question-id-generator, validation schemas
- Property-based: `fast-check` cho các invariants cốt lõi

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

---

## 20. Deployment

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

## 21. Known Design Decisions & Tradeoffs

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
