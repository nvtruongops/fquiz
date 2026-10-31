jest.mock('@/lib/auth/with-auth', () => ({withAuth:(handler:any)=>handler}))
jest.mock('@/lib/db/mongodb', () => ({connectDB:jest.fn()}))
jest.mock('@/lib/models/Quiz', () => ({Quiz:{findById:jest.fn(),findByIdAndUpdate:jest.fn(),findByIdAndDelete:jest.fn()}}))
jest.mock('@/lib/question-bank/usage-cache', () => ({ refreshQuestionBankUsageCache: jest.fn().mockResolvedValue(true) }))
import { DELETE, PUT } from './route'
import { Quiz } from '@/lib/models/Quiz'
import { refreshQuestionBankUsageCache } from '@/lib/question-bank/usage-cache'
test('refuses to publish a draft with an incomplete key',async()=>{
 ;(Quiz.findById as jest.Mock).mockReturnValue({lean:async()=>({status:'draft',questions:[{text:'Choose 3 answers',options:['a','b','c'],correct_answer:[0]}]})})
 ;(Quiz.findByIdAndUpdate as jest.Mock).mockReturnValue({lean:async()=>({status:'published'})})
 const response=await PUT(new Request('http://test/quizzes/id',{method:'PUT',body:JSON.stringify({status:'published'})}),{params:{id:'123456789012345678901234'}} as any)
 expect(response.status).toBe(400)
 expect(Quiz.findByIdAndUpdate).not.toHaveBeenCalled()
})

test('refreshes question usage after deleting a quiz', async()=>{
 ;(Quiz.findByIdAndDelete as jest.Mock).mockResolvedValue({_id:'123456789012345678901234'})
 const response=await DELETE(new Request('http://test/quizzes/id',{method:'DELETE'}),{params:{id:'123456789012345678901234'}} as any)
 expect(response.status).toBe(200)
 expect(refreshQuestionBankUsageCache).toHaveBeenCalledTimes(1)
 expect(await response.json()).toMatchObject({success:true,question_bank_usage_refreshed:true})
})
