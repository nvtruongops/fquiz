# 🧩 Components Library (`components/`)

Frontend UI component library for **FQuiz**, architected according to a **Domain-Driven Component Architecture** integrating **shadcn/ui (Radix Primitives)**, **Tailwind CSS 3**, and **GSAP 3** for high-performance animations.

---

## 1. Directory Structure

```
components/
├── community/                 # Community discussions & learning posts
│   ├── CommunityHeader.tsx    # Feed header & post statistics
│   ├── CommunityPostCard.tsx  # Post cards with likes and comments
│   ├── CreatePostModal.tsx    # Create new discussion thread modal
│   └── FeedbackModal.tsx      # User feedback & bug report modal
├── dashboard/                 # Student Learning Studio & Dashboard
│   ├── DashboardHeader.tsx    # Welcome header & streak counters
│   ├── IncompleteSessionBanner.tsx # In-progress session resume reminder
│   ├── LearningStudioGrid.tsx # Smart learning tool cards
│   ├── PinnedCategoriesSection.tsx # Pinned favorite subject shortcuts
│   └── RecentActivitiesFeed.tsx # Recent quiz attempts activity feed
├── history/                   # Exam & practice session history
│   └── HistorySkeleton.tsx    # Loading skeleton for session history
├── layout/                    # Application shell & navigation layouts
│   ├── AppLayout.tsx          # Master layout wrapper (Header, Sidebar, Content, Footer)
│   ├── Sidebar.tsx            # Multi-role navigation sidebar
│   ├── TopHeaderBar.tsx       # Top bar with theme switchers & profile shortcuts
│   ├── MobileNav.tsx          # Mobile bottom navigation bar
│   ├── Footer.tsx             # System metadata and copyright footer
│   └── UserDropdown.tsx       # Account profile and logout dropdown
├── quiz/                      # Quiz engine UI (See components/quiz/README.md)
│   ├── detail/                # Quiz landing page, stats, and mode selectors
│   ├── editor/                # Drag-and-drop question editor & metadata forms
│   ├── explore/               # Public quiz catalog & subject filters
│   ├── question-bank/         # Question bank integration & conflict resolver
│   ├── session/               # Exam room interfaces (Immediate, Review, Flashcard)
│   └── shared/                # Shared widgets: Timer, Badges, ImageUpload
├── shared/                    # Foundational design primitives (See components/shared/README.md)
│   ├── ui/                    # shadcn/ui primitives (button, card, dialog, select...)
│   ├── auth/                  # Authentication forms, Google OAuth button
│   ├── gsap/                  # Animation components (ProgressBar, StaggerContainer)
│   ├── providers/             # React Context Providers (QueryProvider, ThemeProvider)
│   ├── selection/             # In-text dictionary selection helpers
│   └── DevOnlyGuard.tsx       # Development-only tools guard for production
├── student/                   # Student workspaces
│   └── classrooms/            # Student classroom views & joined courses
└── teacher/                   # Teacher workspaces
    └── TeacherSidebar.tsx     # Teacher dashboard sidebar
```

---

## 2. GSAP Animation Standards

FQuiz utilizes `@gsap/react` for 60fps animations with minimal execution overhead:

1. **`useGSAP()` Hook**: Always wrap animations inside `useGSAP(() => { ... }, { scope: containerRef })` to ensure automatic memory cleanup (`ctx.revert()`) on unmount.
2. **GPU Performance First**: Animate transform aliases exclusively (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Never animate layout properties (`width`, `height`, `top`, `left`).
3. **Accessibility (`prefers-reduced-motion`)**: Leverage `gsap.matchMedia()` to disable non-essential motion when requested by operating system preferences:

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(itemsRef.current, { opacity: 1, y: 0 });
  });
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(itemsRef.current, {
      opacity: 0,
      y: 20,
      stagger: 0.06,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
}, { scope: containerRef });
```

---

## 3. Design Tokens & Theme Governance

All components strictly comply with the **3-Tier Theme Governance** standard:

- ❌ **No Hardcoded Hex**: Do not specify `color: #10b981` or `#ffffff`.
- ❌ **No Tailwind Light Clashing**: Do not specify `bg-white`, `text-black`, `bg-gray-100`.
- ✅ **Use Semantic Variables**: Use `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`.
- ✅ **Surface Elevation Hierarchy**: `Background` $\le$ `Card` $\le$ `Popover/Dialog`.
- ✅ **WCAG 2.2 AA Contrast**: Ensure minimum contrast ratios $\ge 4.5:1$ across all 4 themes: `Light`, `Dark`, `Green`, `Pink`.

---

## 4. Render Performance Optimization

- **Lazy Loading with `next/dynamic`**: Heavy modals and complex editors (`QuizEditorWithQuestionBank`, `CreatePostModal`) are loaded on-demand with `ssr: false`.
- **Selector Memoization**: When accessing Zustand stores, always use shallow atomic selectors (`state => state.field`) to eliminate redundant re-renders.
- **Component Decomposition**: Quiz question cards and option palettes are split into isolated sub-components to limit the blast radius of user input re-renders.
