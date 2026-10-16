# Requirements: Quiz AI Assistant (Knowledge Retrieval Engine)

Requirements specification for the **Quiz AI Assistant (Exam Room AI Copilot)** subsystem architected as a **Knowledge Retrieval Engine (RAG-Ready on MongoDB Atlas)**.

---

## 1. System Goals & Positioning

- **Objective**: Upgrade the exam room AI assistant from a monolithic API handler (`route.ts`) to a clean, service-layered architecture ready for future RAG extensions without disrupting active exam rooms.
- **Scope**:
  - Provide real-time multiple-choice explanation assistance during active quiz sessions.
  - Cross-reference subject question banks (`QuestionBank`) to explain why student choices are correct or incorrect.
  - Operate as an in-database **Knowledge Retrieval Engine** on existing MongoDB collections (zero new vector DB infrastructure required for Phase 1).
  - Strictly adhere to **Zero API Breakage** and **Graceful Degradation** (guaranteed DB Fallback upon LLM network disruption or timeout).

---

## 2. Functional Requirements (FR)

### FR-1: Session Context & Identity Security Resolution
- **FR-1.1 (Authoritative JWT Identity)**:
  - User identity (`userId`) must be derived **100% from the verified JWT token via `withAuth`**.
  - Any `userId` provided in the client request body must be strictly ignored.
  - Validate session ownership: `session.student_id.toString() === tokenPayload.userId`.
- **FR-1.2 (Single Source of Truth for Question Mapping)**:
  - `session.question_order` is the **Single Source of Truth** for mapping UI question indices to canonical database questions:
    $$\text{actualIndex} = \text{session.question\_order}[\text{UI questionIndex}]$$
  - Question resolution chain:
    1. `session.questions_cache[actualIndex]` (if session snapshot exists).
    2. `quiz.questions[actualIndex]` (embedded questions).
    3. `Question.findById(quiz.question_refs[actualIndex])` (standalone references).
- **FR-1.3 (Subject & Category Resolution)**:
  - Automatically traverse relation chain: `Session` $\rightarrow$ `Quiz` $\rightarrow$ `course_code` (e.g. `PMG201C`) $\rightarrow$ `category_id`.
- **FR-1.4 (Selection State Extraction)**:
  - Extract the student's selected answer (`user_answers`), official correct answer, question prompt, and option list.

### FR-2: Comprehensive Intent Handling
- **FR-2.1 (Explicit Intent via Quick Action Buttons)**: Support explicit intent dispatch from 1-click UI triggers:
  - `EXPLAIN_WRONG_ANSWER`: Explain why the student's selected answer is incorrect.
  - `EXPLAIN_CORRECT_ANSWER`: Explain why the official answer is correct.
  - `FIND_SIMILAR_QUESTION`: Retrieve a verified similar question from the question bank.
  - `EXPLAIN_FORMULA`: Explain applicable formulas or calculation steps.
  - `COMPARE_OPTIONS`: Compare nuances between different answer options.
  - `SOLVE_QUESTION`: Provide step-by-step reasoning from first principles.
- **FR-2.2 (Free-Text Intent Resolution)**:
  - For free-form queries, `IntentResolver` categorizes the query into one of the canonical intents above.
- **FR-2.3 (General Inquiry Policy)**:
  - When the query does not match any specific intent $\rightarrow$ assign `GENERAL_INQUIRY`.
  - **Rule**: `GENERAL_INQUIRY` only addresses the immediate question context and **must never claim verification against QuestionBank** without explicit retrieved evidence. If no evidence is found $\rightarrow$ assign `confidence = 'low'`.

### FR-3: Fault-Tolerant Parallel Knowledge Retrieval
- **FR-3.1 (Interface Extensibility)**:
  - Abstract retrieval via `IRetrievalEngine` with signature `search(input: RetrievalInput): Promise<RetrievalResult[]>`.
- **FR-3.2 (Parallel Retrieval with `Promise.allSettled`)**:
  - Concurrently query `QuestionBank` (by `category_id`) and `Quiz` (by `course_code`) using `Promise.allSettled` with a $300\text{ms}$ deadline.
  - **Partial Failure Resiliency**: If one source fails or times out, the successful source must proceed through Ranking; a partial error must never fail the overall retrieval step.
- **FR-3.3 (Configurable Weighted Scoring & Dynamic Thresholding)**:
  - Compute composite relevance scores via configurable weights:
    $$\text{Score} = (\text{optionMatch} \times w_{\text{opt}}) + (\text{questionMatch} \times w_{\text{q}}) + (\text{categoryMatch} \times w_{\text{cat}}) + (\text{courseMatch} \times w_{\text{crs}})$$
    *(Default: $w_{\text{opt}}=0.35, w_{\text{q}}=0.35, w_{\text{cat}}=0.15, w_{\text{crs}}=0.15$)*.
  - Normalize `optionMatch` and `questionMatch` to $[0.0, 1.0]$.
  - Enforce minimum relevance threshold `MIN_RELEVANCE_SCORE = 0.50`.
  - Cap results at `limit` (default 2, max 3).

