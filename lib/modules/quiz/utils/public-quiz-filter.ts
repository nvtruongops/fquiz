/**
 * Standard filter predicate for Public Quizzes in FQuiz.
 * Shared across /explore APIs, QuestionUsageService, and QuestionBank syncing.
 *
 * Rules:
 * - is_public MUST be true
 * - status MUST be 'published'
 * - is_temp MUST NOT be true (excludes temporary/mix/practice sessions)
 * - is_saved_from_explore MUST NOT be true (excludes student personal saved copies)
 */
export function getPublicQuizFilter(): Record<string, unknown> {
  return {
    is_public: true,
    status: 'published',
    is_temp: { $ne: true },
    is_saved_from_explore: { $ne: true },
  }
}
