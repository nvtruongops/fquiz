import { generateQuestionId } from './question-id-generator'

function sourceAnswer(question: any, sourceQuizMap: Map<string, any>) {
  if (!question.quiz_id) return undefined
  const sourceQuiz = sourceQuizMap.get(String(question.quiz_id))
  if (!sourceQuiz?.questions) return undefined
  const matched = sourceQuiz.questions.find((candidate: any) =>
    (question.question_id && (candidate._id?.toString() === question.question_id || candidate.question_id === question.question_id)) ||
    (candidate.text && candidate.text.trim() === question.text?.trim())
  )
  return matched?.correct_answer
}

function standaloneAnswer(question: any, standaloneQuestionMap: Map<string, any>) {
  if (!question.text) return undefined
  return standaloneQuestionMap.get(question.text.trim())?.correct_answer
}

function answerArray(answer: any): number[] | undefined {
  if (answer === undefined || answer === null) return undefined
  if (Array.isArray(answer)) return answer
  return typeof answer === 'number' ? [answer] : undefined
}

function validOptions(options: any) {
  const valid = Array.isArray(options) ? options.filter((option: any) => typeof option === 'string' && option.trim().length > 0) : []
  return valid.length >= 2 ? valid : ['True', 'False']
}

export function convertPinnedQuestion(question: any, sourceQuizMap: Map<string, any>, standaloneQuestionMap: Map<string, any>) {
  const storedAnswer = Array.isArray(question.correct_answer) && question.correct_answer.length > 0
    ? question.correct_answer
    : undefined
  const recoveredAnswer = storedAnswer ?? answerArray(sourceAnswer(question, sourceQuizMap)) ?? answerArray(standaloneAnswer(question, standaloneQuestionMap))
  const options = validOptions(question.options)
  const correctAnswer = (recoveredAnswer || [0])
    .map((index: unknown) => typeof index === 'number' ? index : parseInt(String(index), 10))
    .filter((index: number) => !isNaN(index) && index >= 0 && index < options.length)
  if (correctAnswer.length === 0) correctAnswer.push(0)

  return {
    text: question.text || '',
    options,
    correct_answer: correctAnswer,
    explanation: question.explanation || '',
    image_url: question.image_url || '',
    question_id: question.question_id || generateQuestionId({ text: question.text || '', options, correct_answer: correctAnswer }),
  }
}
