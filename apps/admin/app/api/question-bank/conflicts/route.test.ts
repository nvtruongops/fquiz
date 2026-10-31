jest.mock('@/lib/auth/with-auth', () => ({
  withAuth: (handler: any) => handler,
}))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/Quiz', () => ({ Quiz: { find: jest.fn(), aggregate: jest.fn() } }))
jest.mock('@/lib/models/QuestionBank', () => ({ QuestionBank: { findOneAndUpdate: jest.fn(), findOne: jest.fn().mockResolvedValue(null) } }))

import { Quiz } from '@/lib/models/Quiz'
import { GET, POST } from './route'

describe('GET /api/question-bank/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('groups legacy quiz questions without stored IDs and reports different answers', async () => {
    const questionText = 'Legacy question without a stored ID?'
    ;(Quiz.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'quiz-1',
          course_code: 'COURSE_A',
          questions: [{ text: questionText, options: ['Correct answer', 'Wrong answer'], correct_answer: [0] }],
        },
        {
          _id: 'quiz-2',
          course_code: 'COURSE_B',
          questions: [{ text: questionText, options: ['Correct answer', 'Wrong answer'], correct_answer: [1] }],
        },
      ]),
    })

    const response = await GET(
      new Request('https://admin.example.test/api/question-bank/conflicts?category_id=all')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      total_conflicts: 1,
      conflicts: [
        {
          text: questionText,
          answer_groups: [
            { answer_texts: ['correct answer'], quizzes: ['COURSE_A'] },
            { answer_texts: ['wrong answer'], quizzes: ['COURSE_B'] },
          ],
        },
      ],
    })
  })
})

import { QuestionBank } from '@/lib/models/QuestionBank'
const source = {options:['a','b','c','d'],correct_answer:[0,1,2],quiz_id:'quiz',course_code:'TEST'}
const resolve = () => POST(new Request('http://test/conflicts',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',question_id:'qid',question_text:'Choose 3 answers',selected_variant:source,update_quizzes:true})}),{payload:{userId:'123456789012345678901234'}} as any)
test.each([['a','x','y','z'],['a','b','y','z'],['a',' A ','c','d']])('conflict resolution preflights all quizzes before writing %j',async(...options)=>{
 const good={questions:[{question_id:'qid',text:'Choose 3 answers',options:source.options,correct_answer:[0,1,2]}],save:jest.fn(),markModified:jest.fn()}
 const bad={questions:[{question_id:'qid',text:'Choose 3 answers',options,correct_answer:[0,1,2]}],save:jest.fn(),markModified:jest.fn()}
 ;(Quiz.find as jest.Mock).mockResolvedValue([good,bad])
 expect((await resolve()).status).toBe(409)
 expect(QuestionBank.findOneAndUpdate).not.toHaveBeenCalled()
 expect(good.save).not.toHaveBeenCalled()
 expect(bad.save).not.toHaveBeenCalled()
})
