# Quiz Session Pages

## Structure

- `page.tsx`: Desktop page with horizontal layout (sidebar + main content)
- `mobile/page.tsx`: Mobile-optimized page with vertical layout
- `proxy.ts`: Middleware detecting mobile devices and redirecting accordingly

## Device Auto-Detection

Next.js routing detects:
- Mobile devices (Android, iPhone, iPod, etc.)
- Tablets (iPad, Android tablets)
- User-Agent header

**Workflow:**
1. User requests `/quiz/[id]/session/[sessionId]`
2. Middleware inspects User-Agent
3. If mobile/tablet → Redirect to `/quiz/[id]/session/[sessionId]/mobile`
4. If desktop → Maintain desktop layout URL

## Mobile Page Features

### Layout
- Vertical layout without fixed sidebar
- Sticky header displaying quiz information and progress bar
- Bottom navigation with Previous, Next, and Submit controls
- Question palette in a responsive drawer dialog

### UI/UX Improvements
- Large touch-friendly option cards (min 44x44px)
- Generous touch margins and padding
- Typography optimized for handheld screens
- Fluid transitions and GSAP animations
- Visual progress bar

### Responsive Design
- Automatic device detection
- Dialogs styled with mobile-appropriate padding (`w-[calc(100vw-2rem)]`)
- ScrollArea for long questions and option text

## Quiz Modes

### Immediate / Practice Mode
- Real-time correct/incorrect answer verification
- Instant explanation panel
- Green highlight for correct answers, red for incorrect
- Answers locked upon choice submission

### Review / Exam Mode
- Answers hidden until final exam submission
- Option changes allowed until submission
- Comprehensive result and review screen upon completion

## Navigation
- Bottom navigation bar with Previous and Next buttons
- Question palette dialog for quick jumping between questions
- Visual progress tracking
- Exit confirmation guard preventing accidental progress loss

## Testing

**Desktop:**
```
http://localhost:3000/quiz/[id]/session/[sessionId]
```

**Mobile (direct URL):**
```
http://localhost:3000/quiz/[id]/session/[sessionId]/mobile
```

**Mobile (auto-redirect):**
- Open on a mobile device or toggle Chrome DevTools Device Mode
- Navigating to the desktop URL automatically redirects to `/mobile`
