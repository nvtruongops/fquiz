# AI Module (`lib/modules/ai/`)

Module quản lý nội dung sinh bởi AI (Gemini/OpenAI) cho dịch vụ học ngôn ngữ.

## Cấu trúc

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
| `requestPayload` | Record | Raw request |
| `responsePayload` | Record | Zod-validated response |
| `tokensUsed` | number | Token usage |
| `costEstimated` | number | Estimated cost |

Extends `IBaseEntity`: `status`, `createdBy`, `updatedBy`, `deletedAt`, `metadata`.

**Unique index**: `{ requestHash, aiProvider }` — prevents duplicate API calls.

### AILearningLog

Standalone model (does NOT extend IBaseEntity). Tracks AI generation usage per user/language.

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
  ├─ 2. SHA-256 requestHash
  ├─ 3. Check AIAsset DB (dedup) → found? reuse response
  ├─ 4. Check in-memory cache → hit? return cached
  ├─ 5. Call IAIProvider.generate() → Gemini/OpenAI
  ├─ 6. Validate with Zod schema
  ├─ 7. Persist to AIAsset
  ├─ 8. Emit AIAssetGenerated event
  └─ 9. Return result
```

## Prompts

11 prompt types, each with Zod schema for output validation:

| # | Prompt | Output |
|---|--------|--------|
| 1 | `vocabularyGeneration` | Từ vựng + định nghĩa + ví dụ |
| 2 | `sentenceGeneration` | Câu ví dụ theo ngữ pháp |
| 3 | `paragraphGeneration` | Đoạn văn theo chủ đề |
| 4 | `grammarGeneration` | Pattern ngữ pháp + giải thích |
| 5 | `quizGeneration` | Câu hỏi trắc nghiệm |
| 6 | `flashcardGeneration` | Flashcard 2 mặt |
| 7 | `translation` | Bản dịch + giải thích |
| 8 | `dialogueGeneration` | Hội thoại theo ngữ cảnh |
| 9 | `storyGeneration` | Truyện ngắn theo trình độ |
| 10 | `writingGeneration` | Đề bài viết + gợi ý |
| 11 | `writingEvaluation` | Chấm bài viết + feedback |

## Dependencies

- **IAIProvider** (from `lib/core/ai/`) — GeminiProvider, OpenAIProvider, DynamicAIProvider
- **ICache** (from `lib/core/cache/`) — in-memory dedup
- **EventBus** (from `lib/core/events/`) — emit `AIAssetGenerated` events
- **DI Container** (from `lib/core/di/`) — AIContentService is DI-wired

## Module Rules

- No cross-module model imports
- `index.ts` chỉ chứa `registerModel()` calls
- Zod schemas trong prompts/ validate structured JSON từ AI
