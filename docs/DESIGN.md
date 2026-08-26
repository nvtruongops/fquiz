# 📐 FQuiz — Tài liệu Thiết kế Kỹ thuật (Technical Design Spec)

> 📌 **Tài liệu gốc đầy đủ**: Xem chi tiết tại [`DESIGN.md`](../DESIGN.md) ở thư mục gốc của dự án.

---

## Tóm tắt Thiết kế Kỹ thuật (Executive Summary)

Tài liệu [`DESIGN.md`](../DESIGN.md) là đặc tả kỹ thuật chi tiết nhất của hệ thống **FQuiz**, bao gồm:

1. **Kiến trúc Tổng thể**: Phân rã theo kiến trúc Modular Monolith, các Route Groups trong Next.js 16 (`(auth)`, `(student)`, `(teacher)`, `(admin)`, `quiz/`), và cơ chế Middleware `proxy.ts`.
2. **Thiết kế Cơ sở Dữ liệu (Mongoose Schemas)**:
   - Các mô hình thực thể: `User`, `SiteSettings`, `Feedback`, `Quiz`, `QuizSession`, `QuestionBank`, `PinnedQuestion`, `Classroom`, `QuizAssignment`, `AIAsset`, `Post`...
   - Quy chuẩn `IBaseEntity` và chỉ mục (indexes) tối ưu hóa truy vấn.
3. **Động cơ Thi trắc nghiệm (Quiz Engine)**:
   - 3 chế độ thi: `Immediate` (chấm ngay từng câu), `Review` (nộp bài cuối), `Flashcard` (lật thẻ ghi nhớ).
   - Cơ chế snapshot câu hỏi vào `session.questions_cache` ngăn chặn sửa đổi đề thi giữa chừng.
   - Thuật toán băm `generateQuestionId` và `generateQuestionFingerprint` (SHA-256) phục vụ phát hiện trùng lặp và xung đột đáp án.
   - Xử lý đồng thời nộp bài `findOneAndUpdate({ _id: sessionId, status: { $ne: 'completed' } })` ngăn chặn Race Condition.
4. **Hệ thống AI & Quiz Assistant**:
   - Quản lý prompt templates (11 loại), validate Zod schema đầu ra.
   - Cache kết quả sinh bằng SHA-256 hash trên collection `AIAsset`.
   - Trợ lý phòng thi phân loại ý định (Intent), lấy ngữ cảnh (Context) và chấm điểm tự tin (Confidence Engine).
5. **Ranh giới Module & Tích hợp**:
   - Nguyên tắc không import chéo model giữa các modules.
   - Cơ chế Application-level joins thay cho `.populate()`.
   - Đăng ký model tập trung qua `ModelRegistry`.

---

👉 Để xem chi tiết toàn bộ mã nguồn schema, định nghĩa interface và biểu đồ luồng dữ liệu, vui lòng tham khảo [`DESIGN.md`](../DESIGN.md).
