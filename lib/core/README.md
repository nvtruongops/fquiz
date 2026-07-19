# Core Infrastructure (`lib/core/`)

Hạ tầng dùng chung cho tất cả modules: database, DI container, AI providers, events, cache, search, security.

## Cấu trúc

```
core/
├── ai/                       # AI Provider abstraction
│   ├── ai-provider-interface.ts   # IAIProvider
│   ├── gemini-provider.ts         # GeminiProvider (gemini-2.0-flash-001)
│   ├── openai-provider.ts         # OpenAIProvider (GPT-4o-mini)
│   ├── dynamic-ai-provider.ts     # DynamicAIProvider (runtime switching)
│   └── index.ts
├── cache/                    # In-memory cache
│   ├── cache-interface.ts         # ICache (TTL + tag invalidation)
│   ├── in-memory-cache.ts         # InMemoryCache implementation
│   └── index.ts
├── constants/                # Cookie names, max age, etc.
├── db/
│   ├── mongodb.ts                 # Singleton connection + DNS SRV fallback
│   ├── model-registry.ts          # Lazy model bootstrap
│   └── base-schema.ts             # BaseEntityFields (Mongoose schema)
├── di/                       # Dependency Injection Container
│   ├── container.ts               # Container class (register, resolve)
│   └── index.ts                   # Wiring: providers + repos + services
├── events/                   # Event bus system
│   ├── event-bus-interface.ts     # IEventBus (domain/integration)
│   ├── in-memory-event-bus.ts     # InMemoryEventBus implementation
│   ├── event-bus.ts               # Legacy EventBus (simple on/emit)
│   ├── domain-event.ts            # IDomainEvent, DomainEventType
│   └── index.ts
├── mail/
│   └── mail.ts                    # Nodemailer + templates
├── queue/
│   └── qstash.ts                  # Upstash QStash wrapper
├── schemas/
│   └── common.ts                  # Zod shared schemas
├── search/                   # Search provider abstraction
│   ├── search-provider-interface.ts # ISearchProvider
│   ├── atlas-search-provider.ts     # AtlasSearchProvider
│   └── index.ts
├── security/                 # CSRF, rate-limit
│   ├── csrf.ts
│   └── rate-limit/
├── types/                    # Shared types
│   ├── base-entity.ts             # IBaseEntity, EntityStatus, IBaseMetadata
│   └── domain-metadata.ts         # IDomainMetadata, IAIMetadata, CEFRLevel
├── utils/                    # cn(), logger (Pino), formatters
├── validation/
├── api-helpers.ts
└── __tests__/
```

## Database (`db/`)

### mongodb.ts
```
connectDB():
  1. Check global.mongooseCache (singleton)
  2. Mongoose.connect(MONGODB_URI, options)
  3. DNS SRV fallback: system resolver → 8.8.8.8/1.1.1.1
  4. bootstrapModels() — register all models
  5. Return connection

Options:
  serverSelectionTimeoutMS: 5000
  connectTimeoutMS: 10000
  socketTimeoutMS: 45000
  bufferCommands: false
```

### model-registry.ts
```
registerModel(fn: () => Promise<any>): void
bootstrapModels(): Promise<void>  // execute all registrations
```
Ngăn `MissingSchemaError` trong Next.js Serverless: mỗi module `index.ts` gọi `registerModel()`, `connectDB()` gọi `bootstrapModels()` sau khi kết nối.

### base-schema.ts
```
BaseEntityFields = {
  createdBy, updatedBy, deletedAt, deletedBy,
  status, schemaVersion, contentVersion, metadata
}
```
Dùng cho tất cả Phase 2+ models (learning, AIAsset).

## DI Container (`di/`)

```typescript
class Container {
  register<T>(token, factory): void           // transient
  registerSingleton<T>(token, factory): void  // singleton
  resolve<T>(token): T
  has(token): boolean
  reset(): void
}
```

### Wiring (`di/index.ts`)

**Singletons**:
| Token | Implementation |
|-------|---------------|
| `IEventBus` | `InMemoryEventBus` |
| `ICache` | `InMemoryCache` |
| `ISearchProvider` | `AtlasSearchProvider` |
| `IAIProvider` | `DynamicAIProvider` |

**Transient** (10 repos + 6 services):
- Learning repositories (Language, Topic, Course, Module, Lesson, Vocabulary, Grammar, Sentence, Paragraph, LearningProgress, SentenceRead)
- Services: VocabularyService, SentenceService, LearningProgressService, LessonLearningService, CourseLearningService, AIContentService

## AI Providers (`ai/`)

### IAIProvider Interface
```typescript
interface IAIProvider {
  getProviderName?(): string
  generate<T>(prompt, schema, options?): Promise<AIGenerationResult<T>>
  embed(texts): Promise<AIEmbeddingResult>
  moderate(text): Promise<AIModerationResult>
}
```

### Provider Implementations

| Provider | Model | Features |
|----------|-------|----------|
| `GeminiProvider` | gemini-2.0-flash-001 (text), text-embedding-004 (embedding) | `@google/generative-ai` SDK, cost estimation |
| `OpenAIProvider` | GPT-4o-mini, text-embedding-3-small | OpenAI-compatible API, `extractJsonString()` helper |
| `DynamicAIProvider` | Runtime switching | Reads `SiteSettings.llm_config.active_provider`, falls back to Gemini |

## Event Bus (`events/`)

### New Interface (IEventBus)
```typescript
interface IEventBus {
  publishDomainEvent<T>(event): void
  publishIntegrationEvent<T>(event): void
  subscribe<T>(eventType, handler): void
  unsubscribe(eventType, handler): void
  reset(): void
}
```

Distinguishes between domain events (internal) and integration events (external).

### Legacy EventBus
```typescript
class EventBus {
  on(event, handler): void
  emit(event, data): void
  reset(): void
}
```
Still used by AIContentService and VocabularyService directly via singleton `eventBus`.

## Cache (`cache/`)

```typescript
interface ICache {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttlSeconds?: number, tags?: string[]): void
  delete(key: string): void
  invalidateByTags(tags: string[]): void
  flush(): void
}
```

In-memory Map-based with TTL + tag tracking. Used for lesson content cache and course structure cache.

## Types

### IBaseEntity
```
EntityStatus: draft | pending | published | archived | deleted
IBaseMetadata: searchKeywords, normalizedText, embeddingStatus, source, sourceRef, tags
IBaseEntity: _id, createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy,
              status, schemaVersion, contentVersion, metadata
```

### IDomainMetadata
```
languageId, languageCode, topicId, cefrLevel, difficulty, frequency, tags,
source (manual|ai_generated|ai_assisted|imported), isVerified, verifiedBy, verifiedAt
```

### IAIMetadata
```
aiProvider, aiModel, aiPromptVersion, aiGeneratedBy, aiGeneratedAt,
aiVerified, aiReviewStatus, aiGenerationType, aiAssetId, aiConfidence
```
