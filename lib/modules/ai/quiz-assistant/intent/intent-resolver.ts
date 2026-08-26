import type { QuizAIIntent } from '../schemas/quiz-assistant.schema'

export class IntentResolver {
  static resolve(userQuery: string, explicitIntent?: QuizAIIntent): QuizAIIntent {
    // 1. If explicit intent provided from UI Quick Buttons -> Trust explicitly
    if (explicitIntent) {
      return explicitIntent
    }

    const clean = (userQuery || '').trim().toLowerCase()
    if (!clean) return 'GENERAL_INQUIRY'

    // 2. Pattern Matching Rules for Free-Text Inputs
    // Comparison / Choice conflict: e.g. "tại sao là true mà không phải false", "tại sao chọn A thay vì B"
    if (
      /(?:tại sao|vì sao|sao|lý do).*(?:mà không phải|thay vì|chứ không phải|hơn là)/i.test(clean) ||
      /(?:so sánh|khác nhau|phân biệt|sự khác biệt|compare).*(?:phương án|đáp án|lựa chọn)/i.test(clean)
    ) {
      return 'COMPARE_OPTIONS'
    }

    // Asking why an option is wrong / why not an option / why eliminated
    // e.g. "tại sao không phải là B", "tại sao không chọn B", "vì sao loại C", "tại sao A sai"
    if (
      /(?:tại sao|vì sao|sao|lý do).*(?:không phải|không chọn|không thể là|loại|bỏ|sai|không đúng|chưa đúng|nhầm|bị lỗi)/i.test(clean) ||
      /(?:tại sao|vì sao|sao|lý do)\s+[a-d]\s+(?:sai|không đúng|loại)/i.test(clean) ||
      clean.includes('tôi chọn sai') ||
      clean.includes('không phải là')
    ) {
      return 'EXPLAIN_WRONG_ANSWER'
    }

    // Asking why a specific answer is correct: e.g. "tại sao là true", "tại sao đáp án là B", "lý do chọn A"
    if (
      /(?:tại sao|vì sao|sao|lý do).*(?:là|chọn)\s*(?:true|false|[a-d])\b/i.test(clean) ||
      /(?:tại sao|vì sao|sao|lý do).*(?:đúng|chính xác|chuẩn)/i.test(clean) ||
      /(?:giải thích|phân tích).*đáp án/i.test(clean)
    ) {
      return 'EXPLAIN_CORRECT_ANSWER'
    }

    // Formulas & calculations
    if (/(?:công thức|bước tính|cách tính|tính toán|formula|bước giải|phép tính)/i.test(clean)) {
      return 'EXPLAIN_FORMULA'
    }

    // Retrieval inquiries
    if (/(?:câu.*tương tự|câu.*trùng|ngân hàng đề|đề thi khác|có câu nào khác|trong môn.*có câu nào|question bank)/i.test(clean)) {
      return 'FIND_SIMILAR_QUESTION'
    }

    // Direct answer requests & solving steps -> Route to SOLVE_QUESTION for Anti-Cheat Guided Learning
    if (
      /(?:hướng dẫn giải|cách giải|giải như thế nào|làm sao để giải|tư duy giải|solve)/i.test(clean) ||
      /(?:^đáp án$|^câu trả lời$|đáp án là gì|cho xin đáp án|hỏi đáp án|xin đáp án|câu này chọn gì|chọn phương án nào|chỉ đáp án|đáp án câu này|kết quả câu này|cho đáp án|câu này là gì)/i.test(clean)
    ) {
      return 'SOLVE_QUESTION'
    }

    // Default fallback intent
    return 'GENERAL_INQUIRY'
  }
}
