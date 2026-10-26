import { generateQuestionId } from './question-id-generator'

function addQuizQuestions(questions: Map<string, any>, quiz: any) {
  const code = (quiz.course_code || '').trim().toUpperCase()
  if (!code || code.startsWith('MIX_') || code.startsWith('TEMP_')) return

  for (const question of Array.isArray(quiz.questions) ? quiz.questions : []) {
    const id = question.question_id || generateQuestionId(question)
    if (!id) continue
    let entry = questions.get(id)
    if (!entry) {
      entry = {
        categoryId: quiz.category_id,
        text: question.text,
        options: question.options,
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        imageUrl: question.image_url,
        createdBy: quiz.created_by,
        courseCodes: new Set<string>(),
        quizIds: new Set<string>(),
      }
      questions.set(id, entry)
    }
    entry.courseCodes.add(code)
    entry.quizIds.add(String(quiz._id))
  }
}

function buildBulkOperations(questions: Map<string, any>) {
  return Array.from(questions, ([questionId, data]) => {
    const codes = Array.from(data.courseCodes)
    return {
      updateOne: {
        filter: { question_id: questionId },
        update: {
          $set: {
            category_id: data.categoryId,
            text: data.text,
            options: data.options,
            correct_answer: data.correctAnswer,
            explanation: data.explanation,
            image_url: data.imageUrl,
            used_in_quizzes: codes,
            used_in_quiz_ids: Array.from(data.quizIds),
            usage_count: codes.length,
          },
          $setOnInsert: { created_by: data.createdBy },
        },
        upsert: true,
      },
    }
  })
}

export function buildQuestionBankOperations(publicQuizzes: any[]) {
  const questions = new Map<string, any>()
  for (const quiz of publicQuizzes) addQuizQuestions(questions, quiz)

  const bulkOps = buildBulkOperations(questions)
  return { bulkOps, syncedQuestionIds: Array.from(questions.keys()) }
}
