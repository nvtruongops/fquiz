# Implementation Tasks: Quiz AI Assistant (Knowledge Retrieval Engine)

Kế hoạch triển khai an toàn theo từng chặng (**Phased Execution Plan**) kèm **Tiêu chí Nghiệm thu Toàn diện (Happy Paths + Negative & Security Cases)** cho phân hệ **Quiz AI Assistant (Knowledge Retrieval Engine)**.

---

## 📋 Chặng P0: Tái cấu trúc Cốt lõi & Không làm gãy giao diện (Zero API Breakage) — [HOÀN TẤT 100% ✅]

- [x] **Task 0.1: Khởi tạo Cấu trúc thư mục & Type Definitions**
- [x] **Task 0.2: Triển khai `QuizContextResolver` & Authoritative Security**
- [x] **Task 0.3: Triển khai `MongoQuestionRetriever` & `ranking.ts` (Parallel Retrieval & Configurable Ranking)**
- [x] **Task 0.4: Triển khai `PromptEngine` (4-Tier Evidence Hierarchy)**
- [x] **Task 0.5: Triển khai `ResponseMapper` (Anti-Leakage DTO Layer)**
- [x] **Task 0.6: Triển khai `QuizAIOrchestrator` & Deadline Management**
- [x] **Task 0.7: Refactor `route.ts` thành Thin Controller & Verify P0**

---

## 🚀 Chặng P1: Nâng cao chất lượng & Kiểm toán (Quality & Auditability) — [HOÀN TẤT 100% ✅]

- [x] **Task 1.1: Triển khai Bộ Prompt Templates Chuyên sâu theo từng Intent**
- [x] **Task 1.2: Triển khai Hệ thống Audit & Telemetry 3 Tầng**
- [x] **Task 1.4: Tích hợp Token Cost Tracking & AI Usage Analytics**
- [x] **Task 1.3: Đo lường & Kiểm định Hiệu năng E2E Performance Benchmark**

---

## 🛡️ Chặng P1.5: Kiểm định Sẵn sàng Vận hành (Production Readiness & Capacity Gate) — [HOÀN TẤT 100% ✅]

- [x] **Task 1.5.1: Chuẩn hóa Ngữ nghĩa Phủ định (Semantic Precision: No evidence $\ne$ Evidence of absence)**
- [x] **Task 1.5.2: Cấu hình Bảng giá Động & Ưu tiên Metadata Token Thực tế từ Provider**
- [x] **Task 1.5.3: Bổ sung Sub-source Durations & Metrics Telemetry**
- [x] **Task 1.5.4: Audit Index MongoDB & Bổ sung Index `course_code`**
- [x] **Task 1.5.5: Ma trận Kiểm thử Tải Đồng thời (Concurrency Load Matrix Benchmark: 10, 25, 50, 100 users)**
- [x] **Task 1.5.6: Anti-Leakage Security Regression Test**

---

## 🎨 Chặng P2: Nâng cấp Giao diện Người dùng (UI/UX Micro-Interactions) — [HOÀN TẤT 100% ✅]

- [x] **Task 2.1: Cập nhật `QuizAIAssistantDrawer.tsx` gửi Explicit Intent từ Quick Action Buttons**
- [x] **Task 2.2: Render Khối Bằng chứng Trích dẫn (Evidence Badge & Source Citations)**
- [x] **Task 2.3: Render Thanh Chỉ số Độ tin cậy & Nguồn phản hồi Độc lập (Independent Metadata Badges)**
- [x] **Task 2.4: Kiểm thử Giao diện trên Toàn bộ 4 Theme & Mobile Responsive**

---

## 📊 Chặng P4: Giám sát Vận hành Thực tế (Production Observation & Engineering by Telemetry) — [APPROVED 🚀]

Thứ tự ưu tiên triển khai và nguyên tắc ra quyết định đa chỉ số (**Multi-Metric Composite Decision Rule**):

- [ ] **Task 4.1: Production Dashboard Contract (User Telemetry & Intent Distribution)**
  - **Traffic**: `requests/day`, `activeStudents/day`, `requests/student/day`.
  - **Reliability**: `successRate`, `errorRate`, `fallbackRate`, `llmTimeoutRate`, `emptyRetrievalRate`.
  - **Intent**: Tỷ lệ % của `EXPLAIN_WRONG_ANSWER`, `EXPLAIN_CORRECT_ANSWER`, `FIND_SIMILAR_QUESTION`, `GENERAL_INQUIRY`.

- [ ] **Task 4.2: MongoDB Observation & Sub-source Latency Tracking**
  - **Sub-source Drill-down**:
    - `retrieval.questionBankMs` ($p50, p95, p99$)
    - `retrieval.quizMs` ($p50, p95, p99$)
  - **Infrastructure**: Connection pool pressure, active connections, query errors, timeouts, duy trì 0 COLLSCAN.
  - **Spike vs Sustained Load**: Phân biệt rõ sự suy giảm hiệu năng kéo dài (**Sustained Degradation**) so với hiện tượng tải đỉnh ngắn hạn (**Transient Spike**).

- [ ] **Task 4.3: Token Cost Tracking & Financial Forecasting**
  - **Financial Metrics**: `cost / AI request`, `cost / student`, `cost / course`, `cost / quiz session`, `cost / day`, `cost / month`.
  - **Provider Calibration**: So sánh `estimateTokens()` với usage metadata thực tế do Gemini API trả về để chuẩn hóa mô hình dự báo chi phí.

- [ ] **Task 4.4: AI Quality & Correlated Repeat-Question Tracking**
  - **Quality Signals**: `evidenceHitRate`, `fallbackRate`, `emptyRetrievalRate`, `confidenceDistribution`.
  - **Correlated Repeat Questions**: Phân tách rõ ràng giữa:
    - *Câu trả lời chưa rõ ràng (Ambiguity)*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Hỏi lại cùng câu với cùng ý định `EXPLAIN_WRONG_ANSWER`.
    - *Hỏi tiếp tự nhiên (Natural Follow-up)*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Hỏi tiếp `FIND_SIMILAR_QUESTION`.

- [ ] **Task 4.5: MongoDB Capacity Decision Framework (Data-Driven Gate)**
  - Áp dụng nguyên tắc đánh giá đa chỉ số: Không nâng cấp chỉ vì một metric đơn lẻ vượt ngưỡng ngắn hạn. Chỉ nâng cấp khi có sự suy giảm đồng thời và kéo dài của `DB latency + Connection pressure + Fallback rate + SLA`.

---

## 🔭 Chặng P3: Mở rộng Document RAG (Future Roadmap - Khi có File Upload Giáo trình)

- [ ] **Task 3.1**: Xây dựng `RagDocument` & `RagChunk` Collections trong MongoDB.
- [ ] **Task 3.2**: Xây dựng Document Parser & Chunker cho PDF / DOCX theo từng môn học (`course_code`).
- [ ] **Task 3.3**: Triển khai `MongoDocumentRetriever` cắm vào `IRetrievalEngine` mà không cần sửa `QuizAIOrchestrator`.
- [ ] **Task 3.4**: Nâng cấp `HybridVectorRetriever` (BM25 Text Search + Atlas Vector Search).
