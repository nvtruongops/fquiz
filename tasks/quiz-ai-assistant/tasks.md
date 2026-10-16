# Implementation Tasks: Quiz AI Assistant (Knowledge Retrieval Engine)

Phased implementation plan with comprehensive acceptance criteria (happy paths + negative and security cases) for the **Quiz AI Assistant (Knowledge Retrieval Engine)** subsystem.

---

## 📋 Phase P0: Core Architecture & Zero API Breakage — [100% COMPLETE ✅]

- [x] **Task 0.1: Directory Scaffold & Type Definitions**
- [x] **Task 0.2: Implement `QuizContextResolver` & Authoritative Security**
- [x] **Task 0.3: Implement `MongoQuestionRetriever` & `ranking.ts` (Parallel Retrieval & Configurable Ranking)**
- [x] **Task 0.4: Implement `PromptEngine` (4-Tier Evidence Hierarchy)**
- [x] **Task 0.5: Implement `ResponseMapper` (Anti-Leakage DTO Layer)**
- [x] **Task 0.6: Implement `QuizAIOrchestrator` & Deadline Management**
- [x] **Task 0.7: Refactor `route.ts` into Thin Controller & Verify P0**

---

## 🚀 Phase P1: Quality & Telemetry Auditability — [100% COMPLETE ✅]

- [x] **Task 1.1: Implement Specialized Prompt Templates per Intent**
- [x] **Task 1.2: Implement 3-Tier Audit & Telemetry System**
- [x] **Task 1.3: E2E Performance Benchmark Measurements**
- [x] **Task 1.4: Token Cost Accounting & AI Usage Analytics Integration**

---

## 🛡️ Phase P1.5: Production Readiness & Capacity Gate — [100% COMPLETE ✅]

- [x] **Task 1.5.1: Semantic Precision Standardization (No evidence $\ne$ Evidence of absence)**
- [x] **Task 1.5.2: Dynamic Pricing Abstraction & Provider Metadata Prioritization**
- [x] **Task 1.5.3: Sub-source Durations & Metrics Telemetry**
- [x] **Task 1.5.4: MongoDB Index Audit & `course_code` Index Addition**
- [x] **Task 1.5.5: Concurrency Load Matrix Benchmark (10, 25, 50, 100 users)**
- [x] **Task 1.5.6: Anti-Leakage Security Regression Test**

---

## 🎨 Phase P2: UI/UX Micro-Interactions — [100% COMPLETE ✅]

- [x] **Task 2.1: Update `QuizAIAssistantDrawer.tsx` to Dispatch Explicit Intents from Quick Action Buttons**
- [x] **Task 2.2: Render Evidence Citation Badges and Source Snippets**
- [x] **Task 2.3: Decouple Response Source & Confidence Indicators with Semantic Badges**
- [x] **Task 2.4: Cross-Theme (4 Themes) & Mobile Responsive Verification**

---

## 📊 Phase P4: Production Observation & Engineering by Telemetry — [APPROVED 🚀]

Execution priorities and Multi-Metric Composite Decision Rules:

- [ ] **Task 4.1: Production Dashboard Contract (User Telemetry & Intent Distribution)**
  - **Traffic**: `requests/day`, `activeStudents/day`, `requests/student/day`.
  - **Reliability**: `successRate`, `errorRate`, `fallbackRate`, `llmTimeoutRate`, `emptyRetrievalRate`.
  - **Intent**: Proportion breakdown of `EXPLAIN_WRONG_ANSWER`, `EXPLAIN_CORRECT_ANSWER`, `FIND_SIMILAR_QUESTION`, `GENERAL_INQUIRY`.

- [ ] **Task 4.2: MongoDB Observation & Sub-source Latency Tracking**
  - **Sub-source Drill-down**:
    - `retrieval.questionBankMs` ($p50, p95, p99$)
    - `retrieval.quizMs` ($p50, p95, p99$)
  - **Infrastructure**: Connection pool pressure, active connections, query errors, timeouts, zero COLLSCAN enforcement.
  - **Spike vs Sustained Load**: Differentiating sustained degradation from transient peak spikes.

- [ ] **Task 4.3: Token Cost Tracking & Financial Forecasting**
  - **Financial Metrics**: `cost / AI request`, `cost / student`, `cost / course`, `cost / quiz session`, `cost / day`, `cost / month`.
  - **Provider Calibration**: Calibrate `estimateTokens()` against actual provider usage metadata.

- [ ] **Task 4.4: AI Quality & Correlated Repeat-Question Tracking**
  - **Quality Signals**: `evidenceHitRate`, `fallbackRate`, `emptyRetrievalRate`, `confidenceDistribution`.
  - **Correlated Repeat Questions**: Disambiguating:
    - *Inquiry Ambiguity*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Immediate repeated `EXPLAIN_WRONG_ANSWER`.
    - *Natural Follow-up*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Subsequent `FIND_SIMILAR_QUESTION`.

- [ ] **Task 4.5: MongoDB Capacity Decision Framework (Data-Driven Gate)**
  - Composite multi-metric evaluation: Never trigger capacity changes based on single metrics or short-lived spikes; trigger review only on sustained degradation across `DB latency + Connection pressure + Fallback rate + SLA`.

---

## 🔭 Phase P3: Document Vector RAG (Future Roadmap - File Upload Integration)

- [ ] **Task 3.1**: Build `RagDocument` & `RagChunk` collections in MongoDB Atlas.
- [ ] **Task 3.2**: Build PDF / DOCX Document Parser & Chunker keyed by `course_code`.
- [ ] **Task 3.3**: Implement `MongoDocumentRetriever` adhering to `IRetrievalEngine`.
- [ ] **Task 3.4**: Upgrade to `HybridVectorRetriever` (BM25 Text Search + Atlas Vector Search).
