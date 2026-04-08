# Design Document: Quiz Platform

## Overview

Hệ thống Quiz Trực Tuyến là một ứng dụng web full-stack được xây dựng trên Next.js 14 App Router, triển khai trên Vercel. Admin quản lý danh mục và bộ câu hỏi; sinh viên đăng ký, đăng nhập, làm quiz theo hai chế độ (Immediate/Review), xem lịch sử và highlight nội dung câu hỏi.

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
                              │  - userhighlights     │
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
│   └── highlights/
│       ├── route.ts
│       └── [id]/route.ts
├── layout.tsx
└── page.tsx                  ← Landing page
```

### Server vs Client Components

| Component | Type | Reason |
|---|---|---|
| Dashboard, Course list | Server Component | Data fetching, SEO |
| Quiz session page | Client Component | Real-time interaction, state |
| Question Map | Client Component | Interactive navigation |
| Highlight system | Client Component | Window.getSelection() API |
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
| Highlight | react-highlight-words | latest | Text highlight overlay rendering |
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
    "react-highlight-words": "^0.20.0",
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
  highlightedQuestions: Set<number> // indices with highlights
  
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
  markHighlighted: (index: number) => void
  setLastAnswerResult: (result: QuizSessionState['lastAnswerResult']) => void
  resetSession: () => void
}

// store/highlight.store.ts
interface HighlightState {
  // Highlights keyed by question_id
  highlights: Record<string, IUserHighlight[]>
  
  // Active color selection
  selectedColor: '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'
  
  // Actions
  setHighlights: (questionId: string, highlights: IUserHighlight[]) => void
  addHighlight: (highlight: IUserHighlight) => void
  removeHighlight: (highlightId: string, questionId: string) => void
  setSelectedColor: (color: string) => void
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
  highlights: (questionId: string) => ['highlights', questionId] as const,
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
  // Completed sessions NEVER change → stale-while-revalidate for instant UX
  // Saves MongoDB Atlas Read Units significantly for returning students
  historyDetail: {
    staleTime: 1000 * 60 * 60,       // 1 hour: serve from cache instantly
    gcTime: 1000 * 60 * 60 * 24,     // 24 hours: keep in memory (was cacheTime in v4)
  },

  // Highlights: staleTime 0 + invalidateQueries on navigate (cross-device sync)
  highlights: { staleTime: 0 },
} as const
```

**Stale-while-revalidate rationale cho historyDetail:**
- Completed `QuizSession` documents trong MongoDB là **immutable** — score, answers, và correct_answers không bao giờ thay đổi sau khi `status === 'completed'`
- `staleTime: 1 giờ` → TanStack Query phục vụ từ cache ngay lập tức, không gọi API
- `gcTime: 24 giờ` → Data ở lại memory cache qua nhiều lần navigate
- Kết quả: sinh viên xem lại bài thi cũ thấy kết quả **tức thì** (0ms), không có loading spinner
- MongoDB Atlas tiết kiệm: mỗi sinh viên xem lại 10 bài cũ = 10 reads tiết kiệm được

**Cache Invalidation Triggers cho historyDetail:**

Mặc dù completed `QuizSession` documents là immutable, có 2 tình huống cần invalidate cache `historyDetail` để tránh hiển thị dữ liệu sai lệch:

```typescript
// lib/cache-invalidation.ts

/**
 * Trigger 1: Admin cập nhật nội dung Quiz gốc
 * Khi Admin sửa question text hoặc options của một Quiz,
 * các history sessions liên quan đến Quiz đó cần được invalidate
 * vì history detail hiển thị question text từ Quiz gốc (joined data).
 */
export async function invalidateHistoryForQuiz(
  queryClient: QueryClient,
  quizId: string
) {
  // Invalidate tất cả historyDetail queries
  // (TanStack Query sẽ refetch khi user navigate vào history detail)
  await queryClient.invalidateQueries({
    queryKey: ['history'],
    // Predicate: chỉ invalidate sessions liên quan đến quizId này
    predicate: (query) => {
      const data = query.state.data as any
      return data?.session?.quiz_id === quizId
    },
  })
}

/**
 * Trigger 2: Student xóa tài khoản / logout
 * Khi user logout hoặc xóa tài khoản, toàn bộ cache phải bị xóa
 * để tránh data leak nếu thiết bị dùng chung.
 */
export function clearAllUserCache(queryClient: QueryClient) {
  queryClient.clear()  // Xóa toàn bộ TanStack Query cache
}

/**
 * Trigger 3: Admin xóa Quiz gốc
 * Nếu Admin xóa một Quiz, history sessions của Quiz đó vẫn tồn tại trong DB
 * nhưng question text sẽ không còn join được → invalidate để refetch
 * và hiển thị fallback UI "Quiz này đã bị xóa".
 */
export async function invalidateHistoryForDeletedQuiz(
  queryClient: QueryClient,
  quizId: string
) {
  await queryClient.invalidateQueries({ queryKey: ['history'] })
}
```

