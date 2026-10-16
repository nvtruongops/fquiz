import type { InternalQuizContext } from '../../context/context-types'

export function buildFormulaTemplate(context: InternalQuizContext, userQuery: string): string {
  return `STUDENT REQUESTS FORMULA EXPLANATION & CALCULATION STEPS:
- Detailed question: "${userQuery}"

STEP-BY-STEP CALCULATION GUIDE:
1. State the formula name and standard mathematical / logical expression clearly.
2. Define the variables and parameters extracted from the question stem.
3. Guide the substitution of values and operations needed so the student can compute the result.
4. Place the complete calculation steps in the "formulaExplanation" field and summarize the concept in "reply".
5. Keep the response under 80 words.`
}
