# AI Module (`lib/modules/ai/`)

Manages AI-generated educational content (Gemini/OpenAI) and the Quiz AI Assistant real-time exam room copilot.

## Structure

```
ai/
├── models/
│   ├── AIAsset.ts          # AIAsset model (IBaseEntity, requestHash dedup)
│   └── AILearningLog.ts    # AILearningLog model (standalone, not IBaseEntity)
├── types/
│   ├── ai-types.ts         # IAIAsset, AIAssetStatus, AIGenerationType (12 types)
│   └── index.ts
├── prompts/
│   ├── registry.ts         # promptRegistry (11 prompt types → PromptDefinition)
│   ├── types.ts            # PromptDefinition, PromptMap
│   ├── index.ts            # Re-exports all 11 prompts
│   ├── vocabulary-generation.ts
│   ├── sentence-generation.ts
│   ├── paragraph-generation.ts
│   ├── grammar-generation.ts
│   ├── quiz-generation.ts
│   ├── flashcard-generation.ts
│   ├── translation.ts
│   ├── dialogue-generation.ts
│   ├── story-generation.ts
│   ├── writing-generation.ts
│   └── writing-evaluation.ts
├── services/
│   ├── ai-content.service.ts  # AIContentService — main service
│   └── index.ts
├── index.ts                # registerModel() bootstrap
└── __tests__/
    └── models/
```

## Models

### AIAsset

| Field | Type | Purpose |
|-------|------|---------|
| `requestHash` | string | SHA-256 hash of prompt + params — dedup key |
| `responseHash` | string | SHA-256 hash of AI response |
| `aiProvider` | string | 'gemini' \| 'openai' \| 'custom' |
| `aiModel` | string | Model name |
| `sourceType` | AIGenerationType | Type of generated content |
| `promptTemplate` | string | Versioned prompt key |
| `requestPayload` | Record | Raw request payload |
| `responsePayload` | Record | Zod-validated response payload |
| `tokensUsed` | number | Token usage count |
| `costEstimated` | number | Estimated cost in USD |

Extends `IBaseEntity`: `status`, `createdBy`, `updatedBy`, `deletedAt`, `metadata`.

**Unique index**: `{ requestHash, aiProvider }` — prevents duplicate API requests.

### AILearningLog

Standalone model (does NOT extend IBaseEntity). Tracks AI generation usage per user and language.

## AIContentService

```typescript
class AIContentService {
  async generate<T>(request: AIContentRequest): Promise<AIContentResult<T>>
}
```

### Flow

```
generate(request)
  ├─ 1. Build prompt from promptRegistry + params
  ├─ 2. Compute SHA-256 requestHash
  ├─ 3. Check AIAsset DB (dedup) → found? reuse response
  ├─ 4. Check in-memory cache → hit? return cached
  ├─ 5. Call IAIProvider.generate() → Gemini/OpenAI
  ├─ 6. Validate with Zod schema
  ├─ 7. Persist to AIAsset collection
  ├─ 8. Emit AIAssetGenerated event
  └─ 9. Return result
```

## Prompts

12 prompt types (11 educational generators + 1 quiz assistant), each featuring a Zod schema validating structured JSON output:

| # | Prompt | Output |
|---|--------|--------|
| 1 | `vocabularyGeneration` | Vocabulary terms + definitions + example sentences |
| 2 | `sentenceGeneration` | Example sentences based on grammar patterns |
| 3 | `paragraphGeneration` | Reading comprehension paragraphs by topic |
| 4 | `grammarGeneration` | Grammar patterns + structural explanations |
| 5 | `quizGeneration` | Multiple-choice questions |
| 6 | `flashcardGeneration` | Double-sided flashcard decks |
| 7 | `translation` | Translations with linguistic annotations |
| 8 | `dialogueGeneration` | Contextual conversational dialogues |
| 9 | `storyGeneration` | Short reading stories tailored by CEFR level |
| 10 | `writingGeneration` | Essay prompts + brainstorming suggestions |
| 11 | `writingEvaluation` | Essay evaluation + constructive feedback |
| 12 | `quizAssistantPrompt` | Multiple-choice question guidance & question bank verification |

## Quiz AI Assistant (Real-time Exam Room Assistant)

AI copilot providing real-time question explanations and question bank cross-referencing during active exams (`lib/modules/ai/quiz-assistant/`):
- **Sub-package Structure**:
  - `orchestrator.ts`: `QuizAIOrchestrator` orchestrating the 8-stage pipeline from request parsing to response emission.
  - `intent/intent-resolver.ts`: Intent classification (Explain, Compare, Formula, Similar Question, Solve, General).
  - `context/quiz-context-resolver.ts`: Extracts and enriches context for questions, quizzes, and student choices.
  - `retrieval/mongo-question-retriever.ts` & `ranking.ts`: Multi-source parallel retrieval from Question Bank (by `category_id`) and Quiz (by `course_code`).
  - `confidence/confidence-engine.ts`: Evaluates response confidence deterministically before dispatching.
  - `prompt/prompt-engine.ts` & `templates/`: 4-Tier Evidence prompt templates preventing hallucinations.
  - `telemetry/quiz-ai-telemetry.ts`: Tracks latency, token consumption, and success rates.
- **Specification Documents**: See [`tasks/quiz-ai-assistant/`](../../../tasks/quiz-ai-assistant/) (`requirements.md`, `design.md`, `tasks.md`, `SUMMARY.md`).

## Dependencies

- **IAIProvider** (from `lib/core/ai/`): GeminiProvider, OpenAIProvider, DynamicAIProvider
- **ICache** (from `lib/core/cache/`): In-memory deduplication cache
- **EventBus** (from `lib/core/events/`): Dispatches `AIAssetGenerated` events
- **DI Container** (from `lib/core/di/`): AIContentService wiring

## Module Rules

- No cross-module model imports (strictly models within `ai/models/`)
- All AI outputs must be validated through Zod schemas before storage or transmission
- Register all models via `registerModel()` in `index.ts`