**Integration points:**

| Event | Where to call | Action |
|---|---|---|
| Admin saves quiz edit | `PUT /api/admin/quizzes/[id]` success callback | `invalidateHistoryForQuiz(queryClient, quizId)` |
| Admin deletes quiz | `DELETE /api/admin/quizzes/[id]` success callback | `invalidateHistoryForDeletedQuiz(queryClient, quizId)` |
| User clicks Logout | Auth logout handler | `clearAllUserCache(queryClient)` |
| User deletes account | Account deletion success callback | `clearAllUserCache(queryClient)` |

**Backend complement — Quiz update response:**

Khi `PUT /api/admin/quizzes/[id]` thành công, response nên include `quizId` để FE biết cần invalidate cache nào:

```typescript
// Response shape cho quiz update
{ quiz: IQuiz, affectedSessionCount: number }
// affectedSessionCount: số QuizSession đã completed liên quan
// FE dùng để hiển thị warning: "Cập nhật này ảnh hưởng đến X bài thi đã hoàn thành"
```

**Highlight Invalidation Strategy (Cross-Device Sync):**

```typescript
// hooks/useQuizSession.ts
// Khi navigate sang câu hỏi mới, invalidate highlights của câu đó
// để đảm bảo dữ liệu đồng bộ nếu student dùng nhiều thiết bị

function useNavigateToQuestion(questionId: string) {
  const queryClient = useQueryClient()

  return useCallback(async (questionIndex: number, questionId: string) => {
    // Invalidate highlights for the target question before rendering
    await queryClient.invalidateQueries({
      queryKey: queryKeys.highlights(questionId),
    })
    // Then navigate
    useQuizSessionStore.getState().navigateToQuestion(questionIndex)
  }, [queryClient])
}

// Also invalidate on session init (initSession call)
function useInitSession(sessionId: string, questionIds: string[]) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Prefetch + invalidate highlights for ALL questions in the quiz at session start
    questionIds.forEach(qId => {
      queryClient.invalidateQueries({ queryKey: queryKeys.highlights(qId) })
    })
  }, [sessionId])
}
```

**Tại sao cần invalidate thay vì chỉ dùng staleTime: 0:**
- `staleTime: 0` chỉ đảm bảo data được coi là "stale" ngay lập tức, nhưng refetch chỉ xảy ra khi component re-mount hoặc window refocus
- `invalidateQueries` buộc refetch ngay lập tức tại thời điểm navigate → đảm bảo cross-device sync
- Kết hợp cả hai: `staleTime: 0` + `invalidateQueries` on navigate = luôn fresh

**Mutations với optimistic updates:**
```typescript
// Highlight creation với optimistic update
const addHighlightMutation = useMutation({
  mutationFn: createHighlight,
  onMutate: async (newHighlight) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.highlights(newHighlight.question_id) })
    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKeys.highlights(newHighlight.question_id))
    // Optimistically update
    queryClient.setQueryData(queryKeys.highlights(newHighlight.question_id), (old) => [...old, newHighlight])
    return { previous }
  },
  onError: (err, newHighlight, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKeys.highlights(newHighlight.question_id), context.previous)
  },
})
```

**Lý do dùng TanStack Query:**
- Tự động cache kết quả search và history → giảm số lần gọi MongoDB Atlas
- Background refetch khi user quay lại tab
- Loading/error states tự động → ít boilerplate
- Tích hợp tốt với Next.js App Router (prefetch trên Server, hydrate trên Client)

### Highlight Layer Utility (`lib/highlight-utils.ts`)

Khi nhiều highlights chồng chéo hoặc sát nhau trên cùng một đoạn text, `react-highlight-words` cần nhận mảng đã được sắp xếp và xử lý conflict để render đúng. Utility này chuẩn hóa mảng highlights trước khi truyền vào component.

