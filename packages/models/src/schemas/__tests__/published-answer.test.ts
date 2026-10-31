import { QuestionSchema, QuestionInputSchema, DraftQuestionSchema } from '../quiz'
import { getExplicitAnswerSelectionCount } from '../../utils/question-selection-helper'
import { Quiz } from '../../models/Quiz'
import { Question } from '../../models/Question'
import { QuestionBank } from '../../models/QuestionBank'

const valid = { text: 'Choose 3 answers.', options: ['a','b','c','d'], correct_answer: [0,1,2] }
describe('published answer contract', () => {
  for (const schema of [QuestionSchema, QuestionInputSchema]) {
    test.each([[], [0], [0,0,1], [0,1,1.5], [-1,0,1], [0,1,4]].map(key => [key]))('rejects invalid key %j', correct_answer => {
      expect(schema.safeParse({ ...valid, correct_answer }).success).toBe(false)
    })
    test('normalizes a scalar without inventing an answer', () => {
      expect(schema.parse({ ...valid, text: 'Question?', correct_answer: 2 }).correct_answer).toEqual([2])
    })
    test('rejects an empty key without a count instruction', () => {
      expect(schema.safeParse({ ...valid, text: 'Question?', correct_answer: [] }).success).toBe(false)
    })
  }
  test('retains incomplete drafts', () => expect(DraftQuestionSchema.safeParse({}).success).toBe(true))
  test.each(['Select 3 students for the team', 'Chọn 3 năm gần nhất', 'Which two countries are adjacent?', 'Choose 3junk answers', 'Select 2.5 answers'])('does not infer answers from %s', text => {
    expect(getExplicitAnswerSelectionCount(text)).toBeNull()
  })
  test.each([['Choose three.',3], ['(Select 3 answers)',3], ['Chọn 2 đáp án',2], ['Choose 10 answers',10]] as const)('recognizes explicit instruction %s', (text, count) => {
    expect(getExplicitAnswerSelectionCount(text)).toBe(count)
  })
  test.each([Quiz, Question, QuestionBank])('persistence rejects duplicate, fractional and count-mismatch keys', async Model => {
    for (const correct_answer of [[0,0,1], [0,1,1.5], [0]]) {
      const question = { ...valid, correct_answer }
      const doc = Model === Quiz ? new Model({ questions: [question] }) : new Model(question)
      const error = await doc.validate().then(() => null, (failure: any) => failure)
      const errors = error?.errors
      expect(errors?.[Model === Quiz ? 'questions.0.correct_answer' : 'correct_answer']).toBeDefined()
    }
  })
})

test('Mongoose retains an incomplete draft for recovery', async () => {
  const doc = new Quiz({ title:'D', course_code:'D', category_id:'123456789012345678901234',status:'draft',questions:[{text:'',options:[],correct_answer:[]}] })
  await expect(doc.validate()).resolves.toBeUndefined()
})

describe('published prompt and identity metadata', () => {
  test.each([undefined, '', '   ', '<b></b>'])('rejects a missing or empty sanitized prompt %j', text => {
    for (const schema of [QuestionSchema, QuestionInputSchema]) {
      expect(schema.safeParse({ options:['a','b'], correct_answer:[0], text }).success).toBe(false)
    }
  })
  test('retains identity aliases for published questions and incomplete drafts', () => {
    expect((QuestionSchema.parse({ ...valid, question_id_aliases:['legacy'] }) as Record<string, unknown>).question_id_aliases).toEqual(['legacy'])
    expect((DraftQuestionSchema.parse({ question_id_aliases:['legacy'] }) as Record<string, unknown>).question_id_aliases).toEqual(['legacy'])
  })
})
