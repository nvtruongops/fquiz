import type { InternalQuizContext } from '../../context/context-types'

export function buildSolveTemplate(context: InternalQuizContext, userQuery: string): string {
  return `STUDENT REQUESTS METHODOLOGY & PROBLEM-SOLVING APPROACH (HOW TO APPROACH):
- Detailed question: "${userQuery}"

PEDAGOGICAL CONTRACT FOR SOLVE_QUESTION:
1. Objective: Guide the student on METHODOLOGY AND APPROACH TO THIS TYPE OF QUESTION. Strictly DO NOT turn into EXPLAIN_CORRECT_ANSWER (never begin with "The correct answer is...").
2. 4-step framework:
   - Step 1 (Keywords): Identify key keywords, constraints, or traps in the question stem.
   - Step 2 (Concept/Rule): Recall the relevant theoretical concept or core business rule.
   - Step 3 (Elimination): Guide criteria for eliminating distractors.
   - Step 4 (Self-Check): Suggest how to sanity-check the final choice.
3. Length: Under 100 words, formatted with clear bullet points guiding reasoning.`
}