```typescript
// lib/highlight-utils.ts

export interface HighlightSegment {
  _id: string
  offset: number          // start character index
  length: number          // character count of text_segment
  text_segment: string
  color_code: string
  created_at: Date
}

/**
 * Sorts highlights by offset ascending.
 * For overlapping highlights (where offsetA + lengthA > offsetB),
 * applies LIFO (Last In, First Out): the more recently created highlight wins.
 *
 * Returns a clean, non-overlapping array ready for react-highlight-words.
 */
export function resolveHighlightLayers(
  highlights: HighlightSegment[]
): HighlightSegment[] {
  // 1. Sort by offset ascending, then by created_at descending (newest first for LIFO)
  const sorted = [...highlights].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset
    return b.created_at.getTime() - a.created_at.getTime()
  })

  // 2. Resolve overlaps: if current segment overlaps with previous, skip it
  //    (LIFO: the one created later, which appears first after sort, takes priority)
  const resolved: HighlightSegment[] = []
  let lastEnd = -1

  for (const segment of sorted) {
    const segEnd = segment.offset + segment.text_segment.length
    if (segment.offset >= lastEnd) {
      // No overlap — include this segment
      resolved.push(segment)
      lastEnd = segEnd
    } else if (segEnd > lastEnd) {
      // Partial overlap — trim the start of this segment to avoid collision
      // (edge case: only include the non-overlapping tail)
      const trimmedOffset = lastEnd
      const trimmedText = segment.text_segment.slice(lastEnd - segment.offset)
      if (trimmedText.length > 0) {
        resolved.push({
          ...segment,
          offset: trimmedOffset,
          text_segment: trimmedText,
        })
        lastEnd = trimmedOffset + trimmedText.length
      }
      // else: fully overlapped — skip entirely
    }
    // else: fully contained within previous — skip (LIFO: newer already included)
  }

  return resolved
}

/**
 * Converts resolved HighlightSegments to the format expected by react-highlight-words.
 * Groups by color_code for multi-color rendering.
 */
export function toHighlightWords(
  segments: HighlightSegment[]
): { chunks: Array<{ start: number; end: number; highlight: boolean; color: string }> } {
  return {
    chunks: segments.map(s => ({
      start: s.offset,
      end: s.offset + s.text_segment.length,
      highlight: true,
      color: s.color_code,
    })),
  }
}
```

