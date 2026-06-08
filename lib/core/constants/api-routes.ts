/**
 * Centralized API Routes Configuration
 * Ensures DRY and easier API versioning/prefixes across the application.
 */

export const API_ROUTES = {
  AUTH: {
    ME: '/api/auth/me',
  },
  STUDENT: {
    DASHBOARD: '/api/student/dashboard',
    PINNED_CATEGORIES: '/api/student/pinned-categories',
    QUIZZES: (id: string) => `/api/student/quizzes/${id}`,
    EXPLORE_QUIZZES: '/api/v1/explore/quizzes',
  },
  PUBLIC: {
    CATEGORIES: '/api/v1/public/categories',
    QUIZZES: '/api/v1/public/quizzes',
    QUIZ_DETAIL: (id: string) => `/api/v1/public/quizzes/${id}`,
    QUIZ_COMMENTS: (id: string) => `/api/v1/public/quizzes/${id}/comments`,
  },
  SESSIONS: {
    BASE: '/api/sessions',
    DETAIL: (id: string) => `/api/sessions/${id}`,
    QUESTIONS: (id: string) => `/api/sessions/${id}/questions`,
  }
} as const
