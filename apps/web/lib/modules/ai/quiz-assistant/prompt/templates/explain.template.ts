import type { InternalQuizContext } from '../../context/context-types'
import type { RetrievalResult } from '../../retrieval/retrieval-types'

export function buildExplainTemplate(
  context: InternalQuizContext,
  isExplainingWrong: boolean,
  userQuery: string,
  evidences: RetrievalResult[]
): string {
  const { targetOptionText, targetOptionLetter } = context

  // 🛡️ Pedagogical Guard 1: If asking why choice is wrong but user hasn't made a choice yet
  if (isExplainingWrong && !targetOptionText) {
    return `HỌC VIÊN HỎI "TẠI SAO TÔI CHỌN SAI" NHƯNG CHƯA CHỌN PHƯƠNG ÁN NÀO:
- Tình trạng: Học viên chưa tick chọn phương án nào trong câu hỏi này.
- Câu hỏi chi tiết: "${userQuery}"

QUY TẮC SƯ PHẠM (PEDAGOGICAL INTEGRITY & ANTI-SPOIL):
1. TUYỆT ĐỐI KHÔNG tiết lộ thẳng đáp án đúng ngay lập tức khi học viên chưa thử sức.
2. Nhắc nhở thân thiện rằng học viên chưa chọn phương án nào để phân tích.
3. Hướng dẫn gợi ý tư duy (chỉ ra từ khóa then chốt trong đề bài) để học viên tự tin đưa ra lựa chọn trước.
4. Trình bày ngắn gọn, sư phạm dưới 80 từ.`
  }

  // 🛡️ Pedagogical Guard 2: If asking why correct answer is right without specifying/picking an option
  if (!isExplainingWrong && !targetOptionText) {
    return `HỌC VIÊN HỎI VỀ ĐÁP ÁN ĐÚNG KHI ĐANG LÀM BÀI VÀ CHƯA CHỌN ĐÁP ÁN:
- Tình trạng: Học viên chưa chọn phương án nào trong bài thi.
- Câu hỏi chi tiết: "${userQuery}"

QUY TẮC SƯ PHẠM (PEDAGOGICAL INTEGRITY & ANTI-SPOIL):
1. TUYỆT ĐỐI KHÔNG tiết lộ trực tiếp ký tự đáp án (A, B, C, D) hay đọc tên đáp án đúng.
2. Giải thích khái niệm lý thuyết và nguyên lý cốt lõi đằng sau câu hỏi một cách khách quan.
3. Hướng dẫn học viên tự liên hệ kiến thức và tự tin đưa ra lựa chọn.
4. Trình bày ngắn gọn, sư phạm dưới 80 từ.`
  }

  const optionSuffix = targetOptionText ? ` ("${targetOptionText}")` : ''
  const optionFocus = targetOptionLetter
    ? `Phương án ${targetOptionLetter}${optionSuffix}`
    : 'phương án đã chọn'

  const actionHeader = isExplainingWrong ? 'TẠI SAO PHƯƠNG ÁN LẠI SAI' : 'TẠI SAO ĐÁP ÁN LẠI ĐÚNG'
  const reasonConclusion = isExplainingWrong ? 'không phù hợp / thiếu chính xác' : 'là đáp án hoàn toàn chính xác'

  return `HỌC VIÊN YÊU CẦU GIẢI THÍCH: ${actionHeader}
- Trọng tâm phân tích: ${optionFocus}
- Câu hỏi chi tiết: "${userQuery}"

HƯỚNG DẪN GIẢI THÍCH (THEO CẤU TRÚC SƯ PHẠM):
1. Giải thích khái niệm / lý thuyết cốt lõi của câu hỏi.
2. Nêu rõ logic suy luận vì sao ${optionFocus} ${reasonConclusion}.
3. Nếu học viên chọn nhầm, chỉ ra điểm gài bẫy hoặc điểm dễ gây nhầm lẫn thường gặp.
4. Trình bày ngắn gọn, súc tích dưới 80 từ.`
}
