# 🗄️ Client State Stores (`store/`)

Tài liệu thiết kế và hướng dẫn quản lý trạng thái phía máy khách (Client State Management) của **FQuiz** sử dụng thư viện **Zustand v5**.

---

## 1. Cấu trúc Thư mục

```
store/
├── quiz/
│   └── quiz-session.store.ts   # Quản lý trạng thái phiên làm bài trắc nghiệm (Persisted)
├── shared/
│   ├── toast-store.ts          # Quản lý hàng đợi thông báo Toast toàn cục
│   └── __tests__/              # Unit tests cho các actions trong store
└── README.md                   # Tài liệu hướng dẫn sử dụng
```

---

## 2. Quiz Session Store (`store/quiz/quiz-session.store.ts`)

Store trung tâm quản lý toàn bộ vòng đời phiên làm bài thi trắc nghiệm của học viên, đảm bảo trải nghiệm tức thì (0ms latency) và duy trì dữ liệu khi refresh trang.

### 2.1. Cấu trúc Trạng thái (State Shape)

```typescript
interface QuizSessionState {
  // Metadata phiên thi
  sessionId: string | null;
  quizId: string | null;
  mode: 'immediate' | 'review' | null;

  // Điều hướng câu hỏi
  currentQuestionIndex: number;
  totalQuestions: number;

  // Trạng thái đã trả lời (Mirror từ DB)
  answeredQuestions: Set<number>;

  // Phản hồi kết quả câu vừa trả lời (Dành cho Immediate Mode)
  lastAnswerResult: {
    isCorrect: boolean;
    correctAnswer: number;
    correctAnswers?: number[];
    explanation?: string;
  } | null;

  // Optimistic UI state
  pendingAnswerIndex: number | null;

  // Chế độ Highlight từ vựng & Ghi chú
  isNoteMode: boolean;

  // Danh mục Actions
  initSession: (sessionId: string, quizId: string, mode: string, total: number) => void;
  resumeSession: (sessionId: string, quizId: string, mode: string, total: number, currentIndex: number, answered: Set<number>) => void;
  navigateToQuestion: (index: number) => void;
  restoreAnswers: (answered: Set<number>) => void;
  markAnswered: (index: number) => void;
  optimisticallyMarkAnswered: (questionIndex: number) => void;
  rollbackOptimisticAnswer: (questionIndex: number) => void;
  confirmAnswer: (questionIndex: number) => void;
  setLastAnswerResult: (result: LastAnswerResult | null) => void;
  toggleNoteMode: () => void;
  resetSession: () => void;
}
```

### 2.2. Chiến lược Lưu trữ Bền vững (Persistence Strategy)
- **Middleware**: `persist` kết hợp với `createJSONStorage(() => localStorage)`.
- **Tên Key**: `quiz-session`.
- **Xử lý Serialization**: Cấu trúc dữ liệu `Set<number>` không thể serialize trực tiếp sang JSON; middleware tự động chuyển đổi giữa `Set<number>` trong bộ nhớ và mảng `number[]` khi lưu xuống `localStorage` qua hàm `partialize`.

### 2.3. Optimistic Updates & Rollback Flow
Khi học viên chọn một đáp án trong chế độ mạng chậm:
1. `optimisticallyMarkAnswered(index)`: Đánh dấu câu hỏi đã được làm trên thanh điều hướng sidebar ngay lập tức.
2. Gửi request `POST /api/sessions/[id]/answer` trong background.
3. Nếu thành công: `confirmAnswer(index)`.
4. Nếu thất bại (lỗi mạng): `rollbackOptimisticAnswer(index)` và hiển thị toast cảnh báo để học viên chọn lại.

---

## 3. Toast Notification Store (`store/shared/toast-store.ts`)

Quản lý hàng đợi hiển thị thông báo toast toàn cục:
- Hỗ trợ 3 trạng thái: `success`, `error`, `info`.
- Tự động đóng (Auto-dismiss) sau **5000ms**.
- Tự động phân giải thông điệp lỗi dạng chuỗi hoặc `Error` instance.

```typescript
import { useToast } from '@/store/shared/toast-store';

function MyComponent() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success('Đã lưu bài thi thành công!');
    } catch (err) {
      toast.error(err);
    }
  };
}
```

---

## 4. Tối ưu Hiệu năng (Performance Guidelines)

Để tránh hiện tượng re-render toàn bộ giao diện làm bài thi khi chỉ có một trường thay đổi (ví dụ: chỉ chuyển câu hỏi nhưng thanh header cũng bị re-render):

- ❌ **Không lấy toàn bộ store**:
  ```tsx
  // TRÁNH VIẾT THẾ NÀY: Re-render khi BẤT KỲ state nào thay đổi
  const { currentQuestionIndex, answeredQuestions } = useQuizSessionStore();
  ```
- ✅ **Sử dụng Fine-Grained Selectors**:
  ```tsx
  // CHUẨN FQUIZ: Chỉ re-render khi currentQuestionIndex thay đổi
  const currentIndex = useQuizSessionStore((state) => state.currentQuestionIndex);
  const navigateTo = useQuizSessionStore((state) => state.navigateToQuestion);
  ```
