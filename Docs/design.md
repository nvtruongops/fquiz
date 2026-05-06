# Design Document: Quiz Platform

## Overview

Hệ thống Quiz Trực Tuyến là một ứng dụng web full-stack được xây dựng trên Next.js 14 App Router, triển khai trên Vercel. Admin quản lý danh mục và bộ câu hỏi; sinh viên đăng ký, đăng nhập, làm quiz theo hai chế độ (Immediate/Review), xem lịch sử.

Toàn bộ Frontend và Backend API (Serverless Functions) nằm trong cùng một Next.js project. Database là MongoDB Atlas, truy cập qua Mongoose với Singleton Pattern để tránh connection pool exhaustion trong môi trường Serverless.

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                          │
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   Next.js Frontend   │    │  Next.js API Routes      │  │
│  │  (React Server +     │◄──►│  (Serverless Functions)  │  │
│  │   Client Components) │    │  /api/**                 │  │
│  └──────────────────────┘    └──────────┬───────────────┘  │
│                                         │                   │
└─────────────────────────────────────────┼───────────────────┘
                                          │ Mongoose (Singleton)
                                          ▼
                              ┌───────────────────────┐
                              │    MongoDB Atlas       │
                              │  Collections:         │
                              │  - users              │
                              │  - categories         │
                              │  - quizzes            │
                              │  - quizsessions       │
                              └───────────────────────┘
```

### Next.js App Directory Layout

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (student)/
│   ├── dashboard/page.tsx
│   ├── courses/[code]/page.tsx
│   ├── quiz/[id]/
│   │   ├── mode/page.tsx
│   │   ├── session/[sessionId]/page.tsx
│   │   └── result/[sessionId]/page.tsx
│   └── history/
│       ├── page.tsx
│       └── [id]/page.tsx
├── (admin)/
│   └── admin/
│       ├── page.tsx
│       ├── categories/page.tsx
│       └── quizzes/
│           ├── page.tsx
│           ├── new/page.tsx
│           └── [id]/edit/page.tsx
├── api/
│   ├── auth/
│   │   ├── register/route.ts
│   │   └── login/route.ts
│   ├── admin/
│   │   ├── categories/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── quizzes/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   ├── courses/
│   │   ├── route.ts
│   │   └── [code]/quizzes/route.ts
│   ├── search/route.ts
│   ├── sessions/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── answer/route.ts
│   │       └── result/route.ts
│   ├── history/
│   │   ├── route.ts
│   │   └── [id]/route.ts
├── layout.tsx
└── page.tsx                  ← Landing page
```

### Server vs Client Components

| Component | Type | Reason |
|---|---|---|
| Dashboard, Course list | Server Component | Data fetching, SEO |
| Quiz session page | Client Component | Real-time interaction, state |
| Question Map | Client Component | Interactive navigation |
| Auth forms | Client Component | Form state, validation |
| Admin quiz editor | Client Component | Dynamic form fields |
| Result page | Server Component | Static after completion |

### Edge Middleware (`middleware.ts`)

Next.js Middleware chạy ở Vercel Edge trước khi request chạm tới bất kỳ page hoặc API route nào. Đây là tầng bảo vệ đầu tiên — ngăn render giao diện Admin cho Student ngay từ Edge, không cần đợi đến API handler.

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'  // jose works in Edge Runtime (jsonwebtoken does NOT)

const PUBLIC_PATHS = ['/', '/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value
    ?? request.headers.get('Authorization')?.replace('Bearer ', '')

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role as string

    // Admin routes: only admin role allowed
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Student routes: only student role allowed
    if (
      (pathname.startsWith('/dashboard') ||
       pathname.startsWith('/courses') ||
       pathname.startsWith('/quiz') ||
       pathname.startsWith('/history')) &&
      role !== 'student'
    ) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // API routes: return 401/403 instead of redirect
    if (pathname.startsWith('/api/admin') && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.next()
  } catch {
    // Invalid or expired token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Lưu ý quan trọng:**
- Edge Runtime không hỗ trợ `jsonwebtoken` (Node.js only) → dùng `jose` library thay thế
- JWT token được đọc từ cookie `auth-token` (preferred) hoặc `Authorization` header
- API routes trả về JSON error, page routes redirect về login/dashboard
- `verifyToken()` trong `lib/auth.ts` vẫn giữ nguyên cho double-check trong API handlers

### Frontend Tech Stack

| Layer | Library | Version | Purpose |
|---|---|---|---|
| Styling | Tailwind CSS | v3 | Utility-first CSS, tích hợp sẵn với Next.js |
| UI Components | shadcn/ui | latest | Accessible, unstyled components (Radix UI base) |
| State (client) | Zustand | v4 | Lightweight client state cho Quiz Session |
| Data Fetching | TanStack Query (React Query) | v5 | Server state, caching, background refetch |
| Icons | lucide-react | latest | Icon set (bundled với shadcn/ui) |

### Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "jose": "^5.0.0",
    "zod": "^3.22.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.300.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "fast-check": "^3.14.0",
    "jest": "^29.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

> Note: shadcn/ui components được add qua CLI (`npx shadcn-ui@latest add button card dialog ...`) và copy source vào `components/ui/` — không phải npm package.

---

## Components and Interfaces

### Client State Management (Zustand)

```typescript
// store/quiz-session.store.ts
interface QuizSessionState {
  // Session data
  sessionId: string | null
  quizId: string | null
  mode: 'immediate' | 'review' | null
  
  // Question navigation
  currentQuestionIndex: number
  totalQuestions: number
  
  // Answer tracking (client-side mirror of DB state)
  answeredQuestions: Set<number>   // indices of answered questions
  
  // Immediate mode feedback
  lastAnswerResult: {
    isCorrect: boolean
    correctAnswer: number
    explanation?: string
  } | null
  
  // Actions
  initSession: (sessionId: string, quizId: string, mode: string, total: number) => void
  navigateToQuestion: (index: number) => void
  markAnswered: (index: number) => void
  setLastAnswerResult: (result: QuizSessionState['lastAnswerResult']) => void
  resetSession: () => void
}
```

**Lý do dùng Zustand thay vì Redux:**
- Bundle size nhỏ hơn (~1KB vs ~16KB)
- Không cần boilerplate (actions, reducers, selectors)
- Tích hợp tốt với React Server Components (chỉ dùng ở Client Components)
- Đủ mạnh cho use case Quiz Session state

### Optimistic Answer State trên Question Map

Khi student click chọn đáp án, ô tương ứng trên Question Map phải đổi màu **ngay lập tức** (trước khi API `/sessions/[id]/answer` trả về). Nếu API thất bại, rollback về trạng thái cũ.

```typescript
// store/quiz-session.store.ts — thêm vào QuizSessionState

interface QuizSessionState {
  // ... existing fields ...

  // Optimistic answer tracking
  pendingAnswerIndex: number | null   // question index đang chờ API confirm

  // Actions — thêm mới
  optimisticallyMarkAnswered: (questionIndex: number) => void
  rollbackOptimisticAnswer: (questionIndex: number) => void
  confirmAnswer: (questionIndex: number) => void
}

// Implementation pattern trong component:
// hooks/useSubmitAnswer.ts
function useSubmitAnswer() {
  const { optimisticallyMarkAnswered, rollbackOptimisticAnswer, confirmAnswer } = useQuizSessionStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitAnswer,

    onMutate: async ({ questionIndex, answerIndex }) => {
      // 1. Immediately update Question Map color (optimistic)
      optimisticallyMarkAnswered(questionIndex)
      return { questionIndex }
    },

    onSuccess: (data, variables, context) => {
      // 2. API confirmed → finalize state
      confirmAnswer(context.questionIndex)
    },

    onError: (error, variables, context) => {
      // 3. API failed → rollback Question Map color
      rollbackOptimisticAnswer(context.questionIndex)
      // Show error toast to user
    },
  })
}
```

**UX rationale:**
- Latency từ Vercel Serverless Function thường 100-300ms — đủ để user nhận thấy "lag" nếu không có optimistic update
- Question Map là visual feedback chính của tiến độ làm bài → phải phản hồi tức thì
- Rollback hiếm xảy ra (chỉ khi network lỗi hoặc session expired) nhưng phải được xử lý để tránh state không nhất quán

### Data Fetching Strategy (TanStack Query)

```typescript
// Query keys convention
export const queryKeys = {
  courses: ['courses'] as const,
  courseQuizzes: (code: string) => ['courses', code, 'quizzes'] as const,
  search: (params: SearchParams) => ['search', params] as const,
  session: (id: string) => ['sessions', id] as const,
  history: (page: number) => ['history', page] as const,
  historyDetail: (id: string) => ['history', id] as const,
}

// Caching strategy
export const CACHE_CONFIG = {
  // Courses list: ít thay đổi, cache 5 phút
  courses: { staleTime: 1000 * 60 * 5 },

  // Course quizzes: có thể thêm quiz mới, cache 2 phút
  courseQuizzes: { staleTime: 1000 * 60 * 2 },

  // Search results: cache 1 phút
  search: { staleTime: 1000 * 60 },

  // Active session: luôn fresh (real-time state)
  session: { staleTime: 0 },

  // History list: moderate freshness, 30 giây
  historyList: { staleTime: 1000 * 30 },

  // History detail (completed sessions): immutable data — cache 1 giờ
  historyDetail: {
    staleTime: 1000 * 60 * 60,       // 1 hour: serve from cache instantly
    gcTime: 1000 * 60 * 60 * 24,     // 24 hours: keep in memory
  },
} as const
```

**Stale-while-revalidate rationale cho historyDetail:**
- Completed `QuizSession` documents trong MongoDB là **immutable** — score, answers, và correct_answers không bao giờ thay đổi sau khi `status === 'completed'`
- `staleTime: 1 giờ` → TanStack Query phục vụ từ cache ngay lập tức, không gọi API
- `gcTime: 24 giờ` → Data ở lại memory cache qua nhiều lần navigate
- Kết quả: sinh viên xem lại bài thi cũ thấy kết quả **tức thì** (0ms), không có loading spinner

**Cache Invalidation Triggers cho historyDetail:**

Mặc dù completed `QuizSession` documents là immutable, có 2 tình huống cần invalidate cache `historyDetail` để tránh hiển thị dữ liệu sai lệch:

```typescript
// lib/cache-invalidation.ts

/**
 * Trigger 1: Admin cập nhật nội dung Quiz gốc
 */
