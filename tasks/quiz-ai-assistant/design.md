# Technical Design: Quiz AI Assistant (Knowledge Retrieval Engine)

Tài liệu thiết kế kỹ thuật chi tiết cho phân hệ **Quiz AI Assistant (Knowledge Retrieval Engine)** trong FQuiz.

---

## 1. Tổng quan Kiến trúc Hệ thống (8-Stage Processing Pipeline with Deadline Propagation)

Hệ thống được thiết kế theo nguyên lý **Clean Architecture / Layered Abstraction**, phân chia thành **8 giai đoạn xử lý độc lập, tuần tự và truyền hạn mức thời gian (Deadline Propagation)**:

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

## 2. Cấu trúc Thư mục Module (`lib/modules/ai/quiz-assistant/`)

```
lib/modules/ai/quiz-assistant/
├── index.ts                           # Public exports & module entry point
├── orchestrator.ts                    # QuizAIOrchestrator - Điều phối luồng 8 bước
│
├── context/
│   ├── context-types.ts               # InternalQuizContext, QuestionContext
│   └── quiz-context-resolver.ts       # Phân giải Session, question_order, Quiz, CategoryId
│
├── intent/
│   └── intent-resolver.ts             # Phân loại Intent (EXPLAIN_WRONG, COMPARE, GENERAL...)
│
├── retrieval/
│   ├── retrieval-types.ts             # Type definitions cho Retrieval
│   ├── retrieval-engine.interface.ts  # Interface IRetrievalEngine
│   ├── mongo-question-retriever.ts    # Parallel Promise.allSettled Search
│   └── ranking.ts                     # Weighted Scoring Config & Dynamic Thresholding
│
├── prompt/
│   ├── prompt-engine.ts               # Bộ sinh prompt theo 4 tầng dữ liệu
│   ├── system-rules.ts                # Quy định chung, giọng văn & mandate tiếng Việt
│   └── templates/                     # Các template theo từng Intent
│       ├── explain-wrong.ts
│       ├── explain-correct.ts
│       ├── formula.ts
│       ├── compare.ts
│       ├── solve.ts
│       ├── similar-question.ts
│       └── general-inquiry.ts
│
├── confidence/
│   └── confidence-engine.ts           # Thuật toán tính toán confidence khách quan
│
├── mapper/
│   └── response-mapper.ts             # DTO Mapper ngăn rò rỉ dữ liệu nội bộ
│
└── schemas/
    └── quiz-assistant.schema.ts       # Zod schemas cho LLM & API Response
```

---

## 3. Chi tiết Hợp đồng Dữ liệu & DTO Layer (Data Contracts)

### 3.1. DTO Phân tầng Ngăn ngừa Rò rỉ Dữ liệu ([`context-types.ts`](file:///e:/Code/fquiz/lib/modules/ai/quiz-assistant/context/context-types.ts))

```typescript
// Tầng 1: Internal Context (Chỉ lưu hành nội bộ Backend)
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
    correctAnswer: number | number[] // ⚠️ Tuyệt đối không để lọt ra Client
    explanation?: string
  }
  userSubmittedAnswer: number | number[] | null
  targetOptionIndex: number | null
  targetOptionLetter: string
  targetOptionText: string
}

// Tầng 2: Retrieval Types
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
  score: number // Điểm liên quan [0.0 - 1.0]
  metadata: {
    courseCode?: string
    categoryId?: string
    quizId?: string
  }
}
```

### 3.2. Schemas Đồng bộ API & Response Modes ([`quiz-assistant.schema.ts`](file:///e:/Code/fquiz/lib/modules/ai/quiz-assistant/schemas/quiz-assistant.schema.ts))

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

// Schema cho LLM sinh nội dung thuần túy
export const LLMQuizAssistantOutputSchema = z.object({
  reply: z.string().min(1),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean().default(false),
  similarQuestionDetails: z.string().nullable().optional(),
})
export type LLMQuizAssistantOutput = z.infer<typeof LLMQuizAssistantOutputSchema>

// Schema Public Response trả về Client qua ResponseMapper
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

## 4. Chi tiết Thiết kế 8 Giai đoạn Xử lý

### Giai đoạn 1: Context Resolution (`QuizContextResolver`)
- **Authoritative JWT Identity**: Lấy `userId` từ `payload.userId` của `withAuth`, phớt lờ hoàn toàn `body.userId`.
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

