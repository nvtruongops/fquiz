# 📐 FQuiz — Tài liệu Thiết kế Kỹ thuật (Technical Design Spec)

> **Phiên bản**: 2.0.0 (Pure Symmetrical Monorepo Architecture)  
> **Ngăn xếp**: Next.js 16 App Router, TypeScript 5, Mongoose 9 / MongoDB Atlas, React 18, Tailwind CSS 3, GSAP.

---

## 1. Tổng quan Thiết kế (System Design Overview)

Hệ thống **FQuiz** được thiết kế theo kiến trúc **Pure Symmetrical Turborepo Monorepo**:
- **Apps**: `apps/web` (Học viên, Giáo viên, Khách, Diễn đàn / Port 3000) và `apps/admin` (Cổng Quản trị Hệ thống / Port 3001).
- **Packages**: `@fquiz/database`, `@fquiz/models`, `@fquiz/auth`, `@fquiz/ui`, `@fquiz/config-typescript`.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu & Data Models (`@fquiz/models`)

Tất cả các thực thể kế thừa từ `IBaseEntity` và được định nghĩa tập trung tại `@fquiz/models`:

### 2.1. Chuẩn Base Entity (`IBaseEntity`)
```typescript
export interface IBaseEntity {
  _id: string | Types.ObjectId
  createdAt: Date
  updatedAt: Date
  createdBy?: string | Types.ObjectId
  updatedBy?: string | Types.ObjectId
  deletedAt?: Date | null
  status?: 'draft' | 'pending' | 'published' | 'archived' | 'deleted'
}
```

### 2.2. Danh mục Models Chính
1. **`User` (`packages/models/src/models/user.model.ts`)**:
   - `username`, `email`, `password_hash`, `role` (`student`, `teacher`, `admin`), `avatar`, `token_version`.
2. **`Quiz` & `Question` (`packages/models/src/models/quiz.model.ts`)**:
   - `title`, `code`, `category_id`, `course_code`, `creator_id`, `questions` (Embedded array).
   - Mỗi câu hỏi gồm: `question_id` (SHA-256 hash), `fingerprint`, `question_text`, `options`, `correct_answer`, `explanation`, `points`.
3. **`QuizSession` (`packages/models/src/models/quiz-session.model.ts`)**:
   - `user_id` (hoặc null cho Guest), `quiz_id`, `mode` (`immediate`, `review`, `flashcard`), `status` (`in_progress`, `completed`), `questions_cache` (Snapshot câu hỏi tại thời điểm tạo session), `answers`, `score`, `duration_minutes`.
4. **`QuestionBank` (`packages/models/src/models/question-bank.model.ts`)**:
   - `question_id` (Index unique trên text + options), `fingerprint` (bao gồm cả đáp án), `question_text`, `options`, `correct_answer`, `course_code`, `usage_count`, `conflicts`.
5. **`AIAsset` (`packages/models/src/models/ai-asset.model.ts`)**:
   - `requestHash` (Index unique SHA-256), `responseHash`, `aiProvider`, `promptType`, `payload`, `status`.
6. **`SiteSettings`, `Feedback`, `Classroom`, `QuizAssignment`, `Post`**:
   - Các collection quản trị hệ thống, phản hồi người dùng, lớp học ảo và diễn đàn thảo luận.

---

## 3. Động cơ Thi Trắc nghiệm (Quiz Engine)

Động cơ thi vận hành theo nguyên tắc **Server-Authoritative**:

1. **3 Chế độ Thi**:
   - **`Immediate` (Luyện tập)**: Nhận phản hồi đúng/sai và giải thích chi tiết ngay sau khi chọn đáp án từng câu.
   - **`Review` (Thi chính thức)**: Ghi nhận đáp án tạm thời, chỉ chấm điểm và hiển thị toàn bộ kết quả sau khi ấn Nộp bài.
   - **`Flashcard` (Ghi nhớ nhanh)**: Lật thẻ tương tác 3D hiển thị câu hỏi ở mặt trước và đáp án/giải thích ở mặt sau.
2. **Snapshot Đề thi (`questions_cache`)**:
   - Khi tạo session, danh sách câu hỏi được clone vào `session.questions_cache`. Bất kỳ thay đổi nào trên Quiz gốc trong lúc học sinh đang thi đều không ảnh hưởng đến phiên thi hiện tại.
3. **Chống Race Condition & Double Submit**:
   - Nộp bài thi sử dụng thao tác nguyên tử:
     ```typescript
     const session = await QuizSession.findOneAndUpdate(
       { _id: sessionId, status: { $ne: 'completed' } },
       { $set: { status: 'completed', completed_at: new Date() } },
       { new: true }
     )
     ```
4. **Thuật toán Băm Câu hỏi**:
   - `generateQuestionId(text, options)`: SHA-256 trên nội dung câu hỏi + các lựa chọn (không bao gồm đáp án). Dùng để phát hiện xung đột đáp án (Conflict Detection).
   - `generateQuestionFingerprint(text, options, answer, courseCode)`: SHA-256 toàn diện dùng để deduplication tuyệt đối.

---

## 4. Hệ Thống Trí Tuệ Nhân Tạo (AI Pipeline)

1. **AI Content Service**:
   - 11 loại Prompt Templates phục vụ tạo câu hỏi, flashcards, từ vựng, ngữ pháp, bài đọc hiểu.
   - Luôn đối soát cache SHA-256 trên `AIAsset` trước khi gọi Gemini API.
   - Kiểm định đầu ra bằng Zod Schemas.
2. **Quiz AI Assistant**:
   - Trợ lý phòng thi phân loại ý định (Intent), lấy ngữ cảnh câu hỏi (Context), truy vấn ngân hàng đề tương tự (Retriever) và tính điểm tin cậy (Confidence Engine).

---

## 5. Ranh Giới Module & Database Standards

1. **Không Import Chéo Model**: Các modules trong `apps/web` và `apps/admin` không bao giờ import model chéo nhau. Mọi models được truy xuất thông qua package `@fquiz/models`.
2. **Cấm Mongoose `.populate()`**: Toàn bộ liên kết dữ liệu thực hiện qua Application-level batch `$in` joins.
3. **Lazy Model Registration**: Khởi tạo schemas qua `ModelRegistry` ngăn chặn `MissingSchemaError` trong Serverless Next.js.
