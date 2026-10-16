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
    // Comparison / Choice conflict: e.g. "tại sao là true mà không phải false", "why A instead of B", "compare options"
    if (
      /(?:tại sao|vì sao|sao|lý do|why).*(?:mà không phải|thay vì|chứ không phải|hơn là|instead of|rather than)/i.test(clean) ||
      /(?:so sánh|khác nhau|phân biệt|sự khác biệt|compare|difference).*(?:phương án|đáp án|lựa chọn|option|choice|answer)/i.test(clean) ||
      /^compare\s+/i.test(clean)
    ) {
      return 'COMPARE_OPTIONS'
    }

    // Asking why an option is wrong / why not an option / why eliminated
    // e.g. "tại sao không phải là B", "why is B wrong", "why not C", "why eliminate D"
    if (
      /(?:tại sao|vì sao|sao|lý do|why).*(?:không phải|không chọn|không thể là|loại|bỏ|sai|không đúng|chưa đúng|nhầm|bị lỗi|wrong|incorrect|false|not|eliminate)/i.test(clean) ||
      /(?:tại sao|vì sao|sao|lý do|why)\s+(?:not\s+)?[a-d]\b.*(?:sai|không đúng|loại|wrong|incorrect)?/i.test(clean) ||
      clean.includes('tôi chọn sai') ||
      clean.includes('không phải là') ||
      clean.includes('why not') ||
      clean.includes('is wrong') ||
      clean.includes('is incorrect')
    ) {
      return 'EXPLAIN_WRONG_ANSWER'
    }

    // Asking why a specific answer is correct: e.g. "tại sao là true", "why is B correct", "reason for A"
    if (
      /(?:tại sao|vì sao|sao|lý do|why).*(?:là|chọn|is)\s*(?:true|false|[a-d])\b/i.test(clean) ||
      /(?:tại sao|vì sao|sao|lý do|why).*(?:đúng|chính xác|chuẩn|correct|right)/i.test(clean) ||
      /(?:giải thích|phân tích|explain|analyze).*(?:đáp án|answer)/i.test(clean)
    ) {
      return 'EXPLAIN_CORRECT_ANSWER'
    }

    // Formulas & calculations
    if (/(?:công thức|bước tính|cách tính|tính toán|formula|bước giải|phép tính|calculation|equation)/i.test(clean)) {
      return 'EXPLAIN_FORMULA'
    }

    // Retrieval inquiries
    if (/(?:câu.*tương tự|câu.*trùng|ngân hàng đề|đề thi khác|có câu nào khác|trong môn.*có câu nào|question bank|similar question|duplicate)/i.test(clean)) {
      return 'FIND_SIMILAR_QUESTION'
    }

    // Direct answer requests & solving steps -> Route to SOLVE_QUESTION for Anti-Cheat Guided Learning
    if (
      /(?:hướng dẫn giải|cách giải|giải như thế nào|làm sao để giải|tư duy giải|solve|how to solve|approach|solution steps)/i.test(clean) ||
      /(?:^đáp án$|^câu trả lời$|đáp án là gì|cho xin đáp án|hỏi đáp án|xin đáp án|câu này chọn gì|chọn phương án nào|chỉ đáp án|đáp án câu này|kết quả câu này|cho đáp án|câu này là gì|what is the answer|give me the answer|tell me the answer)/i.test(clean)
    ) {
      return 'SOLVE_QUESTION'
    }

    // Default fallback intent
    return 'GENERAL_INQUIRY'
  }
}