**Usage in QuestionText component:**
```typescript
// components/quiz/QuestionText.tsx
import { resolveHighlightLayers } from '@/lib/highlight-utils'

const resolvedHighlights = resolveHighlightLayers(highlights)
// Pass to react-highlight-words or custom span renderer
```

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

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined')
}

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
  // Reuse existing connection
  if (cached.conn) {
    return cached.conn
  }

  // Reuse in-flight connection promise
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Cold start protection: fail fast instead of hanging indefinitely
      serverSelectionTimeoutMS: 5000,   // 5s to find a server
      connectTimeoutMS: 10000,          // 10s for initial TCP connection
      socketTimeoutMS: 45000,           // 45s for operations (Vercel function limit)
    }).then(m => {
      cached.conn = m
      return m
    }).catch(err => {
      // Reset promise so next invocation retries
      cached.promise = null
      throw err
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    // Propagate as 503-triggering error
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`)
  }

  return cached.conn
}
```

**API route error handling pattern:**
```typescript
// In any API route handler
import { connectDB } from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    await connectDB()
  } catch (err) {
    // connectDB throws after 5s timeout → return 503 immediately
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
  // ... rest of handler
}
```

**Timeout values rationale:**
- `serverSelectionTimeoutMS: 5000` — MongoDB Atlas cold start thường < 3s; 5s là đủ để retry 1 lần
- `connectTimeoutMS: 10000` — TCP handshake timeout, bao gồm DNS resolution
- `socketTimeoutMS: 45000` — Vercel Serverless Functions timeout là 60s; 45s cho phép cleanup
- `bufferCommands: false` — Không buffer queries khi chưa connected; fail fast thay vì queue

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

export const CreateHighlightSchema = z.object({
  question_id: z.string(),
  text_segment: z.string().min(1),
  color_code: z.enum(['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A']),
  offset: z.number().int().min(0),
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

// Atomic update to prevent race conditions
export async function atomicCompleteSession(
  sessionId: string,
  score: number
): Promise<boolean>
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
// Indexes: { email: 1 } unique
```

### Category

```typescript
interface ICategory {
  _id: ObjectId
  name: string            // unique index
  created_at: Date
}
// Indexes: { name: 1 } unique
```

### Quiz (with embedded Questions)

```typescript
interface IQuestion {
  _id: ObjectId
  text: string
  options: string[]       // 2-6 items
  correct_answer: number  // index into options[]
  explanation?: string
  image_url?: string
}

interface IQuiz {
  _id: ObjectId
  title: string
  category_id: ObjectId   // ref: Category
  course_code: string
  questions: IQuestion[]  // embedded array
  created_by: ObjectId    // ref: User (admin)
  created_at: Date
}
// Indexes: { category_id: 1 }, { course_code: 1 }
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
  student_id: ObjectId    // ref: User
  quiz_id: ObjectId       // ref: Quiz
  mode: 'immediate' | 'review'
  status: 'active' | 'completed'
  user_answers: UserAnswer[]
  current_question_index: number
  score: number
  expires_at: Date        // TTL index: 24h from created_at
  started_at: Date
  completed_at?: Date
}
// Indexes:
//   { student_id: 1, quiz_id: 1 }
//   { expires_at: 1 } TTL index (expireAfterSeconds: 0)
```

### UserHighlight

```typescript
interface IUserHighlight {
  _id: ObjectId
  student_id: ObjectId    // ref: User
  question_id: ObjectId   // ref: embedded Question _id
  text_segment: string
  color_code: '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'
  offset: number          // character position in source string
  created_at: Date
}
// Indexes: { student_id: 1, question_id: 1 } compound (for query optimization)
```

---

## API Design

### Auth

**POST /api/auth/register**
- Auth: None
- Body: `{ name, email, password, student_id }`
- Response 201: `{ message: "Account created" }`
- Response 400: Zod validation errors
- Response 409: Email already exists
- Response 503: DB unavailable

**POST /api/auth/login**
- Auth: None
- Rate limit: 5 failed attempts/min/IP
- Body: `{ email, password }`
- Response 200: `{ token: string, role: string }`
- Response 400: Missing fields
- Response 401: Invalid credentials

---

### Categories (Admin)

**GET /api/admin/categories**
- Auth: Admin JWT
- Response 200: `{ categories: ICategory[] }`

**POST /api/admin/categories**
- Auth: Admin JWT
- Body: `{ name: string }`
- Response 201: `{ category: ICategory }`
- Response 409: Name already exists

**PUT /api/admin/categories/[id]**
- Auth: Admin JWT
- Body: `{ name: string }`
- Response 200: `{ category: ICategory }`

**DELETE /api/admin/categories/[id]**
- Auth: Admin JWT
- Response 200: `{ message: "Deleted" }`
- Response 400: Category has associated quizzes

---

### Quizzes (Admin)

**GET /api/admin/quizzes**
- Auth: Admin JWT
- Query: `?page=1&limit=20`
- Response 200: `{ quizzes: IQuiz[], total: number, page: number }`

**POST /api/admin/quizzes**
- Auth: Admin JWT
- Body: `CreateQuizSchema`
- Response 201: `{ quiz: IQuiz }`

**GET /api/admin/quizzes/[id]**
- Auth: Admin JWT
- Response 200: `{ quiz: IQuiz }` (includes correct_answer for admin)

**PUT /api/admin/quizzes/[id]**
- Auth: Admin JWT
- Body: `CreateQuizSchema`
- Response 200: `{ quiz: IQuiz }`

**DELETE /api/admin/quizzes/[id]**
- Auth: Admin JWT
- Response 200: `{ message: "Deleted" }`

---

### Browse (Student)

**GET /api/courses**
- Auth: Student JWT
- Response 200: `{ courses: string[] }` — unique course codes, alphabetical

**GET /api/courses/[code]/quizzes**
- Auth: Student JWT
- Response 200: `{ quizzes: Array<{ _id, title, question_count, best_score: number | null }> }`

**GET /api/search**
- Auth: Student JWT
- Query: `?category=&course_code=&page=1&limit=20`
- Response 200: `{ quizzes: IQuiz[], total: number }` — questions projected (no correct_answer)

---

### Quiz Session (Student)

**POST /api/sessions**
- Auth: Student JWT
- Body: `{ quiz_id: string, mode: 'immediate' | 'review' }`
- Response 201: `{ session_id, question: QuestionProjected, highlights: IUserHighlight[] }`

**GET /api/sessions/[id]**
- Auth: Student JWT (must own session)
- Response 200: `{ session: IQuizSession, question: QuestionProjected, highlights: IUserHighlight[] }`

**POST /api/sessions/[id]/answer**
- Auth: Student JWT (must own session)
- Body: `{ answer_index: number }`
- Response 200 (Immediate): `{ is_correct, correct_answer, explanation, next_question?, session_completed, score? }`
- Response 200 (Review, not last): `{ next_question: QuestionProjected }`
- Response 200 (Review, last): `{ results: FullResult[], score, session_completed: true }`
- Response 409: Session already completed

**GET /api/sessions/[id]/result**
- Auth: Student JWT (must own session)
- Response 200: Full result (only if status === 'completed')
- Response 403: Session not completed

---

### History (Student)

**GET /api/history**
- Auth: Student JWT
- Query: `?page=1&limit=20`
- Response 200: `{ sessions: CompletedSessionSummary[], total: number }`

**GET /api/history/[id]**
- Auth: Student JWT (must own session)
- Response 200: `{ session: IQuizSession, questions: QuestionWithAnswer[] }`

---

### Highlights (Student)

**POST /api/highlights**
- Auth: Student JWT
- Body: `CreateHighlightSchema`
- Response 201: `{ highlight: IUserHighlight }`
- Response 400: Exceeds 10 highlights per question

**DELETE /api/highlights/[id]**
- Auth: Student JWT (must own highlight)
- Response 200: `{ message: "Deleted" }`

---

## Core Logic Design

### Quiz Engine Flow

**Immediate Mode:**
```
POST /api/sessions/[id]/answer
  1. Verify JWT → get student_id
  2. Load QuizSession from DB
  3. Assert session.status !== 'completed' (else 409)
  4. Assert session.student_id === student_id (else 403)
  5. Load Quiz document (for correct_answer)
  6. Compute is_correct = (answer_index === question.correct_answer)
  7. Atomic update:
     $push user_answers, $inc score (if correct), $set current_question_index
  8. If last question: $set status='completed', completed_at=now()
  9. Return { is_correct, correct_answer, explanation, next_question?, score? }
```

**Review Mode:**
```
POST /api/sessions/[id]/answer
  1-4. Same as Immediate
  5. Push answer to user_answers (no correctness computed yet)
  6. If NOT last question:
     $set current_question_index++
     Return { next_question: QuestionProjected } (no correct_answer)
  7. If last question:
     Load full Quiz with correct_answers
     score = calculateScore(user_answers, questions)
     Atomic: $set status='completed', score, completed_at
     Return full results with correct_answer + explanation for each question
```

**Score Calculation (server-side only):**
```typescript
function calculateScore(userAnswers: UserAnswer[], questions: IQuestion[]): number {
  return userAnswers.reduce((score, ua) => {
    const q = questions[ua.question_index]
    return score + (ua.answer_index === q.correct_answer ? 1 : 0)
  }, 0)
}
```

**Race Condition Prevention:**
```typescript
// Atomic update with condition - prevents double-completion
await QuizSession.findOneAndUpdate(
  { _id: sessionId, status: { $ne: 'completed' } },
  { $set: { status: 'completed', score, completed_at: new Date() } },
  { new: true }
)
// If null returned → session was already completed → return 409
```

### Projection Strategy

Questions returned to active sessions always strip sensitive fields:
```typescript
const QuestionProjected = {
  _id: 1, text: 1, options: 1, image_url: 1
  // correct_answer: 0 (excluded)
  // explanation: 0 (excluded unless session completed)
}
```

### Rate Limiting (Login)

Using MongoDB shared limiter with fixed time bucket:
```typescript
// 5 failed attempts per minute per IP
const bucketStart = Math.floor(Date.now() / 60_000) * 60_000
const bucketKey = `login_fail:${ip}:${bucketStart}`

await rateLimitCollection.updateOne(
  { bucketKey },
  {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt: new Date(bucketStart + 120_000) },
  },
  { upsert: true }
)
```

Fallback: in-memory `Map<ip, { count, resetAt }>` only when MongoDB is temporarily unavailable.

---

## UI/UX Design

### Color System

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#5D7B6F` | Buttons, headers, active states |
| `--color-success` | `#A4C3A2` | Correct answer indicator, success alerts |
| `--color-secondary-bg` | `#B0D4B8` | Highlight color 1, secondary backgrounds |
| `--color-app-bg` | `#EAE7D6` | Page background |
| `--color-info` | `#D7F9FA` | Highlight color 2, info alerts |
| `--color-error` | `#E57373` | Incorrect answer indicator |
| `--color-highlight-yellow` | `#FFE082` | Highlight color 3 |
| `--color-highlight-pink` | `#EF9A9A` | Highlight color 4 |

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5D7B6F',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#A4C3A2',
          foreground: '#1A2E1A',
        },
        'secondary-bg': '#B0D4B8',
        'app-bg': '#EAE7D6',
        info: {
          DEFAULT: '#D7F9FA',
          foreground: '#0A3D40',
        },
        error: {
          DEFAULT: '#E57373',
          foreground: '#FFFFFF',
        },
        highlight: {
          sage: '#B0D4B8',
          cyan: '#D7F9FA',
          yellow: '#FFE082',
          pink: '#EF9A9A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

**Lý do dùng Tailwind + shadcn/ui:**
- Tailwind cho phép đổi toàn bộ color scheme chỉ bằng cách sửa `tailwind.config.ts` — không cần tìm kiếm trong hàng trăm file
- shadcn/ui cung cấp các components (Button, Dialog, Card, Input, Select, Badge, Tabs) đã accessible (ARIA compliant) — khớp với Requirement 17
- shadcn/ui không bundle toàn bộ library, chỉ copy source code vào project → bundle size nhỏ

**shadcn/ui components sử dụng:**
- `Button` — tất cả CTA buttons, dùng `variant="default"` với `bg-primary`
- `Card` — Quiz card, Course card, Result card
- `Dialog` — Mode selection modal (Immediate/Review), Confirm delete
- `Input`, `Textarea` — Auth forms, Quiz editor
- `Select` — Category dropdown trong Admin quiz editor
- `Badge` — Course code tags, highlight color chips
- `Tabs` — Admin dashboard navigation
- `Progress` — Quiz progress bar (câu hiện tại / tổng số câu)
- `Tooltip` — Question Map cell hover states

### Page Structure

| Route | Type | Description |
|---|---|---|
| `/` | Server | Landing page |
| `/login` | Client | Login form |
| `/register` | Client | Registration form |
| `/dashboard` | Server | Course Code grid |
| `/courses/[code]` | Server | Quiz list with best scores |
| `/quiz/[id]/mode` | Client | Mode selection (Immediate/Review) |
| `/quiz/[id]/session/[sessionId]` | Client | Quiz taking + Question Map |
| `/quiz/[id]/result/[sessionId]` | Server | Results breakdown |
| `/history` | Server | Paginated history list |
| `/history/[id]` | Server | Session detail with highlights filter |
| `/admin` | Server | Admin dashboard |
| `/admin/categories` | Client | Category CRUD |
| `/admin/quizzes` | Server | Quiz list |
| `/admin/quizzes/new` | Client | Quiz editor (create) |
| `/admin/quizzes/[id]/edit` | Client | Quiz editor (update) |

### Question Map Component (Responsive)

Question Map hiển thị khác nhau tùy theo breakpoint để tối ưu không gian đọc câu hỏi và highlight:

**Desktop (≥ 1024px) — Sidebar layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Quiz Session                                            │
│  ┌─────────────────────────────┐  ┌──────────────────┐  │
│  │                             │  │  Question Map    │  │
│  │   Question text             │  │  ┌──┬──┬──┬──┐  │  │
│  │   (with highlights)         │  │  │ 1│ 2│ 3│ 4│  │  │
│  │                             │  │  ├──┼──┼──┼──┤  │  │
│  │   A) Option 1               │  │  │ 5│ 6│ 7│ 8│  │  │
│  │   B) Option 2               │  │  └──┴──┴──┴──┘  │  │
│  │   C) Option 3               │  │                  │  │
│  │   D) Option 4               │  │  ● answered      │  │
│  │                             │  │  ○ unanswered    │  │
│  │   [Submit Answer]           │  │  ◈ highlighted   │  │
│  └─────────────────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Mobile (< 1024px) — Drawer layout (vuốt từ dưới lên):**
```
┌──────────────────────────┐
│  Quiz Session            │
│                          │
│  Question text           │
│  (with highlights)       │
│                          │
│  A) Option 1             │
│  B) Option 2             │
│  C) Option 3             │
│  D) Option 4             │
│                          │
│  [Submit Answer]         │
│                          │
│  ════════════════════    │  ← drag handle
│  [Map] 3/10 answered     │  ← collapsed state (always visible)
└──────────────────────────┘

  ↕ Swipe up / tap [Map] to expand:

┌──────────────────────────┐
│  ════════════════════    │
│  Question Map            │
│  ┌──┬──┬──┬──┬──┐       │
│  │ 1│ 2│ 3│ 4│ 5│       │
│  ├──┼──┼──┼──┼──┤       │
│  │ 6│ 7│ 8│ 9│10│       │
│  └──┴──┴──┴──┴──┘       │
│                          │
│  ● answered  ○ unanswered│
└──────────────────────────┘
```

