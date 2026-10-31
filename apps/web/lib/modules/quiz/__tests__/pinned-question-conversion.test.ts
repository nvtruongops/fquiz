import { convertPinnedQuestion } from '../pinned-question-conversion'
test('refuses to filter corrupt partial keys or options into a different question',()=>{
 expect(()=>convertPinnedQuestion({text:'Question',options:[' A ','','B'],correct_answer:[1,8]},new Map(),new Map())).toThrow()
})
test('refuses to fabricate answer and binary options',()=>{
 expect(()=>convertPinnedQuestion({text:'Question',options:['']},new Map(),new Map())).toThrow()
})
test('maps every recovered key into shuffled pinned options',()=>{
 const source=new Map([['quiz',{questions:[{_id:'q',text:'Choose 3 answers',options:['a','b','c','d'],correct_answer:[0,1,2]}]}]])
 expect(convertPinnedQuestion({quiz_id:'quiz',question_id:'q',text:'Choose 3 answers',options:['d','c','b','a']},source,new Map()).correct_answer).toEqual([3,2,1])
})
test('does not recover by ID when the stored prompt is a different revision', () => {
  const map = new Map([['quiz', { questions: [{ _id: 'old-id', text: 'Different revision', options: ['Apple', 'Berry'], correct_answer: [1] }] }]])
  expect(() => convertPinnedQuestion({ quiz_id: 'quiz', question_id: 'old-id', text: 'Pinned revision', options: ['Apple', 'Berry'] }, map, new Map())).toThrow()
})
test('does not choose the last standalone key for indistinguishable variants', () => {
  const question = { text: 'Same prompt', options: ['Apple', 'Berry'] }
  const standalone = new Map([['Same prompt', [{ ...question, correct_answer: [0] }, { ...question, correct_answer: [1] }]]])
  expect(() => convertPinnedQuestion(question, new Map(), standalone)).toThrow()
})
