import type { InternalQuizContext } from '../../context/context-types'

export function buildFormulaTemplate(context: InternalQuizContext, userQuery: string): string {
  return `HỌC VIÊN YÊU CẦU GIẢI THÍCH CÔNG THỨC & CÁC BƯỚC TÍNH TOÁN:
- Câu hỏi chi tiết: "${userQuery}"

HƯỚNG DẪN TRÌNH BÀY CÔNG THỨC (STEP-BY-STEP CALCULATION GUIDE):
1. Nêu rõ tên công thức và biểu thức toán học / logic chuẩn.
2. Định nghĩa các biến số / tham số trích xuất từ đề bài.
3. Hướng dẫn cách thay số và phép tính cần thực hiện để học viên tự bấm máy ra kết quả.
4. Đặt toàn bộ các bước tính toán vào trường "formulaExplanation" và tóm tắt nguyên lý trong "reply".
5. Trình bày dưới 80 từ.`
}