**Implementation:**
- Desktop: `hidden lg:block` sidebar với `w-48` fixed width, sticky position
- Mobile: shadcn/ui `Drawer` component (từ `vaul` library, bundled với shadcn/ui)
  - Collapsed state: luôn hiển thị progress bar `"3/10 answered"` + drag handle
  - Expanded state: full grid của tất cả câu hỏi
- Shared `QuestionMapGrid` component dùng chung cho cả 2 layouts
- Cell states dùng Tailwind classes:
  - Unanswered: `bg-white border border-gray-300`
  - Answered: `bg-success text-success-foreground`
  - Has highlight: `bg-info`
  - Current: `ring-2 ring-primary`
  - Answered + highlighted: `bg-success ring-2 ring-info` (answered takes priority for fill)

**shadcn/ui Drawer setup:**
```bash
npx shadcn-ui@latest add drawer
# Drawer uses vaul under the hood - no extra install needed
```

### Highlight System UI

- Text selection via `Window.getSelection()` API
- Color picker appears as floating toolbar on text selection
- 4 color swatches: `#B0D4B8`, `#D7F9FA`, `#FFE082`, `#EF9A9A`
- Max 10 highlights per question (enforced client + server)
- Highlights rendered via `react-highlight-words` or custom span overlay
- History view: filter highlights by color chip buttons