export async function invalidateHistoryForQuiz(
  queryClient: QueryClient,
  quizId: string
) {
  await queryClient.invalidateQueries({
    queryKey: ['history'],
    predicate: (query) => {
      const data = query.state.data as any
      return data?.session?.quiz_id === quizId
    },
  })
}

/**
 * Trigger 2: Student xóa tài khoản / logout
 */
export function clearAllUserCache(queryClient: QueryClient) {
  queryClient.clear()
}
```

**Lý do dùng TanStack Query:**
- Tự động cache kết quả search và history → giảm số lần gọi MongoDB Atlas
- Background refetch khi user quay lại tab
- Loading/error states tự động → ít boilerplate
- Tích hợp tốt với Next.js App Router (prefetch trên Server, hydrate trên Client)

### Auth Middleware (`lib/auth.ts`)

```typescript
// Verifies JWT from Authorization header
export function verifyToken(req: Request): JWTPayload | null

// Role guard - throws 403 if role doesn't match
export function requireRole(payload: JWTPayload, role: 'admin' | 'student'): void

interface JWTPayload {
  userId: string
  role: 'admin' | 'student'
  iat: number
  exp: number
}
```

### MongoDB Singleton (`lib/mongodb.ts`)

```typescript
// lib/mongodb.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

// Global cache to prevent multiple connections across Serverless invocations
declare global {
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const cached = global.mongooseCache ?? { conn: null, promise: null }
global.mongooseCache = cached

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then(m => {
      cached.conn = m
      return m
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

### Zod Shared Schemas (`lib/schemas.ts`)

```typescript
export const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  student_id: z.string().min(1),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const CreateQuizSchema = z.object({
  title: z.string().min(1),
  category_id: z.string(),
  course_code: z.string().min(1),
  questions: z.array(QuestionSchema).min(1),
})

export const QuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string()).min(2).max(6),
  correct_answer: z.number().int().min(0),
  explanation: z.string().optional(),
  image_url: z.string().url().optional(),
})

export const SubmitAnswerSchema = z.object({
  answer_index: z.number().int().min(0),
})
```

### Quiz Engine (`lib/quiz-engine.ts`)

```typescript
// Immediate mode: returns correctness + correct_answer + explanation
export async function processImmediateAnswer(
  session: IQuizSession,
  answerIndex: number
): Promise<ImmediateAnswerResult>

// Review mode: returns next question (no answer) or full results if last
export async function processReviewAnswer(
  session: IQuizSession,
  answerIndex: number
): Promise<ReviewAnswerResult>

// Score calculation - reads from DB, never trusts client
export function calculateScore(
  userAnswers: UserAnswer[],
  questions: IQuestion[]
): number
```

---

## Data Models

### User

```typescript
interface IUser {
  _id: ObjectId
  name: string
  email: string           // unique index
  password_hash: string
  student_id: string
  role: 'admin' | 'student'
  created_at: Date
}
```

### Category

```typescript
interface ICategory {
  _id: ObjectId
  name: string            // unique index
  created_at: Date
}
```

### Quiz (with embedded Questions)

```typescript
interface IQuestion {
  _id: ObjectId
  text: string
  options: string[]
  correct_answer: number
  explanation?: string
  image_url?: string
}

interface IQuiz {
  _id: ObjectId
  title: string
  category_id: ObjectId
  course_code: string
  questions: IQuestion[]
  created_by: ObjectId
  created_at: Date
}
```

### QuizSession

```typescript
interface UserAnswer {
  question_index: number
  answer_index: number
  is_correct: boolean
}

interface IQuizSession {
  _id: ObjectId
  student_id: ObjectId
  quiz_id: ObjectId
  mode: 'immediate' | 'review'
  status: 'active' | 'completed'
  user_answers: UserAnswer[]
  current_question_index: number
  score: number
  expires_at: Date
  started_at: Date
  completed_at?: Date
}
```

---

## API Design

### Auth

**POST /api/auth/register**
- Body: `{ name, email, password, student_id }`
- Response 201: Success message

**POST /api/auth/login**
- Body: `{ email, password }`
- Response 200: `{ token, role }`

---

### Categories (Admin)

**GET /api/admin/categories**
**POST /api/admin/categories**
**PUT /api/admin/categories/[id]**
**DELETE /api/admin/categories/[id]**

---

### Quizzes (Admin)

**GET /api/admin/quizzes**
**POST /api/admin/quizzes**
**GET /api/admin/quizzes/[id]**
**PUT /api/admin/quizzes/[id]**
**DELETE /api/admin/quizzes/[id]**

---

### Browse (Student)

**GET /api/courses**
**GET /api/courses/[code]/quizzes**
**GET /api/search**

---

### Quiz Session (Student)

**POST /api/sessions**
- Body: `{ quiz_id, mode }`
- Response 201: `{ session_id, question }`

**GET /api/sessions/[id]**
- Response 200: `{ session, question }`

**POST /api/sessions/[id]/answer**
- Body: `{ answer_index }`
- Response 200: Result or next question

**GET /api/sessions/[id]/result**
- Response 200: Full result

---

### History (Student)

**GET /api/history**
**GET /api/history/[id]**

---

## Core Logic Design

### Quiz Engine Flow

**Immediate Mode:**
1. Verify JWT
2. Load Session & Quiz
3. Compute correctness
4. Atomic update session (score, current_index, answer)
5. Return feedback

**Review Mode:**
1. Verify JWT
2. Push answer to session
3. If last question: calculate total score, mark completed, return full results
4. Else: return next question

### Projection Strategy

Active sessions strip `correct_answer` and `explanation`.

---

## UI/UX Design

### Color System

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#5D7B6F` | Buttons, headers, active states |
| `--color-success` | `#A4C3A2` | Correct answer, success alerts |
| `--color-app-bg` | `#EAE7D6` | Page background |
| `--color-error` | `#E57373` | Incorrect answer |

### Tailwind Configuration

Sử dụng `tailwind.config.ts` để định nghĩa theme.

### Page Structure

Gồm các route cho Auth, Student (Dashboard, Quiz, History) và Admin (Categories, Quizzes).

### Question Map Component

Hiển thị lưới câu hỏi để điều hướng nhanh. Hỗ trợ hiển thị Desktop (Sidebar) và Mobile (Drawer).

---

## Security Design

- **CSP**: Cấu hình trong `next.config.js`.
- **Env**: Lưu trữ secrets trong environment variables.
- **Validation**: Zod schemas cho tất cả inputs.

---

## Correctness Properties

### Property 1: Registration accepts any valid input
### Property 2: Role-based access control
### Property 3: Session creation preserves mode and assigns unique ID
### Property 4: Answer persistence and session resume
### Property 5: Score integrity — server-side calculation only
### Property 6: Correct answer projection — never exposed in active sessions
### Property 7: Completed session immutability
### Property 8: Search filter correctness
### Property 9: Password validation rejects short passwords

---

## Testing Strategy

- **Unit Tests**: Jests cho logic engine và validation.
- **Property-Based Testing**: `fast-check` cho các properties cốt lõi.
- **Integration Tests**: Kiểm tra kết nối MongoDB và TTL indexes.
