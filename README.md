# FQuiz — Nền tảng thi trắc nghiệm

Nền tảng quiz hiện đại hỗ trợ 3 chế độ thi (trắc nghiệm tức thì, ôn tập, flashcard), quản lý ngân hàng câu hỏi, và mix quiz. Xây dựng trên Next.js 16 App Router + MongoDB.

## Tính năng chính

### Cho học viên (Student)
- **3 chế độ thi**: Immediate (chấm ngay), Review (nộp cuối), Flashcard (lật thẻ ghi nhớ)
- **Mix Quiz**: Trộn câu hỏi từ nhiều bộ đề, độ khó sequential/random
- **Giao diện responsive**: Desktop (3 cột) và Mobile (tối ưu cảm ứng)
- **Tạo quiz riêng**: Editor kéo-thả, import JSON/TXT, tích hợp ngân hàng câu hỏi
- **Dashboard**: Theo dõi tiến độ học tập, lịch sử thi
- **Khám phá**: Duyệt quiz công khai theo danh mục, lưu về thư viện cá nhân

### Cho quản trị viên (Admin)
- Quản lý users, quizzes, categories, feedback
- **Ngân hàng câu hỏi (Question Bank)**: Phát hiện conflict, migrate, auto-sync
- Cấu hình site settings (maintenance mode, rate limit, public access)

### Bảo mật & Hạ tầng
- **Xác thực**: JWT (jose) + bcryptjs, token versioning, email verification
- **CSRF protection**: Double-submit cookie pattern (`withCsrfHeaders`)
- **Rate limiting**: Riêng cho public API
- **Maintenance mode**: Qua site settings, tự động redirect
- **Queue**: Upstash QStash cho background jobs (mail, quiz stats, mix quiz)
- **Logging**: Pino structured logger

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Ngôn ngữ | TypeScript 5 (strict mode) |
| Database | MongoDB + Mongoose 9 |
| Server state | TanStack React Query 5 |
| Client state | Zustand 5 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Animation | Framer Motion 12 |
| 3D | React Three Fiber + Drei |
| Validation | Zod 4 |
| Auth | jose (JWT) + bcryptjs |
| Email | Nodemailer |
| Queue | Upstash QStash |
| Images | Cloudinary |
| Logging | Pino |
| Test | Jest + ts-jest |
| Lint | ESLint (next/core-web-vitals + security + sonarjs) |

## Cấu trúc dự án

```
.
├── app/                      # Next.js App Router
│   ├── (auth)/               # Route group: login, register, forgot/reset password
│   ├── (student)/            # Route group: dashboard, courses, history, profile, etc.
│   ├── (admin)/admin/        # Route group: users, quizzes, categories, question-bank
│   ├── quiz/[id]/            # Quiz detail, session (desktop/mobile/flashcard), result
│   ├── explore/              # Khám phá quiz công khai
│   └── api/                  # 69 API route handlers
│       ├── auth/             # Xác thực
│       ├── admin/            # Admin endpoints
│       ├── student/          # Student endpoints
│       ├── sessions/         # Quiz session lifecycle
│       ├── question-bank/    # Ngân hàng câu hỏi
│       ├── courses/          # Courses
│       └── v1/public/        # Public API v1
├── components/
│   ├── quiz/
│   │   ├── detail/           # Quiz detail: header, stats, comments, action card
│   │   ├── explore/          # Khám phá: content, sidebar, display, search
│   │   ├── question-bank/    # Ngân hàng CH: browser, warning, conflict, import
│   │   ├── session/          # Phiên thi: layout, display, modals, header, sidebar, flashcard
│   │   ├── editor/           # Editor: control panel, metadata, question card, progress
│   │   └── shared/           # Dùng chung: loader, timer, badge, upload, tabs
│   └── shared/
│       ├── ui/               # shadcn/ui primitives (button, dialog, select, etc.)
│       ├── providers/        # React providers (QueryClient)
│       └── ErrorBoundary.tsx # Error boundary cho session pages
├── lib/
│   ├── core/                 # Hạ tầng chung
│   │   ├── db/mongodb.ts     # Connection pool + DNS SRV fallback
│   │   ├── security/         # CSRF, rate-limit
│   │   ├── queue/qstash.ts   # Background job queue
│   │   ├── mail/mail.ts      # Email (Nodemailer)
│   │   ├── schemas/common.ts # Zod schemas dùng chung
│   │   └── utils/            # cn helper, logger, format, cache invalidation
│   └── modules/
│       ├── auth/             # Auth logic, JWT, models, withAuth() HOF
│       └── quiz/             # Quiz engine, types, schemas, models, feedback-utils, session-api, quiz-import
├── hooks/
│   ├── quiz/                 # useSubmitAnswer, useFlashcardSession, useQuizSessionQueries, useSessionHydration, useSessionAnswerSync, useSessionActivityTracking, useSessionFinalize
│   ├── auth/useAuth.ts       # Auth state hook
│   └── shared/useDebounce.ts
├── store/
│   ├── quiz/quiz-session.store.ts  # Zustand — quiz session state
│   └── shared/toast-store.ts       # Zustand — toast notifications
├── proxy.ts                  # Next.js middleware (CORS, JWT, CSRF, maintenance)
├── scripts/                  # CLI: seed, migrate, audit, performance tests
├── Docs/                     # ui-colors, requirements, design, security
└── public/                   # Static assets + sample quiz files
```

