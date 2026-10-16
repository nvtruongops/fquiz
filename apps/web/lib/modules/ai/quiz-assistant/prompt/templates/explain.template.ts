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
    return `STUDENT ASKS "WHY DID I CHOOSE WRONG" BUT HAS NOT SELECTED ANY OPTION YET:
- Status: The student has not ticked or selected any option for this question.
- Detailed question: "${userQuery}"

PEDAGOGICAL INTEGRITY & ANTI-SPOIL RULES:
1. STRICTLY DO NOT reveal the correct answer upfront when the student hasn't attempted yet.
2. Politely remind the student that they have not selected an option to analyze.
3. Provide guided thinking (highlight key terms in the question stem) so the student can confidently make a choice first.
4. Keep the response concise and pedagogical under 80 words.`
  }

  // 🛡️ Pedagogical Guard 2: If asking why correct answer is right without specifying/picking an option
  if (!isExplainingWrong && !targetOptionText) {
    return `STUDENT ASKS ABOUT CORRECT ANSWER DURING EXAM WITHOUT SELECTING AN OPTION:
- Status: The student has not chosen any option in the exam.
- Detailed question: "${userQuery}"

PEDAGOGICAL INTEGRITY & ANTI-SPOIL RULES:
1. STRICTLY DO NOT directly reveal the answer letter (A, B, C, D) or name the correct answer.
2. Explain the theoretical concept and core principle behind the question objectively.
3. Guide the student to connect their knowledge and make a confident choice.
4. Keep the response concise and pedagogical under 80 words.`
  }

  const optionSuffix = targetOptionText ? ` ("${targetOptionText}")` : ''
  const optionFocus = targetOptionLetter
    ? `Option ${targetOptionLetter}${optionSuffix}`
    : 'the selected option'

  const actionHeader = isExplainingWrong ? 'WHY THE OPTION IS WRONG' : 'WHY THE ANSWER IS CORRECT'
  const reasonConclusion = isExplainingWrong ? 'is unsuitable / inaccurate' : 'is entirely correct'

  return `STUDENT REQUESTS EXPLANATION: ${actionHeader}
- Focus of analysis: ${optionFocus}
- Detailed question: "${userQuery}"

PEDAGOGICAL EXPLANATION GUIDELINES:
1. Explain the core concept / theory behind the question.
2. Clearly explain the deductive logic of why ${optionFocus} ${reasonConclusion}.
3. If the student picked incorrectly, point out common distractors, pitfalls, or common misconceptions.
4. Keep the response concise and compact under 80 words.`
}
