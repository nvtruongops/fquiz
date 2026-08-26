# Requirements: Quiz AI Assistant (Knowledge Retrieval Engine)

Tài liệu đặc tả yêu cầu cho phân hệ **Quiz AI Assistant (Trợ lý AI phòng thi)** theo kiến trúc **Knowledge Retrieval Engine (RAG-Ready trên MongoDB)**.

---

## 1. Mục tiêu & Định vị hệ thống

- **Mục tiêu**: Nâng cấp trợ lý AI phòng thi từ cơ chế truy vấn nguyên khối (`route.ts` đơn lẻ) sang kiến trúc phân lớp hướng dịch vụ (Clean Architecture / Service Layered), sẵn sàng cho mở rộng RAG trong tương lai mà không làm gián đoạn phòng thi hiện tại.
- **Phạm vi (Scope)**:
  - Phục vụ giải đáp thắc mắc câu hỏi trắc nghiệm theo thời gian thực (Real-time Quiz Session).
  - Đối chiếu ngân hàng đề thi (`QuestionBank`) theo môn học để giải thích vì sao lựa chọn của học viên đúng/sai.
  - Triển khai dạng **Knowledge Retrieval Engine** trên MongoDB hiện hữu (không cần Vector DB hay File Ingestion ở Phase 1).
  - Tuân thủ nghiêm ngặt nguyên tắc **Zero API Breakage** và **Graceful Degradation** (Luôn có DB Fallback khi LLM mất kết nối).

---

## 2. Yêu cầu chức năng (Functional Requirements)

### FR-1: Phân giải Ngữ cảnh Phiên thi & Bảo mật Danh tính (Context & Security Resolution)
- **FR-1.1 (Authoritative JWT Identity)**:
  - Danh tính người dùng (`userId`) phải lấy **100% từ JWT Token đã được xác thực qua `withAuth`**.
  - Tuyệt đối bỏ qua (hoặc reject) bất kỳ trường `userId` nào được gửi từ client request body.
  - Xác thực quyền sở hữu phiên: `session.student_id.toString() === tokenPayload.userId`.
- **FR-1.2 (Single Source of Truth cho Question Mapping)**:
  - `session.question_order` là **nguồn chân lý duy nhất (Single Source of Truth)** để ánh xạ chỉ số câu hỏi UI sang câu hỏi thực tế:
    $$\text{actualIndex} = \text{session.question\_order}[\text{UI questionIndex}]$$
  - Document câu hỏi được resolve theo thứ tự ưu tiên:
    1. `session.questions_cache[actualIndex]` (nếu có cache câu hỏi trong session).
    2. `quiz.questions[actualIndex]` (nếu đề thi nhúng subdocuments).
    3. `Question.findById(quiz.question_refs[actualIndex])` (nếu đề thi dùng standalone refs).
- **FR-1.3 (Phân giải Quan hệ Môn học)**:
  - Tự động phân giải chuỗi quan hệ dữ liệu: `Session` $\rightarrow$ `Quiz` $\rightarrow$ `course_code` (Subject Prefix, ví dụ `PMG201C`) $\rightarrow$ `category_id`.
- **FR-1.4 (Trích xuất Trạng thái Lựa chọn)**:
  - Trích xuất phương án học viên đã chọn (`user_answers`), đáp án đúng chính thức, nội dung đề bài và danh sách phương án.

### FR-2: Xử lý Ý định Người dùng Toàn diện (Comprehensive Intent Handling)
- **FR-2.1 (Explicit Intent từ Quick Buttons)**: Hỗ trợ tiếp nhận `intent` tường minh từ các nút bấm 1-click trên giao diện:
  - `EXPLAIN_WRONG_ANSWER`: Giải thích tại sao phương án học viên chọn lại sai.
  - `EXPLAIN_CORRECT_ANSWER`: Giải thích tại sao đáp án chính thức lại đúng.
  - `FIND_SIMILAR_QUESTION`: Tra cứu câu hỏi tương tự trong ngân hàng đề.
  - `EXPLAIN_FORMULA`: Phân tích công thức / bước tính toán.
  - `COMPARE_OPTIONS`: So sánh sự khác nhau giữa các phương án.
  - `SOLVE_QUESTION`: Hướng dẫn cách tư duy giải câu hỏi từ đầu.
- **FR-2.2 (Intent Resolver cho Free Text)**:
  - Với câu hỏi tự do (Free-text Query), `IntentResolver` phân tích từ khóa và ngữ cảnh để phân loại vào 1 trong các intent trên.
