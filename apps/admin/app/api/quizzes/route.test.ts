jest.mock('@/lib/auth/with-auth', () => ({ withAuth: (handler: any) => handler }))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/Quiz', () => ({ Quiz: { create: jest.fn() } }))
jest.mock('@/lib/models/User', () => ({ User: {} }))
jest.mock('@/lib/models/Category', () => ({ Category: { findById: jest.fn() } }))
jest.mock('@/lib/question-bank/usage-cache', () => ({ refreshQuestionBankUsageCache: jest.fn().mockResolvedValue(true) }))
import { POST } from './route'
import { Quiz } from '@/lib/models/Quiz'
import { Category } from '@/lib/models/Category'
import { refreshQuestionBankUsageCache } from '@/lib/question-bank/usage-cache'
const question = { text: 'Question?', options: ['a','b','c','d'], correct_answer: 2 }
const context = { payload: { userId: '123456789012345678901234' } } as any
async function post(q: any, status = 'published') {
 return POST(new Request('http://test/api/quizzes', { method:'POST', body: JSON.stringify({ course_code:'TEST', category_id:'123456789012345678901234', questions:[q], status }) }), context)
}
beforeEach(() => { jest.clearAllMocks(); (Category.findById as jest.Mock).mockReturnValue({lean: async () => ({})}); (Quiz.create as jest.Mock).mockImplementation(async data => data) })
test('preserves legacy scalar 2 as [2]', async () => {
 const response = await post(question)
 expect(response.status).toBe(201)
 expect((await response.json()).quiz.questions[0].correct_answer).toEqual([2])
 expect(refreshQuestionBankUsageCache).toHaveBeenCalledTimes(1)
})
test.each([[], [0], [0,0,1], [0,1,1.5], [-1,0,1], [0,1,4]].map(key => [key]))('rejects corrupt published key %j before write', async correct_answer => {
 expect((await post({...question,text:'Choose 3 answers',correct_answer})).status).toBe(400)
 expect(Quiz.create).not.toHaveBeenCalled()
})
test('allows incomplete draft questions', async () => expect((await post({},'draft')).status).toBe(201))
