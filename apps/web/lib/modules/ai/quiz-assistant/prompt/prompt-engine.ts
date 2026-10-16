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
        return `  Option ${letter}: ${cleanOpt}`
      })
      .join('\n')

    // Format Answers
    const getFormattedAnswerStr = (answer: number | number[] | null | undefined) => {
      if (answer === null || answer === undefined) return 'Not answered yet'
      const idxs = Array.isArray(answer) ? answer : [answer]
      return idxs
        .map((i) => {
          const letter = getLabel(i)
          const cleanText = (question.options[i] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')
          return `Option ${letter} (${cleanText})`
        })
        .join(', ')
    }

    const correctText = getFormattedAnswerStr(question.correctAnswer)
    const submittedText = getFormattedAnswerStr(userSubmittedAnswer)
    const courseStr = courseCode ? `subject ${courseCode}` : 'this subject'

    // 2. Format Retrieved Evidence (Invariant 3: Evidence-First)
    let evidenceSection = `In the question bank for ${courseStr}, no other question was found using this option as the correct answer.`
    if (evidences && evidences.length > 0) {
      evidenceSection = evidences
        .map((e, idx) => {
          const qCorrect = Array.isArray(e.correctAnswer)
            ? e.correctAnswer.map((i) => getLabel(i)).join(', ')
            : (e.correctAnswer !== undefined ? getLabel(e.correctAnswer) : 'N/A')
          return `Evidence #${idx + 1} (Source: ${e.sourceType.toUpperCase()} - Match: ${(e.score * 100).toFixed(0)}%):\n- Question: "${e.content}"\n- Correct answer in that question: Option ${qCorrect}`
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
TIER 1: CURRENT QUESTION CONTEXT
=========================================
- Course Code: ${courseCode || 'N/A'}
- Question: "${question.text}"
- Options:
${formattedOptions}
- Correct answer for this question: ${correctText}
- Student's selected answer: ${submittedText}
- Option being queried by student: ${targetOptionText ? `"${targetOptionText}"` : 'Selected/queried option'}

=========================================
TIER 2: RETRIEVED EVIDENCE FROM DATABASE
=========================================
${evidenceSection}

=========================================
TIER 3: INTENT-SPECIFIC DIRECTIVE
=========================================
- Intent Classification: ${intent}
${intentDirective}

Analyze and return JSON strictly adhering to the specified schema.`
  }
}