## Bắt đầu

### Yêu cầu
- Node.js 18+
- MongoDB Atlas (hoặc local MongoDB 7+)

### Cài đặt

```bash
git clone <repo-url>
cd FQuiz
cp .env.example .env.local
# Điền các biến môi trường vào .env.local
npm install
npm run dev        # → http://localhost:3000
```

### Biến môi trường

| Biến | Mô tả |
|------|-------|
| `MONGODB_URI` | MongoDB connection string (srv:// hoặc standard) |
| `JWT_SECRET` | JWT signing key (tối thiểu 32 ký tự) |
| `JWT_SECRET_PREV` | Khóa JWT cũ để hỗ trợ token rotation |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_APP_PASSWORD`, `MAIL_FROM` | Cấu hình SMTP (Gmail App Password) |
| `CLOUDINARY_*`, `NEXT_PUBLIC_CLOUDINARY_*` | Cloudinary credentials cho upload ảnh |
| `ALLOWED_IMAGE_DOMAINS` | Domains được phép cho next/image (phân cách bởi dấu phẩy) |
| `LOG_LEVEL` | Mức log: trace, debug, info, warn, error (mặc định: info) |
| `NEXT_PUBLIC_API_BASE_URL` | (Tùy chọn) Base URL cho API calls, để trống nếu same-origin |

## Scripts

```bash
npm run dev              # Chạy development server
npm run build            # Build production
npm run lint             # ESLint check
npm run test             # Chạy Jest unit tests

# Seed dữ liệu
npm run seed             # Seed tài khoản mẫu (admin + student)
npm run seed:public-quizzes  # Seed quiz công khai

# Audit & sửa lỗi dữ liệu
npm run audit:quiz-codes     # Kiểm tra mã quiz trùng lặp
npm run cleanup:quiz-codes   # Sửa mã quiz trùng lặp
npm run audit:answer-conflicts  # Kiểm tra conflict đáp án
npm run reconcile:question-bank # Đồng bộ ngân hàng câu hỏi

# Migrate
npm run migrate:preserve-results          # Bảo toàn kết quả session đã hoàn thành
npm run migrate:preserve-results:dry-run  # Dry-run trước khi migrate

# Performance tests
npm run test:performance   # Test hiệu năng quiz
npm run test:mongodb       # Test hiệu năng MongoDB
npm run test:session-perf  # Test tốc độ tạo session
npm run test:answer-perf   # Test tốc độ xử lý câu trả lời

# Tiện ích
npm run check:dashboard    # Kiểm tra dữ liệu dashboard
npm run cleanup:images     # Dọn ảnh orphan trên Cloudinary
```

## API

### Auth
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/logout` | Student |
| GET | `/api/auth/me` | Student |

### Quiz Sessions
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/sessions` | Tạo session mới |
| GET | `/api/sessions/[id]` | Lấy thông tin session |
| GET | `/api/sessions/[id]/questions` | Lấy tất cả câu hỏi |
| POST | `/api/sessions/[id]/answer` | Nộp câu trả lời |
| POST | `/api/sessions/[id]/submit` | Nộp bài |
| GET | `/api/sessions/[id]/result` | Kết quả |
| POST | `/api/sessions/[id]/activity` | Báo cáo pause/resume |

### Admin
| Method | Endpoint |
|--------|----------|
| GET/POST | `/api/admin/quizzes` |
| GET/PUT/DELETE | `/api/admin/quizzes/[id]` |
| GET/POST | `/api/admin/categories` |
| GET/POST | `/api/admin/users` |
| GET/POST | `/api/admin/settings` |

### Public API v1
| Method | Endpoint |
|--------|----------|
| GET | `/api/v1/public/quizzes` |
| GET | `/api/v1/public/quizzes/[id]` |
| GET | `/api/v1/explore/quizzes` |

## Triển khai

Dự án được triển khai trên **Vercel** (region: `sin1` — Singapore) với automatic deployments từ branch `main`.

```bash
# Build & deploy thủ công
npm run build
vercel deploy --prod
```

## Kiến trúc

### Pattern xác thực route handler
```ts
// withAuth HOF — lib/modules/auth/with-auth.ts
export const GET = withAuth(async (req, { params, payload }) => {
  // payload.userId, payload.role đã được xác thực
  return NextResponse.json({ data })
}, { roles: ['student'] })
```

### Pattern quiz session
1. Client tạo session qua `POST /api/sessions`
2. Server cache câu hỏi vào `session.questions_cache` để tránh query DB mỗi lần submit
3. Client preload tất cả câu hỏi qua `GET /api/sessions/[id]/questions`
4. Mỗi câu trả lời gọi `POST /api/sessions/[id]/answer` — engine chấm dựa trên cache
5. Khi nộp bài: `POST /api/sessions/[id]/submit` — tính điểm final, complete session

### State flow (client)
```
useQuery (server state) → hydration → Zustand store (client state)
                                       ↓
                              useSessionAnswerSync
                              useSessionActivityTracking
```
