import type { InternalQuizContext } from '../../context/context-types'
import type { RetrievalResult } from '../../retrieval/retrieval-types'

export function buildSimilarQuestionTemplate(
  context: InternalQuizContext,
  userQuery: string,
  evidences: RetrievalResult[]
): string {
  const { targetOptionText, courseCode } = context
  const courseStr = courseCode ? `môn ${courseCode}` : 'môn học này'
  const hasEvidence = evidences && evidences.length > 0
  const optionStr = targetOptionText || 'phương án này'

  const evidenceInstruction = hasEvidence
    ? [
        '1. CÓ BẰNG CHỨNG PHÙ HỢP:',
        `   - Mở đầu: "**CÓ!** Trong dữ liệu đối chiếu ${courseStr}, tìm thấy câu hỏi sau có đáp án đúng là **\\"${optionStr}\\"**:"`,
        '   - Trích dẫn ngắn gọn: Đề bài và vì sao câu đối chiếu lại chọn phương án này.',
        '   - Gán similarQuestionFound = true và similarQuestionDetails = đề bài câu tìm thấy.',
      ].join('\n')
    : [
        '1. KHÔNG TÌM THẤY BẰNG CHỨNG PHÙ HỢP (SEMANTIC PRECISION):',
        `   - Mở đầu: "Hiện tại **không tìm thấy câu hỏi tương tự đủ phù hợp** trong dữ liệu đối chiếu ${courseStr} sử dụng **\\"${optionStr}\\"** làm đáp án đúng."`,
        '   - Giải thích ngắn 1 câu vì sao ở câu hỏi hiện tại, phương án này chưa chính xác.',
        '   - Gán similarQuestionFound = false và similarQuestionDetails = null.',
      ].join('\n')

  return `HỌC VIÊN YÊU CẦU ĐỐI CHIẾU NGÂN HÀNG ĐỀ & TÌM CÂU HỎI TƯƠNG TỰ:
- Phương án đang tra cứu: "${optionStr}"
- Câu hỏi chi tiết: "${userQuery}"

HƯỚNG DẪN ĐỐI CHIẾU (EVIDENCE-FIRST ENFORCEMENT):
${evidenceInstruction}
2. Luôn đảm bảo phản hồi ngắn gọn dưới 80 từ.`
}