- **FR-2.3 (Quy định cho `GENERAL_INQUIRY`)**:
  - Khi câu hỏi người dùng không thuộc 6 intent cụ thể trên $\rightarrow$ gán `GENERAL_INQUIRY`.
  - **Quy tắc**: `GENERAL_INQUIRY` chỉ được trả lời dựa trên ngữ cảnh câu hỏi hiện tại, **nghiêm cấm tuyên bố có trong QuestionBank** nếu không có retrieved evidence rõ ràng. Nếu không tìm thấy evidence $\rightarrow$ Backend tự động gán `confidence = 'low'`.

### FR-3: Công cụ Truy xuất Tri thức Song song & Chống Lỗi Cục bộ (Partial Failure Resilient Retrieval)
- **FR-3.1 (Interface Extensibility)**:
  - Định nghĩa Interface `IRetrievalEngine` trừu tượng hóa phương thức `search(input: RetrievalInput): Promise<RetrievalResult[]>`.
- **FR-3.2 (Parallel Retrieval với `Promise.allSettled`)**:
  - Thực thi song song 2 nguồn dữ liệu: `QuestionBank` (theo `category_id`) và `Quiz` (theo `course_code`) bằng `Promise.allSettled` với timeout tối đa $300\text{ms}$.
  - **Partial Failure Semantics**: Nếu 1 trong 2 nguồn bị lỗi hoặc timeout, nguồn còn lại hoàn thành thành công vẫn được đưa vào Ranking bình thường; không bao giờ để lỗi của 1 nguồn làm sập toàn bộ bước Retrieval.
- **FR-3.3 (Configurable Weighted Scoring & Dynamic Thresholding)**:
  - Điểm liên quan được tính theo công thức trọng số cấu hình được:
    $$\text{Score} = (\text{optionMatch} \times w_{\text{opt}}) + (\text{questionMatch} \times w_{\text{q}}) + (\text{categoryMatch} \times w_{\text{cat}}) + (\text{courseMatch} \times w_{\text{crs}})$$
    *(Mặc định: $w_{\text{opt}}=0.35, w_{\text{q}}=0.35, w_{\text{cat}}=0.15, w_{\text{crs}}=0.15$)*.
  - Hàm `optionMatch` và `questionMatch` chuẩn hóa giá trị về $[0.0, 1.0]$.
  - Áp dụng ngưỡng lọc `MIN_RELEVANCE_SCORE = 0.50`. Không ép lấy kết quả nếu tất cả candidates đều dưới ngưỡng.
  - Số lượng kết quả lấy tối đa `limit` (mặc định 2, tối đa 3).

### FR-4: Kỹ thuật Prompt & Tách biệt Dữ liệu (Evidence-First Prompting)
- **FR-4.1 (4-Tier Prompt Hierarchy)**:
  1. `SYSTEM RULES`: Quy tắc an toàn, giọng văn sư phạm, bắt buộc tiếng Việt, giới hạn dưới 80-100 từ.
  2. `CURRENT QUESTION`: Đề bài, 4 phương án, đáp án đúng, phương án học viên đã chọn.
  3. `RETRIEVED EVIDENCE`: Danh sách câu hỏi/bằng chứng trích xuất từ MongoDB (hoặc ghi rõ: *Không tìm thấy câu hỏi tương tự*).
  4. `USER REQUEST`: Thắc mắc cụ thể và ý định của học viên.
- **FR-4.2 (Evidence-First Mandate)**:
  - Nghiêm cấm LLM tự nhận là câu hỏi có trong ngân hàng đề nếu trong `RETRIEVED EVIDENCE` không có bản ghi khớp.

### FR-5: Đánh giá Độ tin cậy Khách quan (Deterministic Confidence Engine)
- **FR-5.1**: Độ tin cậy (`confidence`: `'high' | 'medium' | 'low'`) phải do **Backend tính toán tất định**, không để LLM tự báo cáo.
- **FR-5.2 (Quy tắc tính điểm)**:
  - Không có bằng chứng phù hợp $\rightarrow$ `'low'` (hoặc `'medium'` đối với `SOLVE_QUESTION`/`EXPLAIN_CORRECT_ANSWER` khi lý thuyết đủ rõ).
  - Có $\ge 1$ bằng chứng với `score >= 0.70` $\rightarrow$ `'medium'`.
  - Có $\ge 2$ bằng chứng với `score >= 0.85` $\rightarrow$ `'high'`.

