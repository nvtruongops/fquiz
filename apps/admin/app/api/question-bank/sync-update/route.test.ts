jest.mock('@/lib/auth/with-auth', () => ({ withAuth: (handler: any) => handler }))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/Quiz', () => ({ Quiz: { find: jest.fn() } }))
jest.mock('@/lib/models/QuestionBank', () => ({ QuestionBank: { findOne: jest.fn(), updateOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn() } }))
import { POST } from './route'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
const source = {text:'Choose 3 answers',options:['a','b','c','d'],correct_answer:[0,1,2]}
const context = {payload:{userId:'123456789012345678901234'}} as any
const post = () => POST(new Request('http://test/sync',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',old_question_id:'qid',new_question:source})}),context)
function doc(options: string[], id = 'qid') {return {_id:'quiz',question_id:id,course_code:'TEST',questions:[{...source,question_id:id,options,correct_answer:[0,1,2]}],save:jest.fn(),markModified:jest.fn()}}
beforeEach(() => {jest.clearAllMocks(); (QuestionBank.findOne as jest.Mock).mockResolvedValue({...source,_id:'bank',question_id:'qid',used_in_quizzes:['TEST'],used_in_quiz_ids:['quiz']})})
test.each([['a','x','y','z'],['a','b','y','z'],['a',' A ','c','d']])('conflicts before all writes for partial or ambiguous mapping %j', async (...options) => {
 const first = doc(['d','c','b','a']); const second=doc(options)
 ;(Quiz.find as jest.Mock).mockResolvedValue([first,second])
 const response=await post()
 expect(response.status).toBe(409)
 expect(first.save).not.toHaveBeenCalled()
 expect(second.save).not.toHaveBeenCalled()
 expect(first.questions[0].correct_answer).toEqual([0,1,2])
 expect(QuestionBank.updateOne).not.toHaveBeenCalled()
 expect(QuestionBank.create).not.toHaveBeenCalled()
})
test('preserves every answer with shuffled options',async()=>{
 const quiz=doc(['d','c','b','a']); (Quiz.find as jest.Mock).mockResolvedValue([quiz])
 expect((await post()).status).toBe(200)
 expect(quiz.questions[0].correct_answer).toEqual([3,2,1])
 expect(quiz.save).toHaveBeenCalledTimes(1)
 expect((QuestionBank.updateOne as jest.Mock).mock.calls[0][1].$set).toMatchObject({ question_id: expect.stringMatching(/^q_/), question_id_aliases: expect.arrayContaining(['qid']) })
})
test('same prompt with unrelated identity and options is not changed',async()=>{
 const quiz=doc(['a','x','y','z'],'another'); (Quiz.find as jest.Mock).mockResolvedValue([quiz])
 expect((await post()).status).toBe(200)
 expect(quiz.save).not.toHaveBeenCalled()
})

test('does not save any quiz when a new bank entry lacks a valid creator',async()=>{
 const quiz=doc(['d','c','b','a']); (Quiz.find as jest.Mock).mockResolvedValue([quiz]); (QuestionBank.findOne as jest.Mock).mockResolvedValue(null)
 const response=await POST(new Request('http://test/sync',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',old_question_id:'qid',new_question:source})}),{payload:{}} as any)
 expect(response.status).toBe(400)
 expect(quiz.save).not.toHaveBeenCalled()
 expect(QuestionBank.create).not.toHaveBeenCalled()
})