---

## Security Design

### CSP Configuration (`next.config.js`)

```javascript
const ALLOWED_IMAGE_DOMAINS = [
  'res.cloudinary.com',
  'images.unsplash.com',
  // add more as needed
]

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: ${ALLOWED_IMAGE_DOMAINS.join(' ')};
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
`.replace(/\n/g, ' ')

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: cspHeader }] }]
  }
}
```

### Environment Variables

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random 256-bit secret>
ALLOWED_IMAGE_DOMAINS=res.cloudinary.com,images.unsplash.com
```

### Image URL Domain Validation

```typescript
function isAllowedImageDomain(url: string): boolean {
  const allowed = process.env.ALLOWED_IMAGE_DOMAINS?.split(',') ?? []
  try {
    const { hostname } = new URL(url)
    return allowed.includes(hostname)
  } catch {
    return false
  }
}
```

---

## Error Handling

| Scenario | HTTP Status | Response Shape |
|---|---|---|
| Zod validation failure | 400 | `{ errors: { field: string, message: string }[] }` |
| Missing auth token | 401 | `{ error: "Unauthorized" }` |
| Expired JWT | 401 | `{ error: "Token expired" }` |
| Insufficient role | 403 | `{ error: "Forbidden" }` |
| Access other user's resource | 403 | `{ error: "Forbidden" }` |
| Resource not found | 404 | `{ error: "Not found" }` |
| Duplicate resource | 409 | `{ error: "Already exists" }` |
| Session already completed | 409 | `{ error: "Session already completed" }` |
| Image domain not allowed | 400 | `{ error: "Image domain not allowed" }` |
| DB unavailable | 503 | `{ error: "Service unavailable" }` |
| Unhandled server error | 500 | `{ error: "Internal server error" }` |

