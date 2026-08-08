# FQuiz GSAP Animation Code Patterns & Examples

Detailed code snippets and component examples for implementing GSAP in FQuiz (React 18 + Next.js 16 App Router).

## 1. Basic Component Setup (`useGSAP`)

ALWAYS wrap GSAP logic inside `useGSAP` with a container `ref`:

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function QuizOptionList({ options }: { options: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // Scoped selector: only animates .option-item inside containerRef
      gsap.from('.option-item', {
        y: 12,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.35,
        ease: 'power2.out',
      })
    },
    { scope: containerRef, dependencies: [options] }
  )

  return (
    <div ref={containerRef} className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="option-item p-4 rounded-lg border bg-card">
          {opt}
        </div>
      ))}
    </div>
  )
}
```

---

## 2. Flashcard Flip Animation (3D Perspective)

Flashcards require smooth 3D flipping with `backfaceVisibility: hidden`:

```tsx
'use client'

import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function Flashcard({ frontText, backText }: { frontText: string; backText: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const { contextSafe } = useGSAP({ scope: cardRef })

  const handleFlip = contextSafe(() => {
    const nextState = !isFlipped
    setIsFlipped(nextState)
    gsap.to(cardRef.current, {
      rotationY: nextState ? 180 : 0,
      duration: 0.5,
      ease: 'power2.inOut',
    })
  })

  return (
    <div
      ref={cardRef}
      onClick={handleFlip}
      className="relative w-80 h-48 cursor-pointer [transform-style:preserve-3d]"
    >
      {/* Front */}
      <div className="absolute inset-0 p-6 bg-card border rounded-xl flex items-center justify-center [backface-visibility:hidden]">
        <span className="text-xl font-bold">{frontText}</span>
      </div>
      {/* Back */}
      <div className="absolute inset-0 p-6 bg-primary text-primary-foreground border rounded-xl flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <span className="text-xl font-medium">{backText}</span>
      </div>
    </div>
  )
}
```

---

## 3. Quiz Progress Bar Animation (`scaleX` / `xPercent`)

DO NOT animate `width` in percent. Animate `scaleX` or `xPercent` with `transformOrigin: "left center"` for 60fps progress updates:

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function QuizProgressBar({ progressRatio }: { progressRatio: number }) {
  const barRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.to(barRef.current, {
        scaleX: progressRatio,
        duration: 0.4,
        ease: 'power1.out',
      })
    },
    { dependencies: [progressRatio] }
  )

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        ref={barRef}
        className="h-full bg-primary origin-left scale-x-0"
      />
    </div>
  )
}
```

---

## 4. Interactive Card Hover Micro-Interactions

Use `contextSafe` for event-driven hover effects:

```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function TopicCard({ title, count }: { title: string; count: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { contextSafe } = useGSAP({ scope: cardRef })

  const handleMouseEnter = contextSafe(() => {
    gsap.to(cardRef.current, {
      y: -4,
      scale: 1.02,
      duration: 0.2,
      ease: 'power1.out',
      overwrite: 'auto',
    })
  })

  const handleMouseLeave = contextSafe(() => {
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      duration: 0.25,
      ease: 'power1.out',
      overwrite: 'auto',
    })
  })

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="p-6 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{count} items</p>
    </div>
  )
}
```

---

## 5. Accessibility & Reduced Motion (`prefers-reduced-motion`)

ALL UI animations MUST respect `prefers-reduced-motion` settings. Use `gsap.matchMedia()`:

```tsx
useGSAP(
  () => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        isNormalMotion: '(prefers-reduced-motion: no-preference)',
        isReducedMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { isReducedMotion } = context.conditions!

        gsap.from('.animated-header', {
          y: isReducedMotion ? 0 : 20,
          autoAlpha: 0,
          duration: isReducedMotion ? 0.01 : 0.5,
          ease: 'power2.out',
        })
      },
      containerRef
    )
  },
  { scope: containerRef }
)
```