### Giai đoạn 2: Intent Resolution (`IntentResolver`)
- Nếu client truyền `intent` tường minh từ Quick Buttons $\rightarrow$ sử dụng trực tiếp.
- Nếu là Free Text $\rightarrow$ Phân tích Regex & Keywords:
  - *"tại sao sai"*, *"sai ở đâu"* $\rightarrow$ `EXPLAIN_WRONG_ANSWER`
  - *"tại sao đúng"*, *"vì sao là đáp án này"* $\rightarrow$ `EXPLAIN_CORRECT_ANSWER`
  - *"công thức"*, *"tính như thế nào"* $\rightarrow$ `EXPLAIN_FORMULA`
  - *"câu tương tự"*, *"ngân hàng đề"* $\rightarrow$ `FIND_SIMILAR_QUESTION`
  - *"so sánh"*, *"khác nhau thế nào"* $\rightarrow$ `COMPARE_OPTIONS`
  - *"giải thế nào"*, *"hướng dẫn giải"* $\rightarrow$ `SOLVE_QUESTION`
  - Không khớp $\rightarrow$ `GENERAL_INQUIRY` (Chỉ giải thích trên đề bài hiện tại, không claim QuestionBank).

### Giai đoạn 3: Parallel Retrieval với `Promise.allSettled` (`MongoQuestionRetriever`)
- **Khả năng chịu lỗi từng phần (Partial Failure Resiliency)**:
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

### Giai đoạn 4: Configurable Ranking Engine (`ranking.ts`)
- **Trọng số Cấu hình được**:
  ```typescript
  export const RANKING_WEIGHTS = {
    optionMatch: 0.35,
    questionMatch: 0.35,
    categoryMatch: 0.15,
    courseMatch: 0.15,
  } as const

  export const MIN_RELEVANCE_SCORE = 0.50
  ```
- **Hàm Chuẩn hóa Điểm $[0.0, 1.0]$**:
  - `computeOptionMatch(targetOptionText, candidateOptions)`: Tính độ tương đồng token Dice/Jaccard giữa phương án thắc mắc và các phương án đúng của câu ứng viên $\rightarrow [0.0, 1.0]$.
  - `computeQuestionMatch(currentQText, candidateQText)`: Tính độ tương đồng từ khóa giữa đề bài hiện tại và đề bài ứng viên $\rightarrow [0.0, 1.0]$.
  - `categoryMatch`: $1.0$ nếu cùng `category_id`, ngược lại $0.0$.
  - `courseMatch`: $1.0$ nếu cùng tiền tố môn học (`course_code`), ngược lại $0.0$.
- **Lọc Ngưỡng & Giới hạn**: Lọc candidates có $\text{Score} \ge 0.50$, sắp xếp giảm dần, lấy tối đa `limit` (mặc định 2).

### Giai đoạn 5: Prompt Construction (`PromptEngine`)
- **Phân tách 4 tầng dữ liệu rõ ràng**:
  1. `SYSTEM RULES`: Bắt buộc Tiếng Việt, ngắn gọn $< 100$ từ, Evidence-first mandate (Cấm bịa đặt có trong QuestionBank nếu danh sách bằng chứng rỗng).
  2. `CURRENT QUESTION`: Mã môn, đề bài, 4 phương án, đáp án đúng, phương án học viên chọn.
  3. `RETRIEVED EVIDENCE`: Danh sách câu hỏi đối chiếu trích xuất từ MongoDB (hoặc ghi rõ: *Không tìm thấy câu hỏi tương tự*).
  4. `USER REQUEST & INTENT`: Ý định và câu hỏi chi tiết của học viên.

### Giai đoạn 6: LLM Execution & Deadline Management
- **Quản lý Hạn mức Thời gian (Deadline Budget)**:
  - Tổng Request SLA: $2500\text{ms}$.
  - Thời gian đã trôi qua: $\text{elapsedTime} = \text{Date.now()} - \text{startTime}$.
  - LLM Timeout: $\text{llmTimeout} = \min(2200\text{ms}, 2500\text{ms} - \text{elapsedTime})$.
- **Graceful DB Fallback**:
  - Nếu LLM quá hạn mức hoặc gặp sự cố API key/quota/mất mạng $\rightarrow$ Kích hoạt `DBFallbackGenerator`.
  - Đánh dấu `responseMode = 'db_fallback'` và `fallback = true`.

### Giai đoạn 7: Validation & Confidence Calculation (`ConfidenceEngine`)
- Kiểm tra tính hợp lệ qua `LLMQuizAssistantOutputSchema.parse()`.
- Tính `confidence` tất định:
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

### Giai đoạn 8: Response Mapping (`ResponseMapper`)
- **Allowlisting Fields**: Loại bỏ mọi trường nhạy cảm, chỉ xuất các trường public an toàn:
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

## 5. Thin Controller Pattern (`app/api/v1/ai/quiz-assistant/route.ts`)

```typescript
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      const body = await req.json().catch(() => null)
      const parsed = QuizAssistantRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dữ liệu yêu cầu không hợp lệ', details: parsed.error.issues },
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
