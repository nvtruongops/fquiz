# Technical Design: Quiz AI Assistant (Knowledge Retrieval Engine)

Technical design specification for the **Quiz AI Assistant (Knowledge Retrieval Engine)** subsystem in FQuiz.

---

## 1. System Architecture Overview (8-Stage Processing Pipeline with Deadline Propagation)

The subsystem is architected according to **Clean Architecture / Layered Abstraction** principles, partitioned into **8 sequential, decoupled execution stages with strict Deadline Propagation**:

```mermaid
flowchart TD
    Client[QuizAIAssistantDrawer.tsx] -->|POST /api/v1/ai/quiz-assistant| Controller[route.ts - Thin Controller]
    Controller -->|withAuth: JWT verified userId | Orchestrator[QuizAIOrchestrator]
    
    subgraph 8-Stage Processing Pipeline [Request Budget: 2500ms]
        Orchestrator --> S1[Stage 1: ContextResolver]
        S1 -->|session.question_order -> InternalQuizContext| Orchestrator
        
        Orchestrator --> S2[Stage 2: IntentResolver]
        S2 -->|Explicit Intent / Resolved Intent| Orchestrator
        
        Orchestrator --> S3[Stage 3: Parallel Retrieval Engine]
        S3 -->|Promise.allSettled: QuestionBank & Quiz <= 300ms| S4[Stage 4: Ranking Engine]
        S4 -->|Configurable Weighted Score >= 0.50 -> Ranked Evidence[]| Orchestrator
        
        Orchestrator --> S5[Stage 5: PromptEngine]
        S5 -->|4-Tier Evidence Prompt| S6[Stage 6: LLM Generation / Fallback]
        
        S6 -->|LLM Deadline <= Remaining Time (~2200ms)| S7[Stage 7: Validation & ConfidenceEngine]
        S7 -->|Validated Output + Deterministic Confidence| S8[Stage 8: ResponseMapper]
        S8 -->|Clean Allowlisted Public Response: responseMode & evidenceUsed| Orchestrator
    end
    
    Orchestrator -->|PublicQuizAssistantResponse| Controller
    Controller -->|HTTP 200 JSON| Client
```

---

## 2. Directory Structure (`apps/web/lib/modules/ai/quiz-assistant/`)

```
apps/web/lib/modules/ai/quiz-assistant/
├── index.ts                           # Public exports & module entry point
├── orchestrator.ts                    # QuizAIOrchestrator - 8-stage pipeline orchestrator
│
├── context/
│   ├── context-types.ts               # InternalQuizContext, QuestionContext
│   └── quiz-context-resolver.ts       # Session, question_order, Quiz, CategoryId resolution
│
├── intent/
│   └── intent-resolver.ts             # Intent classification (EXPLAIN_WRONG, COMPARE, GENERAL...)
│
├── retrieval/
│   ├── retrieval-types.ts             # Type definitions for Retrieval
│   ├── retrieval-engine.interface.ts  # IRetrievalEngine interface
│   ├── mongo-question-retriever.ts    # Parallel Promise.allSettled search
│   └── ranking.ts                     # Weighted scoring config & dynamic thresholding
│
├── prompt/
│   ├── prompt-engine.ts               # 4-tier prompt builder
│   ├── system-rules.ts                # Anti-Spoil rules, tone, and directives
│   └── templates/                     # Intent-specific prompt templates
│       ├── explain-wrong.ts
│       ├── explain-correct.ts
│       ├── formula.ts
│       ├── compare.ts
│       ├── solve.ts
│       ├── similar-question.ts
│       └── general-inquiry.ts
│
├── confidence/
│   └── confidence-engine.ts           # Deterministic confidence evaluation algorithm
│
├── mapper/
│   └── response-mapper.ts             # DTO allowlist mapper preventing data leakage
│
└── schemas/
    └── quiz-assistant.schema.ts       # Zod schemas for LLM & API responses
```

---

## 3. Data Contracts & DTO Layer

### 3.1. Layered DTO Isolation ([`context-types.ts`](file:///apps/web/lib/modules/ai/quiz-assistant/context/context-types.ts))

```typescript
// Tier 1: Internal Context (Backend internal lifecycle only)
export interface InternalQuizContext {
  userId: string
  sessionId: string
  courseCode: string
  categoryId?: string
  currentQuestionIndex: number // UI index
  actualQuestionIndex: number  // session.question_order[UI index]
  question: {
    id: string
    text: string
    options: string[]
    correctAnswer: number | number[] // ⚠️ Never leaked to client
    explanation?: string
  }
  userSubmittedAnswer: number | number[] | null
  targetOptionIndex: number | null
  targetOptionLetter: string
  targetOptionText: string
}

// Tier 2: Retrieval Types
export interface RetrievalInput {
  courseCode: string
  categoryId?: string
  currentQuestionId?: string
  currentQuestionText: string
  targetOptionLetter?: string
  targetOptionText?: string
  userQuery: string
  intent: QuizAIIntent
  limit?: number
}

export interface RetrievalResult {
  id: string
  sourceType: 'question_bank' | 'quiz' | 'course_document'
  sourceId: string
  content: string
  options?: string[]
  correctAnswer?: number | number[]
  explanation?: string
  score: number // Relevance score [0.0 - 1.0]
  metadata: {
    courseCode?: string
    categoryId?: string
    quizId?: string
  }
}
```

