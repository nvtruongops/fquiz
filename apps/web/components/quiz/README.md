# 📝 Quiz Components (`components/quiz/`)

Thư mục chứa toàn bộ các thành phần giao diện phục vụ vòng đời bài thi trắc nghiệm: từ Khám phá đề thi (Explore), Soạn thảo đề (Editor), Quản lý ngân hàng câu hỏi (Question Bank), Phòng thi đa chế độ (Session) đến Bảng tổng kết kết quả (Detail/Result).

---

## Cấu trúc Phân nhóm

```
components/quiz/
├── detail/                    # Trang chi tiết & Kết quả bài thi
│   ├── QuizDetailHeader.tsx   # Header tiêu đề, tác giả, tag danh mục, lượt thi
│   ├── QuizActionCard.tsx     # Thẻ chọn chế độ thi (Immediate, Review, Flashcard)
│   ├── QuizStats.tsx          # Thống kê điểm trung bình, tỷ lệ đỗ, thời gian
│   ├── InteractiveResultViewer.tsx # Bảng xem lại câu trả lời và giải thích chi tiết
│   ├── FlashcardResultView.tsx# Tổng kết lượt ghi nhớ thẻ flashcard
│   ├── GuestClaimBanner.tsx   # Banner nhắc nhở học viên khách lưu kết quả
│   ├── QuizHistory.tsx        # Lịch sử các lần thi trước của học viên
│   └── RetryWrongButton.tsx   # Nút bấm tạo phiên thi ôn lại các câu sai
├── editor/                    # Trình soạn thảo & Tạo đề thi trắc nghiệm
│   ├── EditorControlPanel.tsx # Thanh công cụ lưu, xuất bản, thêm câu hỏi
│   ├── EditorMetadataForm.tsx # Nhập tên đề, mô tả, chọn danh mục, thời gian
│   ├── EditorProgressHub.tsx  # Thanh hiển thị tiến độ hoàn thiện đề thi
│   └── QuestionEditorCard.tsx # Thẻ chỉnh sửa câu hỏi: loại câu, lựa chọn, giải thích
├── explore/                   # Trang khám phá đề thi công khai
│   ├── CategoryFilter.tsx     # Bộ lọc danh mục đa cấp (CEFR, Kỹ năng, Chủ đề)
│   ├── CourseDetailClient.tsx # Chi tiết lộ trình khóa học trắc nghiệm
│   ├── CourseQuizList.tsx     # Danh sách các đề thi thuộc khóa học
│   ├── MixQuizTab.tsx         # Giao diện tạo bài thi trộn ngẫu nhiên từ nhiều đề
│   └── PinnedQuestionsTab.tsx # Quản lý danh sách các câu hỏi đã ghim
├── my-quizzes/                # Quản lý đề thi của tôi (Student Quizzes)
│   ├── MyQuizzesHeader.tsx    # Header & nút tạo đề thi mới
│   ├── CategoryFilterTabs.tsx # Tabs lọc đề thi theo danh mục
│   ├── QuizCardItem.tsx       # Thẻ hiển thị đề thi cá nhân (sửa, xóa, làm bài)
│   └── QuizSearchSortBar.tsx  # Thanh tìm kiếm và sắp xếp đề thi
├── question-bank/             # Tiện ích Import & Báo cáo cấu trúc
│   ├── QuestionBankWarning.tsx # Cảnh báo khi câu hỏi bị xung đột đáp án
│   ├── QuizImportPanel.tsx    # Panel tải file JSON/TXT để import đề thi
│   └── QuestionStructureReportCard.tsx # Báo cáo chất lượng cấu trúc câu hỏi
├── session/                   # Phòng thi trắc nghiệm (Core Exam Room)
│   ├── SessionLayout.tsx      # Khung layout phòng thi 3 cột thích ứng
│   ├── QuestionDisplay.tsx    # Vùng hiển thị nội dung câu hỏi, hình ảnh, đáp án
│   ├── ExplanationPanel.tsx   # Panel giải thích chi tiết đáp án (Immediate Mode)
│   ├── FlashcardView.tsx      # Giao diện lật thẻ 3D ghi nhớ từ vựng
│   ├── QuizAIAssistantDrawer.tsx # Drawer trợ lý AI hỗ trợ giải đáp trong lúc thi
│   ├── QuizAIChatbotDrawer.tsx # Trợ lý trò chuyện trao đổi kiến thức
│   ├── QuizHeader.tsx         # Thanh header phòng thi: đồng hồ đếm ngược, thanh tiến độ
│   ├── QuizSidebar.tsx        # Bảng điều hướng danh sách câu hỏi & đánh dấu cờ
│   └── SessionModals.tsx      # Các modal xác nhận nộp bài, thoát, hết giờ
└── shared/                    # Các thành phần tái sử dụng trong quiz
    ├── QuizTimer.tsx          # Đồng hồ đếm ngược hoạt ảnh mượt mà
    ├── QuizLoader.tsx         # Loader chuyên dụng cho chuyển câu hỏi
    ├── ImageUpload.tsx        # Nhập & xem trước ảnh câu hỏi từ URL
    └── UsageBadge.tsx         # Huy hiệu hiển thị số lần câu hỏi được sử dụng
```

---

## Các Tính năng Chính

### 1. Phòng thi Đa chế độ (`components/quiz/session/`)
- **Immediate Mode**: Học sinh chọn đáp án $\rightarrow$ hiển thị kết quả đúng/sai ngay lập tức cùng với `ExplanationPanel` để tra cứu kiến thức.
- **Review Mode**: Học sinh chọn đáp án $\rightarrow$ lưu tạm thời vào `quiz-session.store`, chỉ chấm điểm sau khi nhấn Nộp bài tại `SessionModals`.
- **Flashcard Mode**: Tương tác lật thẻ 3D 180 độ, phân loại thành thạo (Mastered / Review needed).

### 2. Trợ lý Phòng thi Thông minh (`QuizAIAssistantDrawer`)
- Tích hợp trực tiếp bên cạnh câu hỏi thi.
- Hỗ trợ giải thích bản chất câu hỏi, so sánh giữa 2 lựa chọn gây phân vân, tìm công thức liên quan mà không làm lộ đáp án trực tiếp.
- Sử dụng GSAP drawer animation mượt mà.

### 3. Bộ lọc và Trộn đề Thi (`components/quiz/explore/`)
- Cho phép học viên chọn nhiều bộ đề khác nhau trong cùng một chủ đề để hệ thống tự động tổng hợp thành một đề thi mới (`MixQuizTab`).
- Tối ưu hóa tải dữ liệu danh mục thông qua `CategoryFilter`.
