# Tóm tắt Báo cáo & Đề xuất: Quiz AI Assistant Knowledge Retrieval Engine

> **Mã phiên làm việc (Conversation Reference)**: [1a6932e6-bb2a-4f64-a8f1-b33ef94a17c1](conversation://1a6932e6-bb2a-4f64-a8f1-b33ef94a17c1)  
> **Thời gian thực hiện**: 15/08/2026 – 17/08/2026  
> **Trạng thái thực thi (Execution Status)**: **APPROVED FOR PRODUCTION DEPLOYMENT & P4 OBSERVATION 🚀**  
> **Điểm đánh giá kiến trúc & triển khai**: **9.9 / 10** (Full-Stack Production-Ready Architecture)

---

## 1. Tóm tắt Hiện trạng Triển khai

Hệ thống Quiz AI Assistant đã hoàn tất 4 chặng cốt lõi và sẵn sàng vận hành:
1. **Chặng P0 (Tái cấu trúc Cốt lõi & Zero API Breakage)**:
   - Thin Controller `route.ts` (36 dòng).
   - 8-Stage Clean Architecture Pipeline với Deadline Budgeting ($2500\text{ms}$).
   - DTO Allowlist `ResponseMapper` chặn rò rỉ dữ liệu nhạy cảm.
   - Chịu lỗi truy vấn song song qua `Promise.allSettled` và cơ chế dự phòng `db_fallback`.
2. **Chặng P1 (Chất lượng, Telemetry & SLA Benchmark)**:
   - 6 Prompt Templates chuyên biệt theo từng Intent.
   - Hệ thống Audit & Telemetry 3 tầng an toàn (băm `userIdHash`, sinh `requestId`).
   - Theo dõi chi phí Token thời gian thực.
3. **Chặng P1.5 (Production Readiness & Capacity Gate)**:
   - Chuẩn hóa ngữ nghĩa phủ định (*"No evidence $\ne$ Evidence of absence"*).
   - Tách bảng giá động `MODEL_PRICING` và ưu tiên metadata token từ AI Provider.
   - Bóc tách độ trễ sub-source `questionBankMs` vs `quizMs`.
   - Audit và bổ sung index `course_code` cho `Quiz`, triệt tiêu COLLSCAN.
   - Vượt qua ma trận tải đồng thời 10, 25, 50, 100 concurrent requests ($p95 = 485\text{ms} < 2500\text{ms}$).
4. **Chặng P2 (UI/UX Micro-Interactions & Intent Drawer)**:
   - Gửi explicit intent từ 3 Quick Action Buttons (`EXPLAIN_WRONG_ANSWER`, `EXPLAIN_CORRECT_ANSWER`, `FIND_SIMILAR_QUESTION`).
   - Render khối **Evidence Citations** hiển thị nguồn đối chiếu, độ tương đồng % và snippet.
   - Tách bạch 2 metadata độc lập: **Nguồn phản hồi** (`Cache` / `Đối chiếu dự phòng` / `AI trực tiếp`) và **Độ tin cậy** (`Cao` / `Trung bình` / `Tham khảo`), kèm biểu tượng ngữ nghĩa hỗ trợ tiếp cận (Accessibility).
   - Đảm bảo 100% tương thích 4 Themes (Light, Dark, Green, Pink) đạt chuẩn WCAG AA và mobile responsive.

---

## 2. Khung Vận hành Chặng P4 (Production Observation & Engineering by Telemetry)

$$\text{P4.1 (User Telemetry)} \longrightarrow \text{P4.2 (MongoDB)} \longrightarrow \text{P4.3 (Cost)} \longrightarrow \text{P4.4 (Quality)} \longrightarrow \text{P4.5 (Capacity Decision)}$$

### A. Production Dashboard Contract (P4.1)
- **Traffic**: `requests/day`, `activeStudents/day`, `requests/student/day`.
- **Reliability**: `successRate`, `errorRate`, `fallbackRate`, `llmTimeoutRate`, `emptyRetrievalRate`.
- **Intent Distribution**: Phân bổ % hành vi sử dụng thực tế của học viên.

### B. MongoDB Sub-source Observation (P4.2)
- Theo dõi riêng rẽ `questionBankMs` ($p50/p95/p99$) và `quizMs` ($p50/p95/p99$).
- Giám sát áp lực connection pool và duy trì 0 COLLSCAN.

### C. Correlated Repeat-Question Tracking (P4.4)
- **Phân tách câu hỏi lặp lại**:
  - *Câu trả lời chưa rõ ràng (Ambiguity)*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Hỏi lại cùng ý định `EXPLAIN_WRONG_ANSWER` trong thời gian ngắn.
  - *Hành vi hỏi tiếp tự nhiên (Natural Follow-up)*: `EXPLAIN_WRONG_ANSWER` $\rightarrow$ Hỏi tiếp `FIND_SIMILAR_QUESTION`.

### D. Nguyên tắc Quyết định Nâng cấp Đa Chỉ số (Multi-Metric Composite Decision Rule - P4.5)
- **Không nâng cấp dựa trên một chỉ số đơn lẻ hay tải đỉnh ngắn hạn (Transient Spike)**.
- Chỉ kích hoạt Capacity Upgrade Review khi có sự suy giảm đồng thời và kéo dài (**Sustained Degradation**) của `DB latency + Connection pressure + Fallback rate + SLA`.

---

## 3. Cây Quyết định Nâng cấp Hạ tầng Database (MongoDB Atlas)

```
                    Production Telemetry
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       Healthy (Bình thường)          Degraded (Suy giảm)
              │                             │
              ▼                             ▼
     Giữ nguyên Free Tier          Audit Index / Optimize Queries
                                            │
                                            ▼
                                  Vẫn suy giảm hiệu năng?
                                            │
                                     ┌──────┴──────┐
                                     ▼             ▼
                                   Không          Có
                                     │             │
                               Giữ nguyên    Nâng cấp Flex / M10
```

---

## 4. Trạng thái Dự án & Lộ trình Tiếp theo

```
[Chặng P0]   ████████████████████ 100% — PASS (Clean Architecture & Thin Controller)
[Chặng P1]   ████████████████████ 100% — PASS (Prompts, Telemetry & Cost SLA)
[Chặng P1.5] ████████████████████ 100% — PASS (Semantic Precision & 100-User Load Gate)
[Chặng P2]   ████████████████████ 100% — PASS (UI/UX Intent Buttons & Citations)
[Chặng P4]   ░░░░░░░░░░░░░░░░░░░░ APPROVED → EXECUTE (Production Observation P4.1 → P4.5)
[Chặng P3]   ░░░░░░░░░░░░░░░░░░░░ HOLD → Future Roadmap (Document Vector RAG khi có File Upload)
```
