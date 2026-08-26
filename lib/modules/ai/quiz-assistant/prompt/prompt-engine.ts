import { SYSTEM_RULES } from './system-rules'
import type { InternalQuizContext } from '../context/context-types'
import type { RetrievalResult } from '../retrieval/retrieval-types'
import type { QuizAIIntent } from '../schemas/quiz-assistant.schema'
import { buildExplainTemplate } from './templates/explain.template'
import { buildSimilarQuestionTemplate } from './templates/similar-question.template'
import { buildCompareTemplate } from './templates/compare.template'
import { buildFormulaTemplate } from './templates/formula.template'
import { buildSolveTemplate } from './templates/solve.template'
import { buildGeneralInquiryTemplate } from './templates/general-inquiry.template'

export interface BuildPromptParams {
  context: InternalQuizContext
  intent: QuizAIIntent
  userQuery: string
  evidences: RetrievalResult[]
}

export class PromptEngine {
  static build(params: BuildPromptParams): string {
    const { context, intent, userQuery, evidences } = params
    const { question, courseCode, userSubmittedAnswer, targetOptionText } = context

    const getLabel = (idx: number) => String.fromCharCode(65 + idx)

    // 1. Format Current Question Options
    const formattedOptions = question.options
      .map((opt, i) => {
        const letter = getLabel(i)
        const cleanOpt = opt.replace(/^[A-Z][\.\)]\s*/i, '')
        return `  Phương án ${letter}: ${cleanOpt}`
      })
      .join('\n')

    // Format Answers
    const getFormattedAnswerStr = (answer: number | number[] | null | undefined) => {
      if (answer === null || answer === undefined) return 'Chưa chọn'
      const idxs = Array.isArray(answer) ? answer : [answer]
      return idxs
        .map((i) => {
          const letter = getLabel(i)
          const cleanText = (question.options[i] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')
          return `Phương án ${letter} (${cleanText})`
        })
        .join(', ')
    }

    const correctText = getFormattedAnswerStr(question.correctAnswer)
    const submittedText = getFormattedAnswerStr(userSubmittedAnswer)
    const courseStr = courseCode ? `môn ${courseCode}` : 'môn học này'

    // 2. Format Retrieved Evidence (Invariant 3: Evidence-First)
    let evidenceSection = `Trong ngân hàng đề ${courseStr}, không tìm thấy câu hỏi nào khác sử dụng phương án này làm đáp án đúng.`
    if (evidences && evidences.length > 0) {
      evidenceSection = evidences
        .map((e, idx) => {
          const qCorrect = Array.isArray(e.correctAnswer)
            ? e.correctAnswer.map((i) => getLabel(i)).join(', ')
            : (e.correctAnswer !== undefined ? getLabel(e.correctAnswer) : 'N/A')
          return `Bằng chứng #${idx + 1} (Nguồn: ${e.sourceType.toUpperCase()} - Độ khớp: ${(e.score * 100).toFixed(0)}%):\n- Đề bài: "${e.content}"\n- Đáp án đúng trong câu đó: Phương án ${qCorrect}`
        })
        .join('\n\n')
    }

    // 3. Select Intent-Specific Directive
    let intentDirective = ''
    switch (intent) {
      case 'EXPLAIN_WRONG_ANSWER':
        intentDirective = buildExplainTemplate(context, true, userQuery, evidences)
        break
      case 'EXPLAIN_CORRECT_ANSWER':
        intentDirective = buildExplainTemplate(context, false, userQuery, evidences)
        break
      case 'FIND_SIMILAR_QUESTION':
        intentDirective = buildSimilarQuestionTemplate(context, userQuery, evidences)
        break
      case 'COMPARE_OPTIONS':
        intentDirective = buildCompareTemplate(context, userQuery)
        break
      case 'EXPLAIN_FORMULA':
        intentDirective = buildFormulaTemplate(context, userQuery)
        break
      case 'SOLVE_QUESTION':
        intentDirective = buildSolveTemplate(context, userQuery)
        break
      case 'GENERAL_INQUIRY':
      default:
        intentDirective = buildGeneralInquiryTemplate(context, userQuery, evidences)
        break
    }

    // 4. 4-Tier Prompt Assembly
    return `${SYSTEM_RULES}

=========================================
TẦNG 1: NGỮ CẢNH CÂU HỎI HIỆN TẠI (CURRENT QUESTION)
=========================================
- Mã môn học: ${courseCode || 'N/A'}
- Đề bài: "${question.text}"
- Các lựa chọn:
${formattedOptions}
- Đáp án đúng của câu này: ${correctText}
- Đáp án học viên đã chọn: ${submittedText}
- Phương án học viên đang thắc mắc: ${targetOptionText ? `"${targetOptionText}"` : 'Phương án đã chọn/hỏi'}

=========================================
TẦNG 2: BẰNG CHỨNG TRÍCH XUẤT TỪ DATABASE (RETRIEVED EVIDENCE)
=========================================
${evidenceSection}

=========================================
TẦNG 3: CHỈ THỊ CHUYÊN BIỆT THEO Ý ĐỊNH (INTENT-SPECIFIC DIRECTIVE)
=========================================
- Phân loại ý định: ${intent}
${intentDirective}

Hãy phân tích và trả về định dạng JSON theo đúng schema quy định.`
  }
}
