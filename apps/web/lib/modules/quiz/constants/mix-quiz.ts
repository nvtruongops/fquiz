export const MIX_QUIZ_MAX_SELECT = 5 // Maximum 5 quizzes selectable
export const MIX_QUIZ_MAX_QUESTIONS = 150 // Maximum 150 questions
export const MIX_QUIZ_QUESTION_OPTIONS = [30, 60, 90, 150] // Question count options
// TTL removed — session persists until completed or manually deleted by user
export const MIX_QUIZ_COURSE_CODE_PREFIX = 'temp_' // Temporary course_code prefix
export const MIX_QUIZ_MAX_CONCURRENT = 1 // Each user can only have 1 active mix quiz at a time
export const MIX_QUIZ_RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 100 : 5 // Maximum creations / hour / user
export const MIX_QUIZ_RATE_LIMIT_WINDOW = 60 * 60 // Rate limit window: 3600 seconds (1 hour)
