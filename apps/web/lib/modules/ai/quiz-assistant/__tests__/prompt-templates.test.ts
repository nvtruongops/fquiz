import { PromptEngine } from '../prompt/prompt-engine'
import type { InternalQuizContext } from '../context/context-types'
import type { RetrievalResult } from '../retrieval/retrieval-types'

describe('Specialized Prompt Templates Tests (Task 1.1)', () => {
  const baseContext: InternalQuizContext = {
    userId: 'user-123',
    sessionId: 'session-456',
    courseCode: 'PMG201C',
    categoryId: 'cat-1',
    currentQuestionIndex: 0,
    actualQuestionIndex: 0,
    question: {
      id: 'q-1',
      text: 'In project management, which document defines communication channels?',
      options: ['A. Scope Statement', 'B. Communication Management Plan', 'C. Risk Register', 'D. WBS'],
      correctAnswer: 1,
      explanation: 'Communication Management Plan defines stakeholders and communication frequency.',
    },
    userSubmittedAnswer: 0, // Selected A (wrong)
    targetOptionIndex: 0,
    targetOptionLetter: 'A',
    targetOptionText: 'Scope Statement',
  }

  it('EXPLAIN_WRONG_ANSWER: should prompt reasoning on why selected option is wrong', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'EXPLAIN_WRONG_ANSWER',
      userQuery: 'Why is option A incorrect?',
      evidences: [],
    })

    expect(prompt).toContain('TIER 1: CURRENT QUESTION CONTEXT')
    expect(prompt).toContain('STUDENT REQUESTS EXPLANATION: WHY THE OPTION IS WRONG')
    expect(prompt).toContain('Option A ("Scope Statement")')
    expect(prompt).toContain('common distractors, pitfalls, or common misconceptions')
  })

  it('FIND_SIMILAR_QUESTION with Evidence: should enforce citation and similarQuestionFound=true', () => {
    const evidences: RetrievalResult[] = [
      {
        id: 'qb-1',
        sourceType: 'question_bank',
        sourceId: '1',
        content: 'Which plan covers stakeholder communication?',
        options: ['A. Communication Management Plan'],
        correctAnswer: 0,
        score: 0.95,
        metadata: {},
      },
    ]

    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'FIND_SIMILAR_QUESTION',
      userQuery: 'Are there similar questions in the question bank?',
      evidences,
    })

    expect(prompt).toContain('TIER 2: RETRIEVED EVIDENCE FROM DATABASE')
    expect(prompt).toContain('Which plan covers stakeholder communication?')
    expect(prompt).toContain('SUITABLE EVIDENCE FOUND')
    expect(prompt).toContain('similarQuestionFound = true')
  })

  it('FIND_SIMILAR_QUESTION without Evidence (INVARIANT 3): should strictly prohibit claiming QuestionBank membership', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'FIND_SIMILAR_QUESTION',
      userQuery: 'Find similar question',
      evidences: [],
    })

    expect(prompt).toContain('NO SUITABLE EVIDENCE FOUND')
    expect(prompt).toContain('no sufficiently matching question was found')
    expect(prompt).toContain('similarQuestionFound = false')
  })

  it('COMPARE_OPTIONS: should enforce 4-part structured comparison', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'COMPARE_OPTIONS',
      userQuery: 'Compare option A and option B',
      evidences: [],
    })

    expect(prompt).toContain('STUDENT REQUESTS COMPARISON OF OPTIONS')
    expect(prompt).toContain('Context & Essence')
    expect(prompt).toContain('Key Differentiating Factors')
    expect(prompt).toContain('Exam Traps')
    expect(prompt).toContain('Do Not Choose for Student')
  })

  it('EXPLAIN_FORMULA: should structure formula definition and step-by-step calculation', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'EXPLAIN_FORMULA',
      userQuery: 'What is the formula to calculate communication channels?',
      evidences: [],
    })

    expect(prompt).toContain('STUDENT REQUESTS FORMULA EXPLANATION & CALCULATION STEPS')
    expect(prompt).toContain('formulaExplanation')
  })

  it('GENERAL_INQUIRY without Evidence: should ground in course context and prevent hallucinated QuestionBank claims', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'GENERAL_INQUIRY',
      userQuery: 'Tips for getting high score in PMG201C?',
      evidences: [],
    })

    expect(prompt).toContain('STUDENT ASKS EXTENDED / GENERAL INQUIRY QUESTION')
    expect(prompt).toContain('STRICTLY DO NOT claim this question or answer exists in the QuestionBank')
    expect(prompt).toContain('ANTI-CHEAT GUARD')
  })

  it('ANTI-SPOIL GUARD: EXPLAIN_WRONG_ANSWER on unanswered question must not reveal correct answer', () => {
    const unattemptedContext: InternalQuizContext = {
      ...baseContext,
      userSubmittedAnswer: undefined,
      targetOptionIndex: undefined,
      targetOptionLetter: undefined,
      targetOptionText: undefined,
    }

    const prompt = PromptEngine.build({
      context: unattemptedContext,
      intent: 'EXPLAIN_WRONG_ANSWER',
      userQuery: 'Why is my answer wrong?',
      evidences: [],
    })

    expect(prompt).toContain('HAS NOT SELECTED ANY OPTION YET')
    expect(prompt).toContain('STRICTLY DO NOT reveal the correct answer upfront')
  })

  it('ANTI-SPOIL GUARD: EXPLAIN_CORRECT_ANSWER on unanswered question must not reveal correct answer', () => {
    const unattemptedContext: InternalQuizContext = {
      ...baseContext,
      userSubmittedAnswer: undefined,
      targetOptionIndex: undefined,
      targetOptionLetter: undefined,
      targetOptionText: undefined,
    }

    const prompt = PromptEngine.build({
      context: unattemptedContext,
      intent: 'EXPLAIN_CORRECT_ANSWER',
      userQuery: 'Why is this option correct?',
      evidences: [],
    })

    expect(prompt).toContain('STUDENT ASKS ABOUT CORRECT ANSWER DURING EXAM')
    expect(prompt).toContain('STRICTLY DO NOT directly reveal the answer letter')
  })

  it('SOLVE_QUESTION: should enforce 4-step framework without spoiling answer upfront', () => {
    const prompt = PromptEngine.build({
      context: baseContext,
      intent: 'SOLVE_QUESTION',
      userQuery: 'How to approach this question',
      evidences: [],
    })

    expect(prompt).toContain('STUDENT REQUESTS METHODOLOGY & PROBLEM-SOLVING APPROACH')
    expect(prompt).toContain('Step 1 (Keywords)')
    expect(prompt).toContain('Step 2 (Concept/Rule)')
    expect(prompt).toContain('Step 3 (Elimination)')
    expect(prompt).toContain('Step 4 (Self-Check)')
    expect(prompt).toContain('Strictly DO NOT turn into EXPLAIN_CORRECT_ANSWER')
  })

  it('IntentResolver: should correctly route negative choice questions to EXPLAIN_WRONG_ANSWER', () => {
    const { IntentResolver } = require('../intent/intent-resolver')
    expect(IntentResolver.resolve('Tại sao không phải là B ?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Vì sao không chọn C?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Why not D?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('Why is A incorrect?')).toBe('EXPLAIN_WRONG_ANSWER')
    expect(IntentResolver.resolve('why is B correct')).toBe('EXPLAIN_CORRECT_ANSWER')
  })
})
