import type { InternalQuizContext } from '../../context/context-types'
import type { RetrievalResult } from '../../retrieval/retrieval-types'

export function buildGeneralInquiryTemplate(
  context: InternalQuizContext,
  userQuery: string,
  evidences: RetrievalResult[]
): string {
  const { courseCode } = context
  const courseStr = courseCode ? `subject ${courseCode}` : 'this subject'
  const hasEvidence = evidences && evidences.length > 0

  return `STUDENT ASKS EXTENDED / GENERAL INQUIRY QUESTION:
- Student's query: "${userQuery}"

SCOPE & ANTI-CHEAT GUARD RULES:
1. IN-SCOPE: Only answer questions directly related to ${courseStr} concepts and the context of the current question.
2. ANTI-CHEAT GUARD: If the student directly asks "Give me the answer to this question", "Is it A, B, or C?", STRICTLY DO NOT give the answer letter. Explain the principles of the question and suggest elimination methods.
3. OUT-OF-SCOPE: If the query is completely unrelated to ${courseStr} (e.g. asking irrelevant trivia or other subjects), decline politely and briefly, guiding the student to ask questions related to ${courseStr}.
4. ${
    hasEvidence
      ? 'You may briefly reference the provided evidence if truly relevant.'
      : 'STRICTLY DO NOT claim this question or answer exists in the QuestionBank since no corresponding extracted evidence exists.'
  }
5. Keep response concise, pedagogical, academic, and under 80 words.`
}
