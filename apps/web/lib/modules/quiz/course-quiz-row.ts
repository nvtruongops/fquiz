export function mapCourseQuizRow(quiz: any, scoreMap: Map<string, number>) {
  return {
    _id: quiz._id,
    title: quiz.title,
    questionCount: quiz.questionCount || 0,
    bestScore: scoreMap.get(quiz._id.toString()) ?? null,
  }
}