### FR-4: Evidence-First Prompt Engineering
- **FR-4.1 (4-Tier Prompt Hierarchy)**:
  1. `SYSTEM RULES`: Safety boundaries, pedagogical tone, English default, and length limits ($< 100$ words).
  2. `CURRENT QUESTION`: Course code, question prompt, 4 options, correct answer, student choice.
  3. `RETRIEVED EVIDENCE`: Verified question references from MongoDB (or explicit declaration: *No verified questions found*).
  4. `USER REQUEST`: Student query and resolved intent.
- **FR-4.2 (Evidence-First Mandate)**:
  - Strictly prohibit the assistant from claiming question presence in QuestionBank unless backed by a non-empty `RETRIEVED EVIDENCE` list.

### FR-5: Deterministic Confidence Engine
- **FR-5.1**: Confidence (`confidence`: `'high' | 'medium' | 'low'`) must be computed deterministically by the backend, never self-reported by the LLM.
- **FR-5.2 (Scoring Criteria)**:
  - 0 valid evidence $\rightarrow$ `'low'` (or `'medium'` for `SOLVE_QUESTION`/`EXPLAIN_CORRECT_ANSWER` when theory is self-contained).
  - $\ge 1$ evidence with `score >= 0.70` $\rightarrow$ `'medium'`.
  - $\ge 2$ evidence with `score >= 0.85` $\rightarrow$ `'high'`.

### FR-6: Anti-Leakage & Public DTO Allowlisting
- **FR-6.1 (DTO Boundary via `ResponseMapper`)**:
  - Maintain strict isolation across 3 object contexts:
    1. `InternalQuizContext`: Full internal state including `correct_answer` and session metadata.
    2. `LLMContext`: Sanitized prompt context sent to the provider.
    3. `PublicQuizAssistantResponse`: Public response mapped via `ResponseMapper` allowlist.
- **FR-6.2 (Safe Evidence Metadata)**:
  - `evidenceUsed` attached directly by backend (`sourceType`, `sourceId`, `snippet`, `relevance`).
  - Never leak unattempted correct answers into client payloads.

### FR-7: API Contract Synchronization & Response Modes
- **FR-7.1 (`responseMode` Semantics)**:
  - `'llm'`: Fresh response synthesized by the AI provider.
  - `'db_fallback'`: Rule-based structured response generated from database upon LLM timeout or outage.
  - `'cached'`: Deduplicated response from Cache/AIAsset keyed by: $\text{SHA-256}(\text{courseCode} + \text{questionId} + \text{intent} + \text{userQuery})$.
- **FR-7.2 (`fallback` Flag)**:
  - API response must include boolean `fallback` (`true` when `responseMode === 'db_fallback'`, otherwise `false`).

### FR-8: UI Micro-Interactions & Experience
- **FR-8.1**: Explicit intent dispatch from Quick Action buttons.
- **FR-8.2**: Evidence citation badges (`QuestionBank` / `Quiz`) and confidence indicators.
- **FR-8.3**: 100% compatibility across 4 themes (Light, Dark, Green, Pink) and responsive mobile views.

---

## 3. Non-Functional Requirements (NFR)

- **NFR-1 (SLA & Deadline Budgeting)**:
  - **Total Request SLA**: $\le 2500\text{ms}$.
  - **DB Retrieval Budget**: $\le 300\text{ms}$ (parallel execution).
  - **LLM Provider Budget**: $\text{Remaining Time} = \min(2200\text{ms}, 2500\text{ms} - \text{elapsedTime})$.
  - **Pipeline Overhead**: $\le 100\text{ms}$.
  - **DB Fallback Latency**: $\le 150\text{ms}$.
- **NFR-2 (Security & Authorization)**:
  - JWT verification via `withAuth`; identity strictly sourced from token.
  - Supported roles: `['student', 'admin', 'dev']`.
- **NFR-3 (Clean Module Boundaries)**:
  - Contained fully within `apps/web/lib/modules/ai/quiz-assistant/`.
  - 100% compliant with `.agents/policies/cross-module-boundary.json`.
- **NFR-4 (Zero Breaking Changes)**:
  - Preserve legacy response fields `reply`, `formulaExplanation`, `similarQuestionFound`, `similarQuestionDetails`.
- **NFR-5 (Comprehensive Test Coverage)**:
  - Validate happy paths, negative tests, and security edge cases:
    1. Rejection when session does not belong to token user.
    2. Spoofed body `userId` completely ignored.
    3. Absence of evidence never generates QuestionBank claims.
    4. Malformed LLM answer payloads filtered cleanly by `ResponseMapper`.
    5. Partial retrieval failure resiliency.
    6. LLM timeout triggers seamless `responseMode = 'db_fallback'`.
