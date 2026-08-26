import type { InternalQuizContext } from '../../context/context-types'

export function buildCompareTemplate(context: InternalQuizContext, userQuery: string): string {
  return `HỌC VIÊN YÊU CẦU SO SÁNH CÁC PHƯƠNG ÁN LỰA CHỌN:
- Câu hỏi chi tiết: "${userQuery}"

HƯỚNG DẪN PHÂN TÍCH SO SÁNH (OBJECTIVE CONCEPT COMPARISON):
Hãy so sánh các phương án liên quan theo cấu trúc súc tích:
1. **Ngữ cảnh & Bản chất**: Ý nghĩa và phạm vi áp dụng của từng phương án.
2. **Điểm khác biệt then chốt**: Tiêu chí cốt lõi để phân định ranh giới giữa chúng.
3. **Bẫy đề thi**: Điểm nhầm lẫn phổ biến giữa các phương án.
4. **Không chọn hộ**: Giúp học viên hiểu rõ sự khác biệt để tự đưa ra quyết định chính xác.

Độ dài dưới 100 từ, súc tích và sư phạm.`
}
