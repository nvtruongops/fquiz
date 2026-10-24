# 🔌 FQuiz — API Specification Index (`docs/API.md`)

This document details the comprehensive catalog of **80+ API Route Handlers** within the FQuiz platform, including data formats, authentication protocols, role-based authorization, and standardized error codes.

---

## 1. General Conventions

### 1.1. Base URL & Versioning
- **Internal App API**: `/api/*` (optimized for Next.js Frontend consumption).
- **Public API v1**: `/api/v1/*` (tailored for external integrations and mobile applications).

### 1.2. Authentication & Headers
- **Authentication**: Provided via HTTP-Only `auth-token` cookie or HTTP Header `Authorization: Bearer <token>`.
- **CSRF Protection**: Browser-initiated mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include the header:
  ```http
  x-csrf-token: <csrf-token-cookie-value>
  ```
- **Content-Type**: `application/json` (except file upload endpoints using `multipart/form-data`).

### 1.3. Standard Response Envelope

```typescript
// Successful response envelope
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

// Error response envelope
interface ErrorResponse {
  success: false;
  error: {
    code: string;       // Unique machine code (e.g., 'UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_ERROR')
    message: string;    // User-friendly descriptive error message
    details?: unknown;  // Detailed Zod schema validation breakdown (if applicable)
  };
}
```

---

## 2. API Endpoints Catalog

### 2.1. Authentication & Account (`/api/auth/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new student account and dispatch an OTP verification code |
| `POST` | `/api/auth/login` | Public | Authenticate via email/username + password, issuing a JWT cookie |
| `POST` | `/api/auth/logout` | Authenticated | Terminate session and revoke the `auth-token` cookie |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile, roles, and session metadata |
| `POST` | `/api/auth/forgot-password` | Public | Request a password reset OTP delivered via email |
| `POST` | `/api/auth/reset-password` | Public | Reset password using a valid OTP token |
| `POST` | `/api/auth/restore-account` | Public | Restore an account scheduled for deletion within the 30-day grace period |
| `POST` | `/api/auth/google` | Public | Authenticate or register via Google OAuth |

---

### 2.2. Quiz Sessions (`/api/sessions/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | Public / Student | Initialize a new quiz session and snapshot questions into cache |
| `GET` | `/api/sessions/[id]` | Public / Student | Retrieve quiz session metadata and progress status |
| `GET` | `/api/sessions/[id]/questions` | Public / Student | Load all snapshotted questions from the session cache |
| `POST` | `/api/sessions/[id]/answer` | Public / Student | Submit an answer for a specific question (Server-authoritative evaluation) |
| `POST` | `/api/sessions/[id]/submit` | Public / Student | Finalize quiz session, execute score calculation, and mark completed |
| `GET` | `/api/sessions/[id]/result` | Public / Student | Fetch final exam results, score analytics, and mistake breakdowns |
| `POST` | `/api/sessions/[id]/activity` | Public / Student | Log heartbeat telemetry: pause, resume, or tab focus/blur events |
| `POST` | `/api/sessions/mix` | Student | Synthesize and initialize a multi-category randomized test (Mix Quiz) |

---

### 2.3. Student Portal (`/api/student/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/student/dashboard` | Student | Fetch student summary metrics: progress, completed tests, streak |
| `GET` | `/api/student/quizzes` | Student | List quizzes authored by the student |
| `POST` | `/api/student/save-quiz` | Student | Save a public quiz into the student's personal study collection |
| `GET` | `/api/student/categories` | Student | Retrieve personalized category listings |
| `GET/POST` | `/api/student/pinned-categories` | Student | Manage prioritized categories pinned to the studio header |
| `GET/POST` | `/api/student/pinned-questions` | Student | Pin challenging questions for focused review or customized practice |
| `GET/POST` | `/api/student/pinned-quizzes` | Student | Pin key quizzes to the student dashboard |
| `GET/PUT` | `/api/student/profile` | Student | Retrieve and update personal profile details |
| `GET/PUT` | `/api/student/settings` | Student | Update theme preferences, notifications, and default exam modes |
| `GET` | `/api/student/classrooms` | Student | List virtual classrooms in which the student is enrolled |
| `POST` | `/api/student/classrooms/join` | Student | Enroll in a new classroom using an invitation code (Classroom Code) |
| `DELETE` | `/api/student/account` | Student | Schedule account for permanent deletion (30-day grace period queue) |

---

