jest.mock('@/lib/auth/with-auth', () => ({withAuth:(handler:any)=>handler}))
jest.mock('@/lib/db/mongodb', () => ({connectDB:jest.fn()}))
jest.mock('@/lib/models/Quiz', () => ({Quiz:{find:jest.fn()}}))
jest.mock('@/lib/models/QuestionBank', () => ({QuestionBank:{find:jest.fn(),bulkWrite:jest.fn()}}))
import { POST } from './route'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
test('migration rejects a partial answer key before bulk write',async()=>{
 ;(Quiz.find as jest.Mock).mockReturnValue({lean:async()=>[{course_code:'TEST',questions:[{text:'Choose 3 answers',options:['a','b','c'],correct_answer:[0]}]}]})
 ;(QuestionBank.find as jest.Mock).mockReturnValue({lean:async()=>[]})
 const response=await POST(new Request('http://test/migrate',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',mode:'migrate'})}),{payload:{userId:'123456789012345678901234'}} as any)
 expect(response.status).toBe(409)
 expect(QuestionBank.bulkWrite).not.toHaveBeenCalled()
})

test('migration rejects same-ID source collisions before any write',async()=>{
 jest.clearAllMocks()
 const question={question_id:'collision',text:'Question',options:['a','b','c'],correct_answer:[0]}
 ;(Quiz.find as jest.Mock).mockReturnValue({lean:async()=>[{_id:'one',course_code:'A',questions:[question]},{_id:'two',course_code:'B',questions:[{...question,correct_answer:[1]}]}]})
 ;(QuestionBank.find as jest.Mock).mockReturnValue({lean:async()=>[]})
 const response=await POST(new Request('http://test/migrate',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',mode:'migrate'})}),{payload:{userId:'123456789012345678901234'}} as any)
 expect(response.status).toBe(409)
 expect(QuestionBank.bulkWrite).not.toHaveBeenCalled()
})

async function migrate(resolve_conflicts: string) {
 return POST(new Request('http://test/migrate',{method:'POST',body:JSON.stringify({category_id:'123456789012345678901234',mode:'migrate',resolve_conflicts})}),{payload:{userId:'123456789012345678901234'}} as any)
}
test('keep_most_used writes a complete incoming snapshot including its count instruction',async()=>{
 jest.clearAllMocks()
 const incoming={question_id:'same',text:'Choose 2 answers',options:['a','b','c'],correct_answer:[0,1]}
 const existing={_id:'bank',question_id:'same',text:'Choose 3 answers',options:['a','b','c'],correct_answer:[0,1,2],usage_count:1,used_in_quizzes:['OLD']}
 ;(Quiz.find as jest.Mock).mockReturnValue({lean:async()=>[{_id:'one',course_code:'A',questions:[incoming]},{_id:'two',course_code:'B',questions:[incoming]}]})
 ;(QuestionBank.find as jest.Mock).mockReturnValue({lean:async()=>[existing]})
 expect((await migrate('keep_most_used')).status).toBe(200)
 const operations=(QuestionBank.bulkWrite as jest.Mock).mock.calls[0][0]
 const final={...existing,...operations[0].updateOne.update.$set}
 expect(final.text).toBe(incoming.text)
 expect(final.correct_answer).toEqual([0,1])
})
test('invalid retained bank snapshot rejects the entire batch before bulk write',async()=>{
 jest.clearAllMocks()
 const question={text:'Question',options:['a','b','c'],correct_answer:[0]}
 ;(Quiz.find as jest.Mock).mockReturnValue({lean:async()=>[{_id:'one',course_code:'A',questions:[{...question,question_id:'new'},{...question,question_id:'bad-existing'}]}]})
 ;(QuestionBank.find as jest.Mock).mockReturnValue({lean:async()=>[{...question,_id:'bank',question_id:'bad-existing',text:'Choose 3 answers'}]})
 const response=await migrate('keep_first')
 expect(response.status).toBe(409)
 expect(QuestionBank.bulkWrite).not.toHaveBeenCalled()
})
test('missing source prompt is a conflict before bulk write',async()=>{
 jest.clearAllMocks()
 ;(Quiz.find as jest.Mock).mockReturnValue({lean:async()=>[{_id:'one',course_code:'A',questions:[{question_id:'missing',options:['a','b'],correct_answer:[0]}]}]})
 ;(QuestionBank.find as jest.Mock).mockReturnValue({lean:async()=>[]})
 expect((await migrate('keep_first')).status).toBe(409)
 expect(QuestionBank.bulkWrite).not.toHaveBeenCalled()
})