### FR-6: Ngăn ngừa Rò rỉ Dữ liệu & Đính kèm Bằng chứng (Layer Isolation & Anti-Leakage)
- **FR-6.1 (DTO Separation qua `ResponseMapper`)**:
  - Phân tách tuyệt đối 3 mô hình đối tượng:
    1. `InternalQuizContext`: Chứa đầy đủ `correct_answer`, `user_answers`, `session`, `quizDoc`.
    2. `LLMContext`: Chứa dữ liệu đóng gói prompt an toàn cho LLM.
    3. `PublicQuizAssistantResponse`: Dữ liệu trả về Client thông qua `ResponseMapper` với cơ chế Allowlisting trường công khai.
- **FR-6.2 (Safe Evidence Metadata)**:
  - `evidenceUsed` do Backend đính kèm trực tiếp từ `RetrievalResult[]` (gồm `sourceType`, `sourceId`, `snippet`, `relevance`).
  - Tuyệt đối không để lộ trường nhạy cảm `correct_answer` của các câu hỏi chưa làm vào client payload.

### FR-7: Đồng bộ Hợp đồng API & Ngữ nghĩa `responseMode` (Response Contract & Mode Semantics)
- **FR-7.1 (Định nghĩa Ngữ nghĩa `responseMode`)**:
  - `'llm'`: Phản hồi mới được tạo trực tiếp từ mô hình ngôn ngữ lớn (LLM Provider).
  - `'db_fallback'`: Phản hồi cấu trúc sinh tự động từ DB khi LLM mất kết nối, quota hết hoặc timeout.
  - `'cached'`: Phản hồi tái sử dụng từ Cache/AIAsset với Scope khóa chặt theo: $\text{SHA-256}(\text{courseCode} + \text{questionId} + \text{intent} + \text{userQuery})$.
- **FR-7.2 (Cờ `fallback`)**:
  - API Response Schema bắt buộc có trường boolean `fallback` (`true` khi `responseMode === 'db_fallback'`, ngược lại `false`).

### FR-8: Nâng cấp Giao diện (UI Micro-Interactions)
- **FR-8.1**: Gửi `intent` tường minh từ các nút Quick Action.
- **FR-8.2**: Hiển thị Badge nguồn trích dẫn (`QuestionBank` / `Quiz`) và thanh trạng thái độ tin cậy (`confidence`).
- **FR-8.3**: Tương thích hoàn hảo 4 theme màu (Light, Dark, Green, Pink) và thiết bị di động.

---

## 3. Yêu cầu phi chức năng (Non-Functional Requirements)

- **NFR-1 (SLA & Request Deadline Budget Propagation)**:
  - **Tổng Request SLA**: $\le 2500\text{ms}$.
  - **DB Retrieval Budget**: $\le 300\text{ms}$ (Thực thi song song với deadline enforcement).
  - **LLM Provider Budget**: $\text{Remaining Time} = \min(2200\text{ms}, 2500\text{ms} - \text{elapsedTime})$.
  - **Pipeline Overhead**: Context + Intent + Ranking + Prompt + Validation + Mapping $\le 100\text{ms}$.
  - **DB Fallback Latency**: $\le 150\text{ms}$.
- **NFR-2 (Bảo mật & Phân quyền)**:
  - Xác thực JWT qua `withAuth`; danh tính lấy độc quyền từ token.
  - Hỗ trợ các roles `['student', 'admin', 'dev']`.
- **NFR-3 (Kiến trúc Module Clean Architecture)**:
  - Đặt trọn vẹn trong `lib/modules/ai/quiz-assistant/`.
  - Tuân thủ 100% `.agents/policies/cross-module-boundary.json`.
- **NFR-4 (Tương thích ngược 100%)**:
  - Giữ nguyên các trường `reply`, `formulaExplanation`, `similarQuestionFound`, `similarQuestionDetails` để không làm gãy UI cũ.
- **NFR-5 (Kiểm thử Toàn diện & Negative Security Tests)**:
  - Bắt buộc kiểm thử cả Happy Paths lẫn Negative & Security Edge Cases:
    1. Rejection khi Session không thuộc về Token User.
    2. Body `userId` giả mạo bị phớt lờ hoàn toàn.
    3. Không có evidence thì không claim QuestionBank.
    4. LLM cố tình trả `correct_answer` giả mạo thì `ResponseMapper` vẫn bóc tách sạch sẽ.
    5. Partial Retrieval Failure (1 nguồn timeout thì nguồn còn lại vẫn trả kết quả).
    6. LLM timeout thì chuyển sang `responseMode = 'db_fallback'`.