### 3.2. Schemas & Response Modes ([`quiz-assistant.schema.ts`](file:///apps/web/lib/modules/ai/quiz-assistant/schemas/quiz-assistant.schema.ts))

```typescript
import { z } from 'zod'

export const QuizAIIntentEnum = z.enum([
  'EXPLAIN_WRONG_ANSWER',
  'EXPLAIN_CORRECT_ANSWER',
  'SOLVE_QUESTION',
  'EXPLAIN_FORMULA',
  'FIND_SIMILAR_QUESTION',
  'COMPARE_OPTIONS',
  'GENERAL_INQUIRY',
])
export type QuizAIIntent = z.infer<typeof QuizAIIntentEnum>

// Schema for raw LLM generation
export const LLMQuizAssistantOutputSchema = z.object({
  reply: z.string().min(1),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean().default(false),
  similarQuestionDetails: z.string().nullable().optional(),
})
export type LLMQuizAssistantOutput = z.infer<typeof LLMQuizAssistantOutputSchema>

// Schema for Public API response returned to client via ResponseMapper
export const QuizAssistantResponseSchema = z.object({
  intent: QuizAIIntentEnum,
  reply: z.string(),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean(),
  similarQuestionDetails: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  responseMode: z.enum(['llm', 'db_fallback', 'cached']),
  fallback: z.boolean(),
  evidenceUsed: z.array(
    z.object({
      sourceType: z.enum(['question_bank', 'quiz', 'course_document']),
      sourceId: z.string(),
      snippet: z.string(),
      relevance: z.number().min(0).max(1),
    })
  ),
})
export type QuizAssistantResponse = z.infer<typeof QuizAssistantResponseSchema>
```

---

## 4. 8-Stage Execution Details

### Stage 1: Context Resolution (`QuizContextResolver`)
- **Authoritative JWT Identity**: Extract `userId` strictly from `payload.userId` via `withAuth`, completely ignoring client-supplied `body.userId`.
- **Question Mapping Single Source of Truth**:
  ```typescript
  const questionOrder = session.question_order || []
  const actualIndex = typeof questionOrder[questionIndex] === 'number'
    ? questionOrder[questionIndex]
    : questionIndex
  ```
- **Document Resolution Chain**:
  1. `session.questions_cache[actualIndex]` $\rightarrow$
  2. `quizDoc.questions[actualIndex]` $\rightarrow$
  3. `Question.findById(quizDoc.question_refs[actualIndex])`.

### Stage 2: Intent Resolution (`IntentResolver`)
- When the client passes an explicit `intent` from Quick Action Buttons $\rightarrow$ used directly.
- Free Text analysis via Regex & Keywords:
  - *"why wrong"*, *"where is the mistake"* $\rightarrow$ `EXPLAIN_WRONG_ANSWER`
  - *"why correct"*, *"why is this the answer"* $\rightarrow$ `EXPLAIN_CORRECT_ANSWER`
  - *"formula"*, *"how to calculate"* $\rightarrow$ `EXPLAIN_FORMULA`
  - *"similar question"*, *"question bank"* $\rightarrow$ `FIND_SIMILAR_QUESTION`
  - *"compare"*, *"what is the difference"* $\rightarrow$ `COMPARE_OPTIONS`
  - *"how to solve"*, *"step by step"* $\rightarrow$ `SOLVE_QUESTION`
  - Fallback unmatched $\rightarrow$ `GENERAL_INQUIRY` (Only explains current question, does not claim QuestionBank verification).

### Stage 3: Parallel Retrieval with `Promise.allSettled` (`MongoQuestionRetriever`)
- **Partial Failure Resiliency**:
  ```typescript
  const results = await Promise.allSettled([
    this.queryQuestionBank(input, 300),
    this.queryQuizSubject(input, 300),
  ])

  const candidates: RetrievalResult[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      candidates.push(...r.value)
    } else {
      console.warn('[RetrievalEngine] Partial source error:', r.reason)
    }
  }
  ```

### Stage 4: Configurable Ranking Engine (`ranking.ts`)
- **Configurable Weights**:
  ```typescript
  export const RANKING_WEIGHTS = {
    optionMatch: 0.35,
    questionMatch: 0.35,
    categoryMatch: 0.15,
    courseMatch: 0.15,
  } as const

  export const MIN_RELEVANCE_SCORE = 0.50
  ```
