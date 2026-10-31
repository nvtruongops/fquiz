import { GET } from '../[id]/route'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'

jest.mock('next/server', () => ({ NextResponse: { json: (body: any, init: any) => ({ body, status: init?.status ?? 200 }) } }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (fn: Function) => (req: Request, ctx: any) => fn(req, { ...ctx, payload: { userId: '507f1f77bcf86cd799439011' } }) }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { findById: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { find: jest.fn(), findById: jest.fn() } }))

const id = '507f1f77bcf86cd799439022'
const snapshot = { _id: 'old-question', text: 'Old Choose 3 answers', options: ['D', 'C', 'B', 'A'], correct_answer: [3, 2, 1] }
const completed = { _id: id, student_id: '507f1f77bcf86cd799439011', quiz_id: id, mode: 'review', status: 'completed', score: 1,
  started_at: new Date(), completed_at: new Date(), questions_cache: [snapshot], question_order: [0],
  user_answers: [{ question_index: 0, answer_index: 3, answer_indexes: [3, 2, 1], is_correct: true }] }
const quiz = { _id: id, title: 'Edited quiz', questions: [{ ...snapshot, text: 'New different question', correct_answer: [0] }] }
const query = (value: any) => { const q: any = { lean: async () => value }; q.sort = q.limit = () => q; return q }
const get = (extra = '') => GET(new Request(`http://example.test/api/history/${id}${extra}`), { params: Promise.resolve({ id }) } as any) as any
beforeEach(() => {
  jest.clearAllMocks()
  ;(Quiz.findById as jest.Mock).mockReturnValue(query(quiz))
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'completed' ? [completed] : []))
})
test('history retains all cached shuffled keys, submitted indices and authoritative correctness', async () => {
  const response = await get()
  expect(response.status).toBe(200)
  expect(response.body.questions[0]).toMatchObject({ text: snapshot.text, options: snapshot.options, correct_answer: [3, 2, 1], submitted_answer: [3, 2, 1], is_correct: true })
})
test('deleted source quiz still displays completed snapshots', async () => {
  ;(Quiz.findById as jest.Mock).mockReturnValue(query(null))
  const response = await get()
  expect(response.body.quiz_deleted).toBe(true)
  expect(response.body.questions[0].text).toBe(snapshot.text)
})
test('selected attempt determines displayed snapshots', async () => {
  const other = { ...completed, _id: '507f1f77bcf86cd799439033', questions_cache: [{ ...snapshot, text: 'Selected attempt' }] }
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'completed' ? [completed, other] : []))
  expect((await get(`?sessionId=${other._id}`)).body.questions[0].text).toBe('Selected attempt')
})
test('active exam history does not reveal key or explanation', async () => {
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'active' ? [{ ...completed, status: 'active' }] : []))
  const body = (await get()).body
  const q = body.questions[0]
  expect(q.correct_answer).toBeUndefined()
  expect(q.explanation).toBeUndefined()
  expect(body.score).toBe(0)
  expect(body.user_answers[0].is_correct).toBeUndefined()
})
test('legacy history without a snapshot does not guess mapping onto a subsequently edited source', async () => {
  ;(Quiz.findById as jest.Mock).mockReturnValue(query({ ...quiz, updatedAt: new Date('2026-10-31') }))
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'completed' ? [{ ...completed, started_at: new Date('2026-10-30'), questions_cache: [] }] : []))
  const body = (await get()).body
  expect(body.quiz_updated_after_start).toBe(true)
  expect(body.questions[0].snapshot_unavailable).toBe(true)
  expect(body.questions[0].text).toBe('Question unavailable')
})
test('legacy history preserves persisted question count when the edited source has fewer questions', async () => {
  ;(Quiz.findById as jest.Mock).mockReturnValue(query({ ...quiz, updatedAt: new Date('2026-10-31'), questions: [quiz.questions[0]] }))
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'completed' ? [{
    ...completed,
    started_at: new Date('2026-10-30'),
    questions_cache: [],
    question_order: [0, 1],
  }] : []))
  const body = (await get()).body
  expect(body.total_questions).toBe(2)
  expect(body.questions).toHaveLength(2)
  expect(body.questions.map((question: any) => question.snapshot_unavailable)).toEqual([true, true])
})
test('legacy history for a deleted source preserves persisted question count', async () => {
  ;(Quiz.findById as jest.Mock).mockReturnValue(query(null))
  ;(QuizSession.find as jest.Mock).mockImplementation((f: any) => query(f.status === 'completed' ? [{
    ...completed,
    questions_cache: [],
    question_order: [0, 1],
  }] : []))
  const body = (await get()).body
  expect(body.quiz_deleted).toBe(true)
  expect(body.total_questions).toBe(2)
  expect(body.questions).toHaveLength(2)
})
