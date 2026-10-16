import type { InternalQuizContext } from '../../context/context-types'
import type { RetrievalResult } from '../../retrieval/retrieval-types'

export function buildSimilarQuestionTemplate(
  context: InternalQuizContext,
  userQuery: string,
  evidences: RetrievalResult[]
): string {
  const { targetOptionText, courseCode } = context
  const courseStr = courseCode ? `subject ${courseCode}` : 'this subject'
  const hasEvidence = evidences && evidences.length > 0
  const optionStr = targetOptionText || 'this option'

  const evidenceInstruction = hasEvidence
    ? [
        '1. SUITABLE EVIDENCE FOUND:',
        `   - Opening: "**YES!** In the cross-reference data for ${courseStr}, the following question was found with **\\"${optionStr}\\"** as the correct answer:"`,
        '   - Brief citation: Question stem and why the cross-referenced question selected this option.',
        '   - Set similarQuestionFound = true and similarQuestionDetails = found question stem.',
      ].join('\n')
    : [
        '1. NO SUITABLE EVIDENCE FOUND (SEMANTIC PRECISION):',
        `   - Opening: "Currently **no sufficiently matching question was found** in the cross-reference data for ${courseStr} that uses **\\"${optionStr}\\"** as the correct answer."`,
        '   - Explain in 1 concise sentence why this option is not correct for the current question.',
        '   - Set similarQuestionFound = false and similarQuestionDetails = null.',
      ].join('\n')

  return `STUDENT REQUESTS QUESTION BANK CROSS-REFERENCE & SIMILAR QUESTIONS:
- Option being queried: "${optionStr}"
- Detailed question: "${userQuery}"

CROSS-REFERENCE GUIDELINES (EVIDENCE-FIRST ENFORCEMENT):
${evidenceInstruction}
2. Always ensure the response is concise and under 80 words.`
}
