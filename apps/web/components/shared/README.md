# 🧩 Shared Components (`components/shared/`)

Foundational UI building blocks for the entire **FQuiz** application: **shadcn/ui** primitives, authentication forms, pre-packaged GSAP animation wrappers, and global React context providers.

---

## Subsystem Architecture

```
components/shared/
├── ui/                        # shadcn/ui Primitives (Radix UI + Tailwind CSS)
│   ├── alert.tsx              # Alert containers (Info, Warning, Destructive)
│   ├── avatar.tsx             # User profile avatar with fallback initial
│   ├── badge.tsx              # Semantic status badges (Success, Secondary, Outline...)
│   ├── button.tsx             # Button component with variants (Primary, Ghost, Outline...)
│   ├── card.tsx               # Card shell (CardHeader, CardTitle, CardContent...)
│   ├── checkbox.tsx           # Multi-choice checkbox
│   ├── collapsible.tsx        # Expandable/collapsible content drawer
│   ├── dialog.tsx             # Interactive modal dialogs
│   ├── dropdown-menu.tsx      # Dropdown action menus
│   ├── FQuizLogo.tsx          # Standardized vector SVG logo
│   ├── input.tsx              # Text inputs with semantic focus rings
│   ├── page-transition-loader.tsx # Global page transition loading bar
│   ├── progress.tsx           # Basic percentage progress bar
│   ├── scroll-area.tsx        # Styled smooth-scrolling container
│   ├── ScrollToTopButton.tsx  # Scroll-to-top floating button with fade effects
│   ├── select.tsx             # Accessible dropdown selection box
│   ├── skeleton.tsx           # Content loading shimmer skeleton
│   ├── switch.tsx             # Toggle setting switch
│   ├── tabs.tsx               # Tabbed navigation switcher
│   ├── textarea.tsx           # Multiline text input
│   └── toast-provider.tsx     # Toast notification manager
├── auth/                      # Authentication widgets
│   ├── AuthFormComponents.tsx # Reusable input groups for login/registration
│   └── GoogleSignInButton.tsx # One-click Google OAuth button
├── gsap/                      # GSAP Animation Wrappers
│   ├── GsapProgressBar.tsx    # Hardware-accelerated 60fps progress bar
│   └── GsapStaggerContainer.tsx # Staggered cascade entrance animation container
├── providers/                 # React Context Providers
│   ├── QueryProvider.tsx      # TanStack React Query Client with caching configuration
│   └── ThemeProvider.tsx      # 4-theme manager (Light, Dark, Green, Pink)
├── selection/                 # Language tools
│   └── InteractiveText.tsx    # Text highlight dictionary lookup helper
└── DevOnlyGuard.tsx           # Guard rendering dev-only tools strictly in development
```

---

## 1. UI Primitives (`components/shared/ui/`)

All primitives are constructed atop **Radix UI Unstyled Components**:
- **Accessibility (A11y)**: Complete keyboard navigation support (`Tab`, `Enter`, `Escape`, `Arrow Keys`) and WAI-ARIA compliance.
- **Semantic Token Compatibility**: Zero hardcoded hex codes. Theme colors switch automatically when a new theme is selected.

---

## 2. Animation Wrappers (`components/shared/gsap/`)

- **`GsapProgressBar`**: Animates GPU `scaleX` rather than triggering layout recalculations via `width`.
- **`GsapStaggerContainer`**: Wraps lists and applies an entrance cascade animation (`y: 16`, `autoAlpha: 0`) with a `stagger: 0.05s` delay.

---

## 3. Global Providers (`components/shared/providers/`)

- **`QueryProvider`**:
  - Default `staleTime: 60 * 1000` (1 minute) to avoid duplicate network queries.
  - Disables window focus refetching during exam sessions to protect student workflow.
- **`ThemeProvider`**:
  - Persists chosen theme in `localStorage` (`theme` key).
  - Toggles semantic classes on `<html>`: `.theme-light`, `.theme-dark`, `.theme-green`, `.theme-pink`.
