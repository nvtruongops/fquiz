# 📝 Quiz Components (`components/quiz/`)

Houses all UI components powering the quiz lifecycle: Catalog Exploration, Authoring Editor, Question Bank Management, Multi-mode Exam Rooms (Session), and Summary Result screens.

---

## Grouping & Architecture

```
components/quiz/
├── detail/                    # Quiz Landing, Statistics & Results
│   ├── QuizDetailHeader.tsx   # Title, author, subject tag, attempt count
│   ├── QuizActionCard.tsx     # Mode selector card (Immediate, Review, Flashcard)
│   ├── QuizStats.tsx          # Average score, pass rate, duration stats
│   ├── InteractiveResultViewer.tsx # Answer review table with explanations
│   ├── FlashcardResultView.tsx# Flashcard mastery summary screen
│   ├── GuestClaimBanner.tsx   # Guest session account registration banner
│   ├── QuizHistory.tsx        # Past session attempts list
│   └── RetryWrongButton.tsx   # Generate retry session for incorrect answers
├── editor/                    # Quiz Authoring & Creation Suite
│   ├── EditorControlPanel.tsx # Save, publish, and question action buttons
│   ├── EditorMetadataForm.tsx # Title, description, course code, duration inputs
│   ├── EditorProgressHub.tsx  # Question completeness tracker
│   └── QuestionEditorCard.tsx # Question editor: type, options, explanations
├── explore/                   # Public Catalog & Discovery
│   ├── CategoryFilter.tsx     # Multi-level subject filters (course code, tags)
│   ├── CourseDetailClient.tsx # Course quiz curriculum view
│   ├── CourseQuizList.tsx     # Course-specific quiz lists
│   ├── MixQuizTab.tsx         # Multi-quiz random mixing interface
│   └── PinnedQuestionsTab.tsx # Pinned questions review table
├── question-bank/             # Import & Conflict Resolvers
│   ├── QuestionBankWarning.tsx # Answer conflict alert
│   ├── QuizImportPanel.tsx    # JSON/TXT file upload dropzone
│   └── QuestionStructureReportCard.tsx # Structure validation diagnostic card
├── session/                   # Core Exam Room Interfaces
│   ├── SessionLayout.tsx      # Adaptive 3-column exam room shell
│   ├── QuestionDisplay.tsx    # Question prompt, images, option cards
│   ├── ExplanationPanel.tsx   # Real-time answer explanation panel
│   ├── FlashcardView.tsx      # 3D 180-degree flashcard study card
│   ├── QuizAIAssistantDrawer.tsx # In-exam AI copilot side drawer
│   ├── QuizAIChatbotDrawer.tsx # Knowledge discussion drawer
│   ├── QuizHeader.tsx         # Countdown timer & progress indicators
│   ├── QuizSidebar.tsx        # Question palette navigator & flag toggles
│   └── SessionModals.tsx      # Submission, exit, and timeout modal dialogs
└── shared/                    # Reusable Quiz Primitives
    ├── QuizTimer.tsx          # Smooth countdown timer
    ├── QuizLoader.tsx         # Specialized session loading indicator
    ├── ImageUpload.tsx        # URL image preview & upload
    └── UsageBadge.tsx         # Question usage count badge
```

---

## Core Capabilities

### 1. Multi-Mode Exam Room (`components/quiz/session/`)
- **Immediate Mode**: Option selection reveals instant verification along with `ExplanationPanel`.
- **Review Mode**: Answers are saved to `quiz-session.store`; scoring and answer reveals occur exclusively upon submission in `SessionModals`.
- **Flashcard Mode**: 3D flip card interactions with mastery categorization (Again, Hard, Good, Easy).

### 2. Intelligent Exam Assistant (`QuizAIAssistantDrawer`)
- Integrated alongside active quiz questions.
- Explains core concepts, contrasts confusing options, and outlines formulas without spoiling the correct answer.
- Smooth GSAP-powered drawer transitions.

### 3. Subject Filtering & Mix Quizzes (`components/quiz/explore/`)
- Enables students to aggregate multiple quizzes within a subject into a randomized exam (`MixQuizTab`).
- Optimized category and course code filtering via `CategoryFilter`.
