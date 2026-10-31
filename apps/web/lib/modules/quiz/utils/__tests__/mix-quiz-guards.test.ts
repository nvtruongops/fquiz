jest.mock('@/lib/core/db/mongodb',()=>({connectDB:jest.fn()}))
jest.mock('@/lib/modules/quiz/models/Quiz',()=>({Quiz:{find:jest.fn(),create:jest.fn()}}))
jest.mock('@/lib/modules/quiz/models/QuizSession',()=>({QuizSession:{create:jest.fn()}}))
import { processMixQuizGeneration } from '../mix-quiz-processor'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
test('mix generation refuses an invalid source key before quiz write',async()=>{
 const q={text:'Question',options:['a','b','c'],correct_answer:[0,7]}
 ;(Quiz.find as jest.Mock).mockReturnValue({select:()=>({lean:async()=>[1,2].map(i=>({_id:String(i),course_code:'T',category_id:'123456789012345678901234',questions:[{...q,question_id:String(i)}]}))})})
 ;(Quiz.create as jest.Mock).mockResolvedValue({_id:'quiz'})
 await expect(processMixQuizGeneration({quiz_ids:['123456789012345678901234','123456789012345678901235'],question_count:2,mode:'review',difficulty:'sequential',studentId:'123456789012345678901236'})).rejects.toThrow()
 expect(Quiz.create).not.toHaveBeenCalled()
})
