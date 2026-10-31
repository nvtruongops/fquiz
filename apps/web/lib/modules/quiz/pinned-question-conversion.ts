import { QuestionInputSchema, remapPublishedAnswer, findQuestionSnapshot, getQuestionIdentity } from '@fquiz/models'

export function convertPinnedQuestion(question: any, sourceQuizMap: Map<string, any>, standaloneQuestionMap: Map<string, any>) {
  let answer = question.correct_answer
  if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) {
    const candidates = sourceQuizMap.get(String(question.quiz_id))?.questions || []
    const fallback = standaloneQuestionMap.get(question.text?.trim())
    const standalone = Array.isArray(fallback) ? fallback : fallback ? [fallback] : []
    const source = findQuestionSnapshot([...candidates, ...standalone], question)
    answer = source && Array.isArray(question.options) && Array.isArray(source.options) ? remapPublishedAnswer(source, question.options) : undefined
  }
  const parsed = QuestionInputSchema.safeParse({ ...question, correct_answer: answer })
  if (!parsed.success) throw new Error('Pinned question has missing or invalid answer evidence; review the source question')
  return { ...parsed.data, ...getQuestionIdentity({ ...parsed.data, _id: question._id }) }
}
