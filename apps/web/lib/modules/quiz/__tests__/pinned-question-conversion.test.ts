import { convertPinnedQuestion } from '../pinned-question-conversion'

describe('convertPinnedQuestion', () => {
  it('preserves a valid stored answer and filters invalid options', () => {
    expect(convertPinnedQuestion({
      text: 'Question', options: [' A ', '', 'B'], correct_answer: [1, 8],
    }, new Map(), new Map())).toMatchObject({
      text: 'Question', options: [' A ', 'B'], correct_answer: [1],
    })
  })

  it('recovers an absent answer from the matching source quiz question', () => {
    const source = new Map([['quiz-1', { questions: [{ _id: 'question-1', correct_answer: 1, options: ['A', 'B'] }] }]])
    expect(convertPinnedQuestion({
      quiz_id: 'quiz-1', question_id: 'question-1', text: 'Question', options: ['A', 'B'],
    }, source, new Map()).correct_answer).toEqual([1])
  })

  it('uses binary defaults when too few options survive validation', () => {
    expect(convertPinnedQuestion({ text: 'Question', options: [''] }, new Map(), new Map())).toMatchObject({
      options: ['True', 'False'], correct_answer: [0],
    })
  })
})
