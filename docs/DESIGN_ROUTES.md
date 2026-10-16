# 🗺️ FQuiz — Page Route Architecture Index (`docs/DESIGN_ROUTES.md`)

The FQuiz platform is structured as a **Pure Symmetrical Turborepo Monorepo** comprising two independent applications with fully isolated domains and codebases:

---

## 1. Student & Teacher Web Portal (`apps/web` — Port 3000 / `https://fquiz-web.vercel.app`)

| Route Group | Path | Audience | Description |
|---|---|---|---|
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/restore-account` | Guests | Authentication workflows: login, registration, password recovery |
| `(student)` | `/dashboard`, `/history`, `/history/[id]/[sessionId]`, `/community`, `/profile`, `/settings`, `/student/classrooms` | Students | Personal learning studio, classrooms, study history, community forum |
| `(teacher)` | `/teacher/classrooms`, `/teacher/classrooms/[id]`, `/teacher/quizzes`, `/teacher/quizzes/new` | Teachers | Classroom management, assignment dispatching, gradebook reports |
| `quiz/` | `/quiz/[id]`, `/quiz/[id]/mode`, `/quiz/[id]/session/[sessionId]`, `/quiz/[id]/session/[sessionId]/flashcard`, `/quiz/[id]/session/[sessionId]/mobile`, `/quiz/[id]/session/[sessionId]/flashcard/mobile`, `/quiz/[id]/result/[sessionId]` | All Users | Cross-device quiz execution room (Desktop, Mobile, Flashcard, Results) |
| Public | `/`, `/explore`, `/courses/[code]`, `/privacy`, `/terms`, `/maintenance` | Public | Home landing page, public course discovery, legal policies, maintenance fallback |

> 🛡️ **Web Middleware (`apps/web/proxy.ts`)**: Any incoming request to `/admin` or `/admin/*` on the Web app is redirected to the dedicated Admin Portal (`NEXT_PUBLIC_ADMIN_URL`). Any request to `/api/admin/*` returns `404 Not Found`.

---

## 2. System Admin Portal (`apps/admin` — Port 3001 / `https://fquiz-admin.vercel.app`)

| Subsystem | Path | Access | Description |
|---|---|---|---|
| **Auth** | `/login` | Admin / Dev | Dedicated administrative login portal |
| **Overview** | `/` (Dashboard) | Admin / Dev | System overview metrics, examination activity analytics |
| **Quizzes** | `/quizzes`, `/quizzes/new`, `/quizzes/[id]/edit` | Admin / Dev | Standardized quiz authoring, editing, and Question Bank synchronization |
| **Users** | `/users` | Admin / Dev | User account management, role assignment, account bans, password resets |
| **Categories** | `/categories` | Admin / Dev | System-wide course and category taxonomy management |
| **Question Bank** | `/question-bank` | Admin / Dev | Conflict resolution, batch migrations, and question bank deduplication |
| **Settings** | `/settings` | Admin / Dev | System configuration, LLM API keys, maintenance mode toggle |
| **Feedback** | `/feedback` | Admin / Dev | User feedback intake, review, and resolution tracking |

> 🛡️ **Admin Middleware (`apps/admin/proxy.ts`)**: Implements a Zero-Trust RBAC Proxy, denying all non-admin requests and redirecting unauthorized visitors to `/login`.