### 2.4. Teacher Portal (`/api/teacher/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET/POST` | `/api/teacher/classrooms` | Teacher / Admin | List and create virtual classrooms managed by the teacher |
| `GET/PUT/DELETE`| `/api/teacher/classrooms/[id]`| Teacher / Admin | Inspect, modify, or archive a specific classroom |
| `GET` | `/api/teacher/classrooms/[id]/members` | Teacher / Admin | List enrolled students, participation status, and aggregated performance |
| `DELETE` | `/api/teacher/classrooms/[id]/members/[studentId]` | Teacher / Admin | Remove an enrolled student from the classroom |
| `GET/POST` | `/api/teacher/assignments` | Teacher / Admin | List and dispatch new quiz assignments to classrooms |
| `GET/PUT/DELETE`| `/api/teacher/assignments/[id]`| Teacher / Admin | Configure assignment deadlines, attempt caps, and passing thresholds |
| `GET` | `/api/teacher/assignments/[id]/progress`| Teacher / Admin | Inspect student submission statuses, score distributions, and answer history |

---

### 2.5. Standalone System Admin Portal (`apps/admin` — `/api/*`)

*All administrative APIs execute exclusively in the `apps/admin` workspace (`https://fquiz-admin.vercel.app`), completely segregated from the Web Student application.*

| Method | Endpoint (`apps/admin`) | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List and search user accounts |
| `PUT/DELETE` | `/api/users/[id]` | Admin | Update attributes or delete a user account |
| `GET/POST` | `/api/quizzes` | Admin | Author, inspect, and manage system-wide standardized quizzes |
| `GET/PUT/DELETE` | `/api/quizzes/[id]` | Admin | Retrieve, modify, or delete specific quizzes |
| `GET` | `/api/quizzes/check-code` | Admin | Verify uniqueness of quiz codes prior to publishing |
| `GET/POST` | `/api/categories` | Admin | Manage system-wide categories and curriculum taxonomy |
| `GET/PUT` | `/api/settings` | Admin | Configure global parameters (Maintenance mode, Rate limits, LLM keys) |
| `GET` | `/api/feedback` | Admin | Inspect user feedback submissions |
| `PUT/DELETE` | `/api/feedback/[id]` | Admin | Update or delete a feedback item |
| `POST` | `/api/feedback/[id]/reply` | Admin | Send an email response to a feedback author |
| `GET/POST` | `/api/question-bank/*` | Admin | Manage migrations, inspect question conflicts, and synchronize banks |

---

### 2.6. Question Bank & Import (`/api/question-bank/*`, `/api/import/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/question-bank/list` | Authenticated | Browse, search, and filter shared Question Bank items |
| `POST` | `/api/question-bank/check` | Authenticated | Audit question duplication or answer conflicts via SHA-256 fingerprinting |
| `POST` | `/api/question-bank/sync` | Authenticated | Ingest and synchronize quiz questions into the central Question Bank |
| `POST` | `/api/question-bank/sync-update` | Authenticated | Propagate question edits to all quizzes referencing the item |
| `GET` | `/api/question-bank/analytics` | Admin | Aggregate statistics on question volume, duplication rate, and conflict count |
| `POST` | `/api/import/quiz` | Authenticated | Parse and validate uploaded test files (JSON/TXT) before quiz ingestion |

---

### 2.7. Artificial Intelligence Services (`/api/v1/ai/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/ai/generate` | Authenticated | Generate structured learning content (11 prompt types) via Gemini/OpenAI |
| `POST` | `/api/v1/ai/quiz-assistant` | Authenticated | Real-time exam assistant: concept breakdowns, mistake analysis |
| `GET` | `/api/v1/ai/history` | Authenticated | Fetch generation logs, token consumption, and latency telemetry |

---

### 2.8. Community & Explore (`/api/community/*`, `/api/explore/*`, `/api/courses/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET/POST` | `/api/community/posts` | Student | Browse community discussions and publish new study posts |
| `GET/PUT/DELETE`| `/api/community/posts/[id]` | Student | Inspect, modify, or delete the author's own post |
| `POST` | `/api/community/posts/[id]/comments`| Student | Post comments on community discussion threads |
| `POST` | `/api/community/posts/[id]/like` | Student | Toggle like status on posts |
| `GET` | `/api/explore/categories` | Public | List categories available for public quiz discovery |
| `GET` | `/api/courses/[code]` | Public | Fetch curriculum track and quizzes associated with a course code |

---

### 2.9. Scheduled Jobs (`/api/jobs/*`)

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/jobs/cleanup-deleted-accounts` | Cron / Secret | Permanently purge soft-deleted user records exceeding the 30-day grace period |

---

## 3. Standard Error Codes Table

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Unauthenticated request or invalid/expired JWT token |
| `FORBIDDEN` | 403 | Insufficient RBAC permissions to access resource |
| `NOT_FOUND` | 404 | Target resource does not exist |
| `VALIDATION_ERROR` | 400 | Request payload failed Zod schema validation |
| `CONFLICT` | 409 | Resource state conflict (e.g., Email exists, Session already completed) |
| `RATE_LIMIT_EXCEEDED`| 429 | Request rate exceeded allowed sliding window threshold |
| `CSRF_ERROR` | 403 | Missing or mismatched `x-csrf-token` header value |
| `MAINTENANCE_MODE` | 503 | Platform is temporarily offline for maintenance |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled server-side exception |
