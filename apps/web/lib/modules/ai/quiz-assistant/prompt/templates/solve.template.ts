import type { InternalQuizContext } from '../../context/context-types'

export function buildSolveTemplate(context: InternalQuizContext, userQuery: string): string {
  return `HỌC VIÊN YÊU CẦU HƯỚNG DẪN PHƯƠNG PHÁP & TƯ DUY GIẢI BÀI (HOW TO APPROACH):
- Câu hỏi chi tiết: "${userQuery}"

QUY TẮC SƯ PHẠM (PEDAGOGICAL CONTRACT FOR SOLVE_QUESTION):
1. Mục tiêu: Hướng dẫn học viên PHƯƠNG PHÁP TƯ DUY VÀ CÁCH TIẾP CẬN DẠNG BÀI NÀY, tuyệt đối KHÔNG tự động biến thành EXPLAIN_CORRECT_ANSWER (không được mở đầu bằng "Đáp án đúng là...").
2. Khung tư duy 4 bước:
   - Bước 1 (Keywords): Chỉ ra từ khóa then chốt và bẫy/ràng buộc cần chú ý trong đề bài.
   - Bước 2 (Concept/Rule): Nhắc lại khái niệm lý thuyết hoặc quy tắc nghiệp vụ cốt lõi cần áp dụng.
   - Bước 3 (Elimination): Hướng dẫn tiêu chí loại trừ các phương án gây nhiễu (distractors).
   - Bước 4 (Self-Check): Gợi ý cách tự kiểm tra tính hợp lý trước khi chốt lựa chọn.
3. Độ dài: Dưới 100 từ, trình bày gạch đầu dòng rõ ràng, mang tính dẫn dắt tư duy.`
}