- **Normalized Scoring $[0.0, 1.0]$**:
  - `computeOptionMatch(targetOptionText, candidateOptions)`: Token Dice/Jaccard similarity between targeted option and candidate correct options $\rightarrow [0.0, 1.0]$.
  - `computeQuestionMatch(currentQText, candidateQText)`: Keyword similarity between current and candidate questions $\rightarrow [0.0, 1.0]$.
  - `categoryMatch`: $1.0$ if matching `category_id`, else $0.0$.
  - `courseMatch`: $1.0$ if matching `course_code` prefix, else $0.0$.
- **Thresholding & Limits**: Filter candidates with $\text{Score} \ge 0.50$, sort descending, capped at `limit` (default 2).

### Stage 5: Prompt Construction (`PromptEngine`)
- **4 Distinct Data Tiers**:
  1. `SYSTEM RULES`: Anti-Spoil rules, concise style ($< 100$ words), Evidence-first mandate (strictly forbidden from claiming presence in QuestionBank if evidence list is empty).
  2. `CURRENT QUESTION`: Course code, question prompt, 4 options, correct answer, student choice.
  3. `RETRIEVED EVIDENCE`: Verified question references extracted from MongoDB (or explicit notice: *No verified questions found*).
  4. `USER REQUEST & INTENT`: Specific user intent and query.

### Stage 6: LLM Execution & Deadline Management
- **Deadline Budgeting**:
  - Total Request SLA: $2500\text{ms}$.
  - Elapsed Time: $\text{elapsedTime} = \text{Date.now()} - \text{startTime}$.
  - LLM Timeout: $\text{llmTimeout} = \min(2200\text{ms}, 2500\text{ms} - \text{elapsedTime})$.
- **Graceful DB Fallback**:
  - If the LLM exceeds budget, runs out of quota, or times out $\rightarrow$ activate `DBFallbackGenerator`.
  - Mark `responseMode = 'db_fallback'` and `fallback = true`.

### Stage 7: Validation & Confidence Calculation (`ConfidenceEngine`)
- Validate output through `LLMQuizAssistantOutputSchema.parse()`.
- Deterministic `confidence` calculation:
  ```typescript
  export class ConfidenceEngine {
    static evaluate(evidences: RetrievalResult[], intent: QuizAIIntent): 'high' | 'medium' | 'low' {
      if (evidences.length === 0) {
        return (intent === 'SOLVE_QUESTION' || intent === 'EXPLAIN_CORRECT_ANSWER') ? 'medium' : 'low'
      }
      const topScore = evidences[0]?.score ?? 0
      if (topScore >= 0.85 && evidences.length >= 2) return 'high'
      if (topScore >= 0.70 || evidences.length >= 1) return 'medium'
      return 'low'
    }
  }
  ```

### Stage 8: Response Mapping (`ResponseMapper`)
- **Allowlisting Fields**: Strips internal fields, exporting safe public DTOs only:
  ```typescript
  export class ResponseMapper {
    static toPublicResponse(params: {
      intent: QuizAIIntent
      llmOutput: LLMQuizAssistantOutput
      confidence: 'high' | 'medium' | 'low'
      evidences: RetrievalResult[]
      responseMode: 'llm' | 'db_fallback' | 'cached'
    }): QuizAssistantResponse {
      return {
        intent: params.intent,
        reply: params.llmOutput.reply,
        formulaExplanation: params.llmOutput.formulaExplanation,
        similarQuestionFound: params.llmOutput.similarQuestionFound,
        similarQuestionDetails: params.llmOutput.similarQuestionDetails,
        confidence: params.confidence,
        responseMode: params.responseMode,
        fallback: params.responseMode === 'db_fallback',
        evidenceUsed: params.evidences.map((e) => ({
          sourceType: e.sourceType,
          sourceId: e.sourceId,
          snippet: e.content.slice(0, 150),
          relevance: e.score,
        })),
      }
    }
  }
  ```

---

## 5. Thin Controller Pattern (`apps/web/app/api/v1/ai/quiz-assistant/route.ts`)

```typescript
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      const body = await req.json().catch(() => null)
      const parsed = QuizAssistantRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: parsed.error.issues },
          { status: 400 }
        )
      }

      await connectDB()
      const orchestrator = new QuizAIOrchestrator()
      const result = await orchestrator.execute({
        authenticatedUserId: payload.userId, // 🛡️ Authoritative JWT identity
        ...parsed.data,
      })

      return NextResponse.json({ ok: true, data: result })
    } catch (err: any) {
      console.error('[POST /api/v1/ai/quiz-assistant] Error:', err)
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: err.status || 500 })
    }
  },
  { roles: ['student', 'admin', 'dev'] }
)
```
