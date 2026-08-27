import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const QuizAssistantSchema = z.object({
  reply: z.string().min(1),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean().default(false),
  similarQuestionDetails: z.string().nullable().optional(),
})

export type QuizAssistantResult = z.infer<typeof QuizAssistantSchema>

export interface QuizAssistantPromptParams {
  questionText: string
  options: string[]
  correctAnswer: number | number[]
  submittedAnswer?: number | number[] | null
  explanation?: string | null
  userQuery: string
  courseCode?: string
  targetOptionLetter?: string
  targetOptionText?: string
  similarQuestions?: Array<{
    text: string
    options: string[]
    correctAnswer: number | number[]
    explanation?: string | null
  }>
}

export const quizAssistantPrompt: PromptDefinition<QuizAssistantPromptParams, typeof QuizAssistantSchema> = {
  name: 'quiz_assistant',
  version: PROMPT_VERSION,
  schema: QuizAssistantSchema,
  buildPrompt: (params: QuizAssistantPromptParams): string => {
    const getLabel = (idx: number) => String.fromCharCode(65 + idx)

    const formattedOptions = params.options
      .map((opt, i) => {
        const letter = getLabel(i)
        const cleanOpt = opt.replace(/^[A-Z][\.\)]\s*/i, '')
        return `  Phương án ${letter}: ${cleanOpt}`
      })
      .join('\n')

    const getFormattedAnswerStr = (answer: number | number[] | null | undefined) => {
      if (answer === null || answer === undefined) return 'Chưa chọn'
      const idxs = Array.isArray(answer) ? answer : [answer]
      return idxs
        .map((i) => {
          const letter = getLabel(i)
          const cleanText = (params.options[i] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')
          return `Phương án ${letter} (${cleanText})`
        })
        .join(', ')
    }

    const correctText = getFormattedAnswerStr(params.correctAnswer)
    const submittedText = getFormattedAnswerStr(params.submittedAnswer)

    const courseStr = params.courseCode ? `môn ${params.courseCode}` : 'môn học này'

    let similarSection = `Trong ngân hàng đề ${courseStr}, không có câu hỏi nào khác sử dụng phương án này làm đáp án đúng.`
    if (params.similarQuestions && params.similarQuestions.length > 0) {
      similarSection = params.similarQuestions
        .map((q, idx) => {
          const qCorrect = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map((i) => getLabel(i)).join(', ')
            : getLabel(q.correctAnswer)
          return `Câu trùng khớp #${idx + 1}:\n- Đề bài: ${q.text}\n- Đáp án đúng: Phương án ${qCorrect}`
        })
        .join('\n\n')
    }

    return `Bạn là AI Quiz Assistant chuyên hỗ trợ phân tích câu hỏi trắc nghiệm và đối chiếu ngân hàng đề.

NGỮ CẢNH CÂU HỎI HIỆN TẠI:
- Mã môn học / Đề thi: ${params.courseCode ?? 'N/A'}
- Đề bài: "${params.questionText}"
- Các lựa chọn:
${formattedOptions}
- Đáp án đúng của câu này: ${correctText}
- Đáp án học viên đã chọn: ${submittedText}

THẮC MẮC CỦA HỌC VIÊN:
"${params.userQuery}"

KẾT QUẢ TRA CỨU NGÂN HÀNG ĐỀ ${courseStr.toUpperCase()}:
${similarSection}

QUY TẮC PHẢN HỒI BẮT BUỘC (CỰC KỲ NGẮN GỌN & RÕ RÀNG):

1. NẾU TÌM THẤY CÂU HỎI TRÙNG KHỚP TRONG ${courseStr}:
   - Bắt đầu ngay bằng: "**CÓ!** Trong ngân hàng đề ${courseStr}, tìm thấy câu hỏi sau có đáp án đúng là **"${params.targetOptionText ?? ''}"**:"
   - Trích dẫn câu hỏi:
     • **Đề bài**: "[Nội dung đề bài]"
     • **Đáp án đúng trong câu đó**: Phương án [Letter] (${params.targetOptionText ?? ''})

2. NẾU KHÔNG TÌM THẤY CÂU HỎI TRÙNG KHỚP TRONG ${courseStr}:
   - Bắt đầu ngay bằng: "**KHÔNG!** Trong ngân hàng đề ${courseStr}, không có câu hỏi nào khác sử dụng **"${params.targetOptionText ?? 'phương án này'}"** làm đáp án đúng."
   - Giải thích ngắn 1 câu vì sao ở câu hỏi hiện tại, ${correctText} mới là đáp án đúng.

3. QUY ĐỊNH BẮT BUỘC KHÁC:
   - Trả lời CỰC KỲ NGẮN GỌN (dưới 80 - 100 từ), rõ ràng, dễ hiểu. Tuyệt đối không mâu thuẫn ký hiệu giữa câu hỏi hiện tại và câu hỏi trong ngân hàng đề.

Trả về định dạng JSON chuẩn theo schema:
- reply: Lời giải thích ngắn gọn, đi thẳng vào câu trả lời CÓ/KHÔNG bằng tiếng Việt.
- formulaExplanation: Phân tích công thức hoặc bước tính toán (nếu có, ngắn gọn).
- similarQuestionFound: true nếu phát hiện câu trùng khớp CÙNG CHỦ ĐỀ, ngược lại false.
- similarQuestionDetails: Tóm tắt nội dung câu tìm thấy (nếu có).`
  },
}