All API routes wrap handlers in try/catch. DB connection errors caught in `connectDB()` propagate as 503.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before listing properties, redundancy analysis:
- 7.5 and 8.4 both test score integrity (server-side calculation) → merged into Property 5
- 12.1 and 12.3 both test correct_answer projection → merged into Property 6
- 6.1 and 6.2 both test session creation data → merged into Property 3
- 2.3 and 3.5 both test JWT role enforcement → merged into Property 2

### Property 1: Registration accepts any valid input

*For any* combination of valid name, email (RFC 5322), password (≥8 chars), and student_id, calling the register endpoint SHALL create a new account and return a success response.

**Validates: Requirements 1.2**

### Property 2: Role-based access control

*For any* protected endpoint, a request without a valid JWT of the required role SHALL be rejected with HTTP 401 or 403; a request with a valid JWT of the correct role SHALL be granted access.

**Validates: Requirements 2.3, 3.5, 4.6**

### Property 3: Session creation preserves mode and assigns unique ID

*For any* valid quiz and mode (immediate or review), creating a Quiz_Session SHALL produce a document with a unique session ID, the correct mode recorded, a start timestamp, and the first question returned without the `correct_answer` field.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 4: Answer persistence and session resume

*For any* active Quiz_Session, submitting an answer SHALL persist it to `user_answers` in MongoDB such that resuming the session returns the same `current_question_index` and all previously submitted answers.

