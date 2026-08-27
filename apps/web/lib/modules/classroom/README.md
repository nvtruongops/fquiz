# Classroom Module (`lib/modules/classroom/`)

Module quản lý lớp học trực tuyến và giao bài tập trắc nghiệm — Classroom lifecycle, Member management, Quiz Assignments, và Assignment Progress tracking.

---

## Cấu trúc Module

```
classroom/
├── models/
│   ├── Classroom.ts                # Lớp học (mã mời code 6 ký tự, mật khẩu, giáo viên, trạng thái)
│   ├── ClassroomMember.ts          # Thành viên lớp (học viên, ghim lớp, gắn tag, đánh dấu sao)
│   ├── QuizAssignment.ts           # Bài tập trắc nghiệm (quiz_id, deadline, số lần thi, điểm đạt)
│   └── QuizAssignmentProgress.ts   # Tiến độ học viên (best_score, attempts, status: completed/overdue)
├── schemas/
│   └── classroom.ts                # Zod schemas: CreateClassroomSchema, CreateQuizAssignmentSchema...
├── types/
│   └── classroom.ts                # TypeScript Interfaces: IClassroom, IClassroomMember, IQuizAssignment...
├── services/
│   └── classroom-service.ts        # Nghiệp vụ: CRUD lớp, tham gia qua code, giao bài tập, chấm điểm
└── index.ts                        # Đăng ký 4 models vào Model Registry
```

---

## Data Models

### 1. Classroom Model (`Classroom.ts`)
```typescript
interface IClassroom {
  _id: Types.ObjectId;
  name: string;
  code: string;               // Unique join code 6 ký tự (e.g. 'A9X2K7')
  password?: string | null;   // Mật khẩu tham gia lớp (tùy chọn)
  description?: string;
  teacher_id: Types.ObjectId; // Ref: User (Teacher)
  cover_image?: string;
  status: 'active' | 'archived';
  student_count: number;
  settings?: {
    allow_code_join?: boolean;
  };
  created_at: Date;
  updated_at?: Date;
}
```

### 2. ClassroomMember Model (`ClassroomMember.ts`)
```typescript
interface IClassroomMember {
  _id: Types.ObjectId;
  classroom_id: Types.ObjectId;
  student_id: Types.ObjectId;
  joined_at: Date;
  status: 'active' | 'blocked';
  is_pinned?: boolean;        // Học viên ghim lớp học lên đầu dashboard
  is_starred?: boolean;       // Giáo viên đánh dấu sao học viên xuất sắc
  tags?: string[];            // Giáo viên gắn thẻ ghi chú (e.g. 'Nhóm A', 'Cần phụ đạo')
}
```

### 3. QuizAssignment Model (`QuizAssignment.ts`)
```typescript
interface IQuizAssignment {
  _id: Types.ObjectId;
  classroom_id: Types.ObjectId;
  quiz_id: Types.ObjectId;
  teacher_id: Types.ObjectId;
  title: string;
  description?: string;
  start_at?: Date | null;
  due_at?: Date | null;       // Hạn chót nộp bài
  time_limit_minutes?: number;// Thời gian làm bài (phút)
  max_attempts?: number;      // Số lần làm bài tối đa (mặc định: 1)
  pass_score_percent?: number;// Điểm phần trăm để tính là 'Đạt' (Pass)
  show_answers_immediately?: boolean;
  status: 'draft' | 'published' | 'closed';
  created_at: Date;
}
```

### 4. QuizAssignmentProgress Model (`QuizAssignmentProgress.ts`)
```typescript
interface IQuizAssignmentProgress {
  _id: Types.ObjectId;
  assignment_id: Types.ObjectId;
  classroom_id: Types.ObjectId;
  student_id: Types.ObjectId;
  latest_session_id?: Types.ObjectId | null;
  best_score: number;
  attempts_count: number;
  is_passed: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  submitted_at?: Date | null;
  created_at: Date;
  updated_at?: Date;
}
```

---

## Luồng Nghiệp vụ Chính (Core Workflows)

### 1. Tham gia Lớp học bằng Mã Code (`joinClassroomByCode`)
1. Học viên nhập mã 6 ký tự (ví dụ: `ABC123`).
2. Server chuẩn hóa mã thành chữ hoa, tìm kiếm lớp có trạng thái `active` và `allow_code_join !== false`.
3. Nếu lớp có đặt mật khẩu (`password`), kiểm tra mật khẩu do học viên cung cấp.
4. Kiểm tra xem học viên đã từng tham gia hay bị khóa (`blocked`) hay chưa.
5. Tạo bản ghi `ClassroomMember` mới và tăng nguyên tử `student_count` trong `Classroom` lên 1.

### 2. Giao Bài tập & Đồng bộ Tiến độ
1. Giáo viên chọn đề thi trắc nghiệm từ bộ sưu tập và cấu hình thời hạn (`due_at`), số lần làm bài (`max_attempts`), điểm đạt (`pass_score_percent`).
2. Tạo bản ghi `QuizAssignment` ở trạng thái `published`.
3. Khi học viên hoàn thành phiên làm bài thi tương ứng, `recordAssignmentSubmission` sẽ:
   - Cập nhật số lần thi `attempts_count += 1`.
   - Lưu điểm cao nhất `best_score = Math.max(best_score, session_score)`.
   - Đánh dấu `is_passed = true` nếu `best_score >= pass_score_percent`.
   - Cập nhật trạng thái bài tập sang `completed`.

---

## Danh mục API Handlers

### Dành cho Giáo viên (`/api/teacher/*`)
- `GET/POST /api/teacher/classrooms`: Lấy danh sách và tạo mới lớp học.
- `GET/PUT/DELETE /api/teacher/classrooms/[id]`: Chi tiết, cập nhật và lưu trữ lớp học.
- `GET /api/teacher/classrooms/[id]/members`: Danh sách học viên trong lớp.
- `PATCH /api/teacher/classrooms/[id]/members/[studentId]/star`: Đánh dấu sao học viên.
- `PATCH /api/teacher/classrooms/[id]/members/[studentId]/tags`: Gắn nhãn phân loại học sinh.
- `DELETE /api/teacher/classrooms/[id]/members/[studentId]`: Xóa học viên khỏi lớp.
- `GET/POST /api/teacher/assignments`: Lấy danh sách và giao bài tập trắc nghiệm mới.
- `GET /api/teacher/assignments/[id]/progress`: Xem phổ điểm và tiến độ nộp bài của cả lớp.

### Dành cho Học viên (`/api/student/*`)
- `GET /api/student/classrooms`: Danh sách các lớp học đã tham gia (sắp xếp ưu tiên lớp được ghim).
- `POST /api/student/classrooms/join`: Tham gia lớp bằng mã code và mật khẩu.
- `PATCH /api/student/classrooms/[id]/pin`: Ghim hoặc bỏ ghim lớp học trên trang tổng quan.
- `DELETE /api/student/classrooms/[id]/leave`: Rời khỏi lớp học.

---

## Quy chuẩn Kiến trúc Module

- **Model Isolation**: Không bao giờ sử dụng Mongoose `.populate()`. Mọi thông tin giáo viên và học viên được truy vấn bằng Application-Level Joins thông qua `User.find({ _id: { $in: ids } })`.
- **Model Registry**: File `index.ts` đăng ký 4 models vào hệ thống bootstrap để tránh lỗi Serverless schema.
