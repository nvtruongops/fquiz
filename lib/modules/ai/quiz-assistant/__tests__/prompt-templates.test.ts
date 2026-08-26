import { PromptEngine } from '../prompt/prompt-engine'
import type { InternalQuizContext } from '../context/context-types'
import type { RetrievalResult } from '../retrieval/retrieval-types'

describe('Specialized Prompt Templates Tests (Task 1.1)', () => {
  const baseContext: InternalQuizContext = {
    userId: 'user-123',
    sessionId: 'session-456',
    courseCode: 'PMG201C',
    categoryId: 'cat-1',
    currentQuestionIndex: 0,
    actualQuestionIndex: 0,
    question: {
      id: 'q-1',
      text: 'In project management, which document defines communication channels?',
      options: ['A. Scope Statement', 'B. Communication Management Plan', 'C. Risk Register', 'D. WBS'],
      correctAnswer: 1,
      explanation: 'Communication Management Plan defines stakeholders and communication frequency.',
    },
    userSubmittedAnswer: 0, // Selected A (wrong)
    targetOptionIndex: 0,
    targetOptionLetter: 'A',
    targetOptionText: 'Scope Statement',
  }

  it('EXPLAIN_WRONG_ANSWER: should prompt reasoning on why selected option is wrong', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'EXPLAIN_WRONG_ANSWER',
      userQuery: 'Tại sao phương án A lại sai?',
      evidences: [],
    })

    expect(prompt).toContain('TẦNG 1: NGỮ CẢNH CÂU HỎI HIỆN TẠI')
    expect(prompt).toContain('HỌC VIÊN YÊU CẦU GIẢI THÍCH: TẠI SAO PHƯƠNG ÁN LẠI SAI')
    expect(prompt).toContain('Phương án A ("Scope Statement")')
    expect(prompt).toContain('điểm gài bẫy hoặc điểm dễ gây nhầm lẫn')
  })

  it('FIND_SIMILAR_QUESTION with Evidence: should enforce citation and similarQuestionFound=true', () => {
    const evidences: RetrievalResult[] = [
      {
        id: 'qb-1',
        sourceType: 'question_bank',
        sourceId: '1',
        content: 'Which plan covers stakeholder communication?',
        options: ['A. Communication Management Plan'],
        correctAnswer: 0,
        score: 0.95,
        metadata: {},
      },
    ]

    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'FIND_SIMILAR_QUESTION',
      userQuery: 'Có câu nào trong ngân hàng đề tương tự không?',
      evidences,
    })

    expect(prompt).toContain('BẰNG CHỨNG TRÍCH XUẤT TỪ DATABASE')
    expect(prompt).toContain('Which plan covers stakeholder communication?')
    expect(prompt).toContain('CÓ BẰNG CHỨNG PHÙ HỢP')
    expect(prompt).toContain('similarQuestionFound = true')
  })

  it('FIND_SIMILAR_QUESTION without Evidence (INVARIANT 3): should strictly prohibit claiming QuestionBank membership', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'FIND_SIMILAR_QUESTION',
      userQuery: 'Tìm câu tương tự',
      evidences: [],
    })

    expect(prompt).toContain('KHÔNG TÌM THẤY BẰNG CHỨNG PHÙ HỢP')
    expect(prompt).toContain('không tìm thấy câu hỏi tương tự đủ phù hợp')
    expect(prompt).toContain('similarQuestionFound = false')
  })

  it('COMPARE_OPTIONS: should enforce 4-part structured comparison', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'COMPARE_OPTIONS',
      userQuery: 'So sánh phương án A và phương án B',
      evidences: [],
    })

    expect(prompt).toContain('HỌC VIÊN YÊU CẦU SO SÁNH CÁC PHƯƠNG ÁN LỰA CHỌN')
    expect(prompt).toContain('Ngữ cảnh & Bản chất')
    expect(prompt).toContain('Điểm khác biệt then chốt')
    expect(prompt).toContain('Bẫy đề thi')
    expect(prompt).toContain('Không chọn hộ')
  })

  it('EXPLAIN_FORMULA: should structure formula definition and step-by-step calculation', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'EXPLAIN_FORMULA',
      userQuery: 'Công thức tính số kênh truyền thông là gì?',
      evidences: [],
    })

    expect(prompt).toContain('HỌC VIÊN YÊU CẦU GIẢI THÍCH CÔNG THỨC & CÁC BƯỚC TÍNH TOÁN')
    expect(prompt).toContain('formulaExplanation')
  })

  it('GENERAL_INQUIRY without Evidence: should ground in course context and prevent hallucinated QuestionBank claims', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'GENERAL_INQUIRY',
      userQuery: 'Kinh nghiệm học môn PMG201C điểm cao?',
      evidences: [],
    })

    expect(prompt).toContain('HỌC VIÊN ĐẶT CÂU HỎI MỞ RỘNG')
    expect(prompt).toContain('TUYỆT ĐỐI KHÔNG khẳng định câu hỏi hay đáp án này có trong ngân hàng đề')
    expect(prompt).toContain('CHỐNG HỎI TRỰC TIẾP ĐÁP ÁN')
  })

  it('ANTI-SPOIL GUARD: EXPLAIN_WRONG_ANSWER on unanswered question must not reveal correct answer', () => {
    const unattemptedContext: InternalQuizContext = {
      ...baseContext,
      userSubmittedAnswer: undefined,
      targetOptionIndex: undefined,
      targetOptionLetter: undefined,
      targetOptionText: undefined,
    }

    const prompt = PromptEngine.build({
      context: unattemptedContext,
      intent: 'EXPLAIN_WRONG_ANSWER',
      userQuery: 'Tại sao đáp án tôi chọn lại sai?',
      evidences: [],
    })

    expect(prompt).toContain('CHƯA CHỌN PHƯƠNG ÁN NÀO')
    expect(prompt).toContain('TUYỆT ĐỐI KHÔNG tiết lộ thẳng đáp án đúng')
  })

  it('ANTI-SPOIL GUARD: EXPLAIN_CORRECT_ANSWER on unanswered question must not reveal correct answer', () => {
    const unattemptedContext: InternalQuizContext = {
      ...baseContext,
      userSubmittedAnswer: undefined,
      targetOptionIndex: undefined,
      targetOptionLetter: undefined,
      targetOptionText: undefined,
    }

    const prompt = PromptEngine.build({
      context: unattemptedContext,
      intent: 'EXPLAIN_CORRECT_ANSWER',
      userQuery: 'Tại sao đáp án đúng là đáp án này?',
      evidences: [],
    })

    expect(prompt).toContain('HỌC VIÊN HỎI VỀ ĐÁP ÁN ĐÚNG KHI ĐANG LÀM BÀI')
    expect(prompt).toContain('TUYỆT ĐỐI KHÔNG tiết lộ trực tiếp ký tự đáp án')
  })

  it('SOLVE_QUESTION: should enforce 4-step framework without spoiling answer upfront', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'SOLVE_QUESTION',
      userQuery: 'Hướng dẫn cách làm câu này',
      evidences: [],
    })

    expect(prompt).toContain('HƯỚNG DẪN PHƯƠNG PHÁP & TƯ DUY GIẢI BÀI')
    expect(prompt).toContain('Bước 1 (Keywords)')
    expect(prompt).toContain('Bước 2 (Concept/Rule)')
    expect(prompt).toContain('Bước 3 (Elimination)')
    expect(prompt).toContain('Bước 4 (Self-Check)')
    expect(prompt).toContain('tuyệt đối KHÔNG tự động biến thành EXPLAIN_CORRECT_ANSWER')
  })

  it('IntentResolver: should correctly route negative choice questions to EXPLAIN_WRONG_ANSWER', () => {
    const { IntentResolver } = require('../intent/intent-resolver')
    expect(IntentResolver.resolve('Tại sao không phải là B ?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Vì sao không chọn C?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Tại sao loại D?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Tại sao A sai?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('tại sao là B')).toBe('EXPLAIN_CORRECT_ANSWER')
  })
})