**Validates: Requirements 13.1, 13.3**

### Property 5: Score integrity — server-side calculation only

*For any* completed Quiz_Session, the stored `score` SHALL equal the count of entries in `user_answers` where `answer_index` matches the `correct_answer` stored in the Quiz document in MongoDB, regardless of any value submitted by the client.

**Validates: Requirements 7.5, 8.4**

### Property 6: Correct answer projection — never exposed in active sessions

*For any* response from the Quiz_Engine for an active (non-completed) session, the `correct_answer` and `explanation` fields SHALL be absent from all Question objects in the response payload.

**Validates: Requirements 12.1, 12.3**

### Property 7: Completed session immutability

*For any* Quiz_Session with `status === 'completed'`, submitting a new answer SHALL return HTTP 409 and the `user_answers` array SHALL remain unchanged.

**Validates: Requirements 13.6**

### Property 8: Highlight privacy isolation

*For any* student A, querying highlights SHALL never return documents where `student_id` belongs to a different student B.

**Validates: Requirements 16.5**

### Property 9: Highlight round-trip persistence

*For any* highlight created with valid fields (student_id, question_id, text_segment, color_code, offset), retrieving highlights for that student and question SHALL include a document with all submitted field values preserved.

**Validates: Requirements 16.2**

### Property 10: Highlight limit enforcement

*For any* question, attempting to create an 11th highlight for the same student SHALL be rejected, and the highlight count for that question SHALL remain at 10.

**Validates: Requirements 17.5**

### Property 11: Search filter correctness

*For any* search query with category and/or course_code filters, all returned quizzes SHALL satisfy all provided filter criteria, and the matching SHALL be case-insensitive.

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 12: Password validation rejects short passwords

*For any* registration attempt with a password of length 1–7 characters, the Auth_Service SHALL return a validation error and SHALL NOT create an account.

**Validates: Requirements 1.4**

---

## Testing Strategy

### Dual Testing Approach

Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify universal properties across many generated inputs.

### Property-Based Testing Library

Use **fast-check** (TypeScript-native PBT library) for all property tests.

```bash
npm install --save-dev fast-check
```

Each property test runs minimum **100 iterations** (fast-check default is 100).

Tag format for each test:
```typescript
// Feature: quiz-platform, Property N: <property_text>
```

### Property Test Mapping

| Property | Test File | fast-check Arbitraries |
|---|---|---|
| P1: Registration | `__tests__/auth.property.test.ts` | `fc.emailAddress()`, `fc.string({ minLength: 8 })` |
| P2: Role-based access | `__tests__/auth.property.test.ts` | `fc.constantFrom('admin', 'student')` |
| P3: Session creation | `__tests__/session.property.test.ts` | `fc.constantFrom('immediate', 'review')` |
| P4: Answer persistence | `__tests__/session.property.test.ts` | `fc.integer({ min: 0, max: 5 })` |
| P5: Score integrity | `__tests__/quiz-engine.property.test.ts` | `fc.array(fc.integer({ min: 0, max: 5 }))` |
| P6: Projection safety | `__tests__/quiz-engine.property.test.ts` | `fc.record(...)` |
| P7: Session immutability | `__tests__/session.property.test.ts` | `fc.integer({ min: 0, max: 5 })` |
| P8: Highlight privacy | `__tests__/highlights.property.test.ts` | `fc.uuid()` for student IDs |
| P9: Highlight round-trip | `__tests__/highlights.property.test.ts` | `fc.string()`, `fc.integer()` |
| P10: Highlight limit | `__tests__/highlights.property.test.ts` | `fc.array(..., { maxLength: 10 })` |
| P11: Search correctness | `__tests__/search.property.test.ts` | `fc.string()` for category/course |
| P12: Password validation | `__tests__/auth.property.test.ts` | `fc.string({ maxLength: 7 })` |

### Unit Test Coverage

- Auth: register/login happy path, duplicate email, expired token, missing fields
- Admin CRUD: category/quiz create-read-update-delete with concrete examples
- Session: mode selection, resume, expiry (TTL), race condition (concurrent completion)
- Highlights: create, delete, color filter
- Error handling: 400/401/403/404/409/503 for each endpoint

### Integration Tests

- MongoDB Atlas connection (smoke test)
- Vercel Serverless Function cold start behavior
- TTL index expiry (QuizSession auto-delete after 24h)
- Rate limiting on `/api/auth/login`
