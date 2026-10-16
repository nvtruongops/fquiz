# Classroom Module (`lib/modules/classroom/`)

Online classroom and quiz assignment management — Classroom lifecycle, Member management, Quiz Assignments, and Assignment Progress tracking.

---

## Module Structure

```
classroom/
├── models/
│   ├── Classroom.ts                # Classroom (6-char invite code, password, teacher, status)
│   ├── ClassroomMember.ts          # Membership (student, pinned, tags, starred status)
│   ├── QuizAssignment.ts           # Assignment (quiz_id, deadline, max attempts, pass score)
│   └── QuizAssignmentProgress.ts   # Student progress (best_score, attempts, status: completed/overdue)
├── schemas/
│   └── classroom.ts                # Zod schemas: CreateClassroomSchema, CreateQuizAssignmentSchema...
├── types/
│   └── classroom.ts                # TypeScript Interfaces: IClassroom, IClassroomMember, IQuizAssignment...
├── services/
│   └── classroom-service.ts        # Business logic: CRUD, code joins, assignment distribution, grading
└── index.ts                        # Registers 4 models into Model Registry
```

---

## Data Models

### 1. Classroom Model (`Classroom.ts`)
```typescript
interface IClassroom {
  _id: Types.ObjectId;
  name: string;
  code: string;               // Unique 6-character join code (e.g. 'A9X2K7')
  password?: string | null;   // Optional classroom password
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
  is_pinned?: boolean;        // Student pins classroom to top of dashboard
  is_starred?: boolean;       // Teacher stars outstanding student
  tags?: string[];            // Teacher annotation tags (e.g. 'Team A', 'Needs Tutoring')
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
  due_at?: Date | null;       // Assignment submission deadline
  time_limit_minutes?: number;// Exam duration (minutes)
  max_attempts?: number;      // Maximum attempts allowed (default: 1)
  pass_score_percent?: number;// Minimum percentage score to pass
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

## Core Workflows

### 1. Join Classroom via Code (`joinClassroomByCode`)
1. Student enters 6-character code (e.g., `ABC123`).
2. Server normalizes code to uppercase, querying active classrooms with `allow_code_join !== false`.
3. If classroom has a `password`, validates user-supplied password.
4. Checks whether student is already a member or blocked.
5. Inserts new `ClassroomMember` document and atomically increments `student_count` in `Classroom`.

### 2. Assignment Distribution & Progress Tracking
1. Teacher selects quiz from collection and configures deadline (`due_at`), max attempts (`max_attempts`), and pass score (`pass_score_percent`).
2. Creates `QuizAssignment` in `published` state.
3. Upon student session completion, `recordAssignmentSubmission`:
   - Increments `attempts_count += 1`.
   - Records highest score `best_score = Math.max(best_score, session_score)`.
   - Sets `is_passed = true` if `best_score >= pass_score_percent`.
   - Transitions assignment progress status to `completed`.

---

## API Endpoints

### Teacher Endpoints (`/api/teacher/*`)
- `GET/POST /api/teacher/classrooms`: List and create classrooms.
- `GET/PUT/DELETE /api/teacher/classrooms/[id]`: Classroom detail, update, and archive.
- `GET /api/teacher/classrooms/[id]/members`: Student roster.
- `PATCH /api/teacher/classrooms/[id]/members/[studentId]/star`: Toggle student star status.
- `PATCH /api/teacher/classrooms/[id]/members/[studentId]/tags`: Update student categorization tags.
- `DELETE /api/teacher/classrooms/[id]/members/[studentId]`: Remove student from classroom.
- `GET/POST /api/teacher/assignments`: List and publish assignments.
- `GET /api/teacher/assignments/[id]/progress`: Classroom score distribution and submission status.

### Student Endpoints (`/api/student/*`)
- `GET /api/student/classrooms`: List enrolled classrooms (pinned classrooms prioritized).
- `POST /api/student/classrooms/join`: Join classroom via code and optional password.
- `PATCH /api/student/classrooms/[id]/pin`: Pin/unpin classroom on dashboard.
- `DELETE /api/student/classrooms/[id]/leave`: Leave classroom.

---

## Architectural Invariants

- **Model Isolation**: Never use Mongoose `.populate()`. Teacher and student profiles are fetched via application-level joins (`User.find({ _id: { $in: ids } })`).
- **Model Registry**: Module's `index.ts` registers all 4 models during bootstrap to eliminate serverless schema initialization errors.
