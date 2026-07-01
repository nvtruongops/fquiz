# UI/UX Guide — FQuiz Platform

> Hướng dẫn thiết kế giao diện cho developer và contributor.  
> Đọc tài liệu này trước khi thêm trang mới, component mới, hoặc thay đổi giao diện.

---

## Mục lục

1. [Design Language](#1-design-language)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Layout System](#4-layout-system)
5. [Component Library](#5-component-library)
6. [Quiz Session UI](#6-quiz-session-ui)
7. [Flashcard UI](#7-flashcard-ui)
8. [Animation & Transition](#8-animation--transition)
9. [Responsive Design](#9-responsive-design)
10. [Accessibility](#10-accessibility)
11. [Pattern thêm UI mới](#11-pattern-thêm-ui-mới)

---

## 1. Design Language

FQuiz sử dụng **Glassmorphism / Modern Soft UI** — thiết kế hiện đại, bồng bềnh và mượt mà, kết hợp:

- **Hiệu ứng kính mờ (Glassmorphism)**: Nền bán trong suốt (`bg-white/50`, `bg-white/70`) kết hợp `backdrop-blur-md` hoặc `backdrop-blur-xl`.
- **Bo góc mềm mại**: Sử dụng triệt để các góc bo tròn lớn như `rounded-2xl`, `rounded-3xl` và `rounded-full` để tạo cảm giác thân thiện.
- **Bóng đổ đa chiều**: Dùng `shadow-lg`, `shadow-xl`, `shadow-[0_20px_40px_...]` với độ mờ cao để tạo cảm giác các khối nổi lơ lửng.
- **Typography đậm nét & Gradient**: Text tiêu đề lớn dùng `font-black` với gradient text từ Primary (`#5D7B6F`) sang Secondary Accent (`#A4C3A2`).
- **Viền sáng tinh tế**: Sử dụng các đường viền mảnh `border-white/60` hoặc `border-[#5D7B6F]/20` thay cho viền đen cứng.

### Nguyên tắc cốt lõi

| Nguyên tắc | Ví dụ |
|-----------|-------|
| **Backdrop Blur thay vì màu đặc** | `bg-white/50 backdrop-blur-xl` thay vì `bg-white` |
| **Soft Shadows mạnh mẽ** | `shadow-xl shadow-slate-200/50` thay vì không dùng shadow |
| **Góc bo siêu lớn** | `rounded-3xl` cho thẻ Card, `rounded-full` cho button |
| **Fluid text size** | `clamp()` cho responsive font thay vì breakpoint cứng |
| **Màu Brand chủ đạo** | Sử dụng đúng bảng màu từ `ui-colors.md` |

---

## 2. Color System

### Brand Colors (Tailwind custom tokens)

```typescript
// tailwind.config.ts
colors: {
  primary: '#5D7B6F',         // Buttons, headers, active states, top loader
  success: '#A4C3A2',         // Correct answer background, success alerts
  'secondary-bg': '#B0D4B8',  // Secondary accent
  'app-bg': '#EAE7D6',        // Section backgrounds
  info: '#D7F9FA',            // Info states
}
```

**Sử dụng**: `bg-primary`, `text-primary`, `border-primary`

### shadcn/ui CSS Variables (HSL)

Định nghĩa trong `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;          /* bg-background = white */
  --foreground: 222.2 84% 4.9%;     /* text-foreground = near-black */
  --muted: 210 40% 96.1%;           /* bg-muted = light gray */
  --muted-foreground: 215.4 16.3% 46.9%; /* text-muted-foreground = medium gray */
  --border: 214.3 31.8% 91.4%;      /* border-border */
  --destructive: 0 84.2% 60.2%;     /* bg-destructive = red */
  --radius: 0.5rem;                  /* var(--radius) */
}
```

**Sử dụng**: `bg-background`, `text-muted-foreground`, `border-border`, `bg-destructive`

### State Colors (Hardcoded trong component)

Các state color được hardcode trực tiếp trong className vì logic cụ thể từng component:

```tsx
// QuestionDisplay.tsx — option button states
isCorrect:       'border-green-500 bg-green-50 text-green-700 font-semibold'
isWrongSelected: 'border-red-500 bg-red-50 text-red-700 font-semibold'
isSelected:      'border-blue-400 bg-blue-50 font-semibold text-blue-700'
default:         'border-gray-300 bg-white text-[#202020]'
```

### Badge Colors (UsageBadge)

```typescript
// components/quiz/shared/UsageBadge.tsx
LEVELS = [
  { max: 2,        label: 'Cơ bản',       color: 'text-green-700 bg-green-50 border-green-200' },
  { max: 4,        label: 'Phổ biến',     color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { max: 5,        label: 'Trọng tâm',    color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { max: Infinity, label: 'Rất phổ biến', color: 'text-red-700 bg-red-50 border-red-200' },
]
```

### Palette đầy đủ (từ `Docs/ui-colors.md`)

| Nhóm | Màu | Hex |
|------|-----|-----|
| Brand primary | Primary | `#5D7B6F` |
| Brand primary | Primary hover | `#4A6359` |
| Brand accent | Secondary | `#A4C3A2` |
| Background | Page body | `#F9F9F7` (body), `white/50` (glassmorphism cards) |
| Background | Soft section | `#EAE7D6` |
| State | Success fg | `#166534` |
| State | Success bg | `#B0D4B8` |
| State | Info bg | `#D7F9FA` |
| State | Warning bg | `#FFE082` |
| State | Danger bg | `#EF9A9A` |
| Badge | Attempted | bg `#DBEAFE`, border `#BFDBFE`, text `#1E3A8A` |
| Badge | Saved/Sync | text `#16A34A` |

**Rules**:
- ✅ Score highlights → cool colors (blue/green)
- ✅ Đỏ chỉ dùng cho destructive actions (delete, confirm delete)
- ✅ Contrast ratio ≥ 4.5:1 cho body text

---

## 3. Typography

### Font

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
})
// → class: font-sans = var(--font-inter)
```

Tất cả body text đều dùng `font-sans` (Inter). **Không dùng font khác** trừ khi có yêu cầu.

### Fluid Typography (`clamp()`)

Quiz session sử dụng `clamp()` để scale mượt theo viewport — **không dùng breakpoint cứng** cho font size:

```css
/* Câu hỏi: 13–17px */
text-[clamp(13px,0.45vw+11px,16px)]

/* Số thứ tự: 14–17px */
text-[clamp(14px,0.4vw+12px,17px)]

/* Hint text: 11–13px */
text-[clamp(11px,0.2vw+10px,13px)]
```

**Pattern**: `clamp(MIN, VW_FORMULA, MAX)` — min là mobile, max là desktop lớn.

### Heading Scale

```html
<!-- Session sidebar headings -->
<h3 class="text-[24px] font-bold leading-none text-[#111111]">Chọn đáp án</h3>

<!-- Action button -->
<span class="text-[22px] font-bold leading-tight">Nộp bài</span>

<!-- Back/Next buttons -->
<span class="text-[16px] font-semibold">Back / Next</span>

<!-- Answered counter -->
<p class="text-[17px] font-semibold text-[#333333]">5/20 câu đã trả lời</p>
```

---

## 4. Layout System

### App Container

```tsx
// app/layout.tsx — root layout
<body class="bg-[#F9F9F7] font-sans antialiased min-h-screen">
  <div class="mx-auto w-[94%] xl:w-[92%] min-h-screen flex flex-col bg-white 
              shadow-[0_0_120px_rgba(0,0,0,0.06)] border-x border-gray-100">
    {children}
  </div>
</body>
```

- Body: nền `#F9F9F7` (sáng ấm)
- Container: `94%` width mobile → `92%` desktop xl
- Bg trắng + border sides + shadow nhẹ tạo cảm giác "lifted"

### Quiz Session Layout (Desktop — 3 cột)

```
┌──────────────────────────────────────────────────────────┐
│                     QuizHeader                           │
│  (Quiz title, progress bar, timer)                       │
├──────────────────┬──────────────────────┬────────────────┤
│   Left Sidebar   │   QuestionDisplay    │  Right Sidebar │
│   (Question Map) │   (câu hỏi + ảnh    │  (Chọn đáp án  │
│   coming soon    │    + explanation)    │   A B C D      │
│                  │                      │   Back / Next  │
│                  │                      │   Nộp bài)     │
│                  │                      │   w-[210-250px]│
└──────────────────┴──────────────────────┴────────────────┘
```

```tsx
// SessionLayout.tsx pattern
<div class="flex h-[calc(100vh-HEADER)] overflow-hidden">
  {/* Left: Question Map (nếu có) */}
  <main class="flex-1 overflow-hidden">
    <QuestionDisplay />
  </main>
  {/* Right: QuizSidebar — fixed width */}
  <QuizSidebar /> {/* w-[210px] sm:w-[250px] */}
</div>
```

### Admin Layout

```tsx
// components/layout/AppLayout.tsx
// Sidebar navigation + main content area
```

---

## 5. Component Library

### shadcn/ui Components có sẵn

Nằm trong `components/shared/ui/` — **luôn dùng từ đây**, không install thêm trừ khi cần thiết:

| Component | File | Sử dụng |
|-----------|------|---------|
| `Button` | `button.tsx` | Tất cả buttons |
| `Card` | `card.tsx` | Content cards |
| `Dialog` | `dialog.tsx` | Modal dialogs |
| `Drawer` | `drawer.tsx` | Mobile bottom sheets |
| `Input` | `input.tsx` | Text inputs |
| `Textarea` | `textarea.tsx` | Multi-line text |
| `Select` | `select.tsx` | Dropdown selects |
| `Checkbox` | `checkbox.tsx` | Checkboxes |
| `Switch` | `switch.tsx` | Toggle switches |
| `Badge` | `badge.tsx` | Status badges |
| `Alert` | `alert.tsx` | Alert messages |
| `Tabs` | `tabs.tsx` | Tab navigation |
| `Progress` | `progress.tsx` | Progress bars |
| `Tooltip` | `tooltip.tsx` | Hover tooltips |
| `ScrollArea` | `scroll-area.tsx` | Custom scrollbar |
| `DropdownMenu` | `dropdown-menu.tsx` | Context menus |
| `Avatar` | `avatar.tsx` | User avatars |
| `Collapsible` | `collapsible.tsx` | Expandable sections |

### Button Variants

```tsx
import { Button } from '@/components/shared/ui/button'

// Primary action
<Button>Lưu</Button>

// Outline (secondary)
<Button variant="outline">Hủy</Button>

// Ghost (tertiary)
<Button variant="ghost">Xem thêm</Button>

// Destructive
<Button variant="destructive">Xóa</Button>

// Sizes
<Button size="sm">Nhỏ</Button>
<Button size="lg">Lớn</Button>
<Button size="icon"><TrashIcon /></Button>
```

### `cn()` Utility — Conditional Classes

```tsx
import { cn } from '@/lib/core/utils/cn'
// cn = clsx + tailwind-merge

// Ví dụ:
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes',
  className  // allow override from parent
)} />
```

**Luôn dùng `cn()`** khi có conditional className — không concatenate string thủ công.

### Custom Quiz Components

#### `UsageBadge` — Hiển thị độ phổ biến câu hỏi

```tsx
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'

<UsageBadge count={3} />          // Phổ biến (vàng)
<UsageBadge count={6} size="md" /> // Rất phổ biến (đỏ)
```

#### `QuizLoader` — Loading state cho quiz pages

```tsx
import { QuizLoader } from '@/components/quiz/shared/QuizLoader'

<QuizLoader />  // Skeleton loader
```

#### `QuizTimer` — Đồng hồ đếm giờ

```tsx
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'

<QuizTimer startedAt={session.started_at} pausedDuration={...} />
```

#### `ImageUpload` — Upload ảnh câu hỏi

```tsx
import { ImageUpload } from '@/components/quiz/shared/ImageUpload'

<ImageUpload
  currentImageUrl={question.image_url}
  onUpload={(url) => setImageUrl(url)}
  onClear={() => setImageUrl(undefined)}
/>
// Dùng Cloudinary qua next-cloudinary
```

---

## 6. Quiz Session UI

### QuestionDisplay

```
┌──────────────────────────────────────────┐
│ (Choose 1 answer)                        │  ← hint text, clamp(11-13px)
│ ┌────────────────────────────────────┐   │
│ │ Câu 3/20                           │  │  ← bold, clamp(14-17px)
│ │ Nội dung câu hỏi được trình bày    │  │  ← clamp(13-16px), pre-wrap
│ │ theo dạng whitespace-pre-wrap      │  │
│ │                                    │  │
│ │ [Ảnh nếu có — max-h: 420px]        │  │
│ │                                    │  │
│ │ [UsageBadge nếu submitted]         │  │
│ │                                    │  │
│ │ ○ A. Option đầu tiên               │  │  ← border-2, rounded-md
│ │ ○ B. Option thứ hai                │  │
│ │ ● C. Option được chọn (xanh dương) │  │  ← border-blue-400 bg-blue-50
│ │ ○ D. Option cuối                   │  │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘

[Phần giải thích — chỉ immediate mode]
┌──────────────────────────────────────────┐
│ Giải thích nếu có                        │  ← h3 bold
│ ┌────────────────────────────────────┐   │
│ │ ✓ Bạn đã trả lời đúng.            │  │  ← CheckCircle2 green
│ │   Nội dung giải thích...           │  │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Option States

```
Default:   border-gray-300  bg-white        text-[#202020]
Selected:  border-blue-400  bg-blue-50      text-blue-700  font-semibold
Correct:   border-green-500 bg-green-50     text-green-700 font-semibold
Wrong:     border-red-500   bg-red-50       text-red-700   font-semibold
Disabled:  opacity-60       cursor-not-allowed
```

**Rule**: Không bao giờ show màu đúng/sai trước khi user submit (review mode).

### QuizSidebar (Right Panel)

```
┌──────────────────┐
│ Chọn đáp án      │  ← 24px font-bold
│                  │
│ □ A              │  ← 24px font-bold, checkbox 24x24px
│ □ B              │    checked = bg-[#d8ebd8]
│ X C              │    keyboard focused = bg-gray-300
│ □ D              │
│                  │
│ [Back] [Next]    │  ← h-10, rounded-none, border-[#111111]
│                  │
├──────────────────┤
│ [Thoát bài thi]  │  ← text-red-600, border-2
│ [Nộp bài □]     │  ← 22px font-bold, border-2
│ 5/20 câu đã trả  │  ← 17px font-semibold
└──────────────────┘
```

**Background**: `bg-[#e9e9e9]`, width: `w-[210px] sm:w-[250px]`

### Keyboard Navigation (QuizSidebar)

| Phím | Hành động |
|------|----------|
| `←` | Câu trước |
| `→` | Câu sau |
| `↑` | Focus option trên |
| `↓` | Focus option dưới |
| `Enter` | Chọn option đang focus |

---

## 7. Flashcard UI

### 3D Flip Animation

CSS classes định nghĩa trong `app/globals.css`:

```css
/* Container */
.perspective-1000 { perspective: 1000px; }

/* Inner rotating element */
.flashcard-inner {
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}
.rotate-y-180 { transform: rotateY(180deg); }

/* Card faces */
.flashcard-face { backface-visibility: hidden; }
.flashcard-face-front { transform: rotateY(0deg); }
.flashcard-face-back  { transform: rotateY(180deg); }
```

### Sử dụng

```tsx
<div className={cn(
  'flashcard-inner',
  isFlipped && 'rotate-y-180'
)}>
  {/* Front: câu hỏi */}
  <div className="flashcard-face flashcard-face-front">...</div>
  {/* Back: đáp án + explanation */}
  <div className="flashcard-face flashcard-face-back">...</div>
</div>
```

### FlashcardView Ref API

```tsx
import { FlashcardView, FlashcardViewRef } from '@/components/quiz/session/FlashcardView'

const cardRef = useRef<FlashcardViewRef>(null)

// Flip programmatically (e.g., spacebar)
cardRef.current?.flip()

<FlashcardView
  ref={cardRef}
  question={currentQuestion}
  questionNumber={1}
  totalQuestions={20}
  onAnswer={(knows) => handleFlashcardAnswer(knows)}
  enableAnimation={true}
/>
```

### Flashcard Actions (sau khi flip)

```
[✓ Đã biết]    [✗ Chưa biết]
  text-green        text-red
```

---

## 8. Animation & Transition

### Framer Motion

Dùng cho landing page và các UI phức tạp:

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

**Không** dùng Framer Motion cho quiz session (performance-sensitive) — dùng CSS transitions.

### Tailwind Transitions

```tsx
// Standard hover transition
className="transition-all duration-200"

// Color-only transition
className="transition-colors"

// Accordion (shadcn)
className="animate-accordion-down"  // keyframes trong tailwind.config.ts
```

### Custom CSS Animations

```css
/* globals.css */
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.animate-spin-slow { animation: spin-slow 8s linear infinite; }
```

### Flashcard Hover Shadow

```css
.flashcard-inner:hover .flashcard-shadow {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

### Page Load Indicator

```tsx
// app/layout.tsx
import NextTopLoader from 'nextjs-toploader'

<NextTopLoader color="#5D7B6F" height={3} showSpinner={false} shadow={false} />
// Màu primary brand, không có spinner
```

---

## 9. Responsive Design

### Strategy

| Tình huống | Strategy |
|-----------|---------|
| Font size | `clamp()` (fluid, không breakpoint) |
| Layout | Flexbox/Grid + Tailwind breakpoints |
| Quiz session mobile | Middleware redirect → `/mobile` path |
| Scrollbar | `.custom-scrollbar` class |

### Breakpoints (Tailwind defaults)

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1400px  (custom container)
```

### Quiz Session Mobile Redirect

Quiz session desktop URL: `/quiz/[id]/session/[sid]`  
Quiz session mobile URL: `/quiz/[id]/session/[sid]/mobile`

Middleware (`proxy.ts`) auto-detect User-Agent và redirect:

```typescript
// Detect: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
// Nếu là mobile → append /mobile
```

**Khi thêm quiz session page**, nhớ tạo cả route `/mobile` với layout tối ưu cảm ứng.

### Mobile Nav

```tsx
// components/layout/MobileNav.tsx
// Bottom navigation bar cho mobile screens
```

### Custom Scrollbar

```tsx
// Thêm vào scrollable container:
<div className="custom-scrollbar overflow-y-auto">
  {content}
</div>
```

---

## 10. Accessibility

### Keyboard Support

- **Quiz session**: ← → ↑ ↓ Enter cho navigation và chọn đáp án (xem Section 6)
- **Dialog**: ESC để đóng (shadcn/Radix tự xử lý)
- **Focus trap**: Dialog và Drawer dùng Radix — focus trap tự động

### Semantic HTML

```tsx
// Dùng đúng semantic elements
<header>   // Navbar, page header
<main>     // Main content
<aside>    // Quiz sidebar
<section>  // Logical sections trong page
<article>  // Quiz card, question card
<h1-h6>    // Đúng hierarchy
<button>   // Clickable actions (không dùng div)
<label>    // Form labels
```

### Image Alt Text

```tsx
// Quiz question images
<img src={question.image_url} alt="Minh họa câu hỏi" />

// User avatar
<img src={avatar_url} alt={`${username} avatar`} />
```

### ARIA

shadcn/ui components (Radix-based) tự handle ARIA attributes. Với custom components:

```tsx
// Button trạng thái loading
<button disabled aria-busy={isPending} aria-label="Đang nộp bài">
  <Loader2 className="animate-spin" />
</button>

// Navigation progress
<progress value={answeredCount} max={totalQuestions} aria-label="Tiến độ làm bài" />
```

### Contrast

- Body text trên nền trắng: `#101010` hoặc `#202020` → contrast ~19:1 ✅
- Muted text: `#4f4f4f` trên `#f5f5f5` → ~4.8:1 ✅
- **Kiểm tra**: mọi màu text mới phải ≥ 4.5:1 (WCAG AA)

---

## 11. Pattern thêm UI mới

### Thêm Page mới (Student)

```
1. Tạo file: app/(student)/[tên-trang]/page.tsx
2. Nếu cần layout riêng: app/(student)/[tên-trang]/layout.tsx
3. Dùng Server Component nếu có thể (SEO, data fetching)
4. Wrapper bằng AppLayout nếu cần navbar/sidebar
```

```tsx
// app/(student)/my-page/page.tsx
import { Metadata } from 'next'
import { AppLayout } from '@/components/layout/AppLayout'

export const metadata: Metadata = {
  title: 'Tên Trang',  // → "Tên Trang | FQuiz"
  description: 'Mô tả trang',
}

export default async function MyPage() {
  // Fetch data server-side
  const data = await fetchData()
  
  return (
    <AppLayout>
      <main className="container py-8">
        <h1 className="text-2xl font-bold">Tên Trang</h1>
        {/* content */}
      </main>
    </AppLayout>
  )
}
```

### Thêm Component Quiz

```tsx
// components/quiz/[category]/MyComponent.tsx
'use client'  // chỉ khi cần

import { cn } from '@/lib/core/utils/cn'
import type { SomeType } from '@/lib/modules/quiz/types/...'

interface MyComponentProps {
  // typed props
  className?: string  // allow override
}

export function MyComponent({ className }: MyComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      {/* content */}
    </div>
  )
}
```

**Rules**:
- Export named (không default export trừ page components)
- Props interface đặt trước component
- `className?: string` để parent có thể override
- `cn()` cho mọi conditional className

### Thêm Loading State

```tsx
// app/(student)/my-page/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
```

### Thêm Error State

```tsx
// app/(student)/my-page/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <p className="text-destructive">{error.message}</p>
      <button onClick={reset} className="btn">Thử lại</button>
    </div>
  )
}
```

### Thêm Dialog/Modal

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'

function MyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tiêu đề</DialogTitle>
        </DialogHeader>
        {/* body */}
      </DialogContent>
    </Dialog>
  )
}
```

### Toast Notifications

```tsx
import { useToastStore } from '@/store/shared/toast-store'

function MyComponent() {
  const { showToast } = useToastStore()
  
  const handleAction = async () => {
    try {
      await doSomething()
      showToast({ type: 'success', message: 'Thành công!' })
    } catch {
      showToast({ type: 'error', message: 'Có lỗi xảy ra.' })
    }
  }
}
```

### Image Upload (Cloudinary)

```tsx
import { ImageUpload } from '@/components/quiz/shared/ImageUpload'

// Trong quiz editor form
<ImageUpload
  currentImageUrl={formData.image_url}
  onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
  onClear={() => setFormData(prev => ({ ...prev, image_url: undefined }))}
/>
```

---

## Quick Reference

### Classes hay dùng

```
Font:
  font-sans               Inter font
  font-bold / font-semibold
  leading-none / leading-snug / leading-relaxed

Colors (brand):
  text-primary / bg-primary    #5D7B6F
  bg-app-bg                    #EAE7D6
  bg-[#e9e9e9]                 sidebar gray
  text-[#101010] / text-[#111111]  near-black

Border:
  border-2 border-[#111111]   main border style
  rounded-none                no border radius (brutalist)
  rounded-md                  cards, options

Spacing:
  space-y-2.5 / space-y-1.5
  gap-2 / gap-4
  px-4 py-4 sm:px-6

Layout:
  flex-1 min-h-0             flex child that should scroll
  overflow-y-auto            scrollable container
  custom-scrollbar           styled scrollbar

Scrollbar:
  custom-scrollbar           5px width, transparent track

Animation:
  transition-all duration-200
  animate-spin-slow           8s spin (CSS in globals.css)
  flashcard-inner / .rotate-y-180  3D flip
```

### Checklist khi thêm UI mới

- [ ] Dùng màu từ color system (không hardcode random hex)
- [ ] Font size dùng clamp() hoặc Tailwind text-sm/base/lg (không px cứng cho text thường)
- [ ] Button/action dùng `<button>` hoặc `<Button>` component — không `<div onClick>`
- [ ] Images có `alt` text
- [ ] Mobile responsive đã kiểm tra (sm: prefix)
- [ ] Loading state có (skeleton hoặc spinner)
- [ ] Error state có
- [ ] Contrast ratio ≥ 4.5:1 cho text
- [ ] Dùng `cn()` cho conditional className
