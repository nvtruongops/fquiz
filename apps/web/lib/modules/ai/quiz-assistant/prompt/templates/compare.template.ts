import type { InternalQuizContext } from '../../context/context-types'

export function buildCompareTemplate(context: InternalQuizContext, userQuery: string): string {
  return `STUDENT REQUESTS COMPARISON OF OPTIONS:
- Detailed question: "${userQuery}"

OBJECTIVE CONCEPT COMPARISON GUIDELINES:
Compare the relevant options according to this concise structure:
1. **Context & Essence**: Meaning and scope of application of each option.
2. **Key Differentiating Factors**: Core criteria distinguishing the boundary between them.
3. **Exam Traps**: Common misconceptions or distractor points between options.
4. **Do Not Choose for Student**: Help the student understand the distinctions so they can make the correct decision themselves.

Keep under 100 words, concise and pedagogical.`
}
