import * as React from 'react'
import { cn } from '../lib/utils'

export type FunctionalAccentRole =
  | 'learning'
  | 'memory'
  | 'progress'
  | 'achievement'
  | 'focus'
  | 'discovery'
  | 'community'
  | 'classroom'

const accentRailStyles: Record<FunctionalAccentRole, string> = {
  learning: 'before:bg-accentRole-learning',
  memory: 'before:bg-accentRole-memory',
  progress: 'before:bg-accentRole-progress',
  achievement: 'before:bg-accentRole-achievement',
  focus: 'before:bg-accentRole-focus',
  discovery: 'before:bg-accentRole-discovery',
  community: 'before:bg-accentRole-community',
  classroom: 'before:bg-accentRole-classroom',
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'muted' | 'accent' | 'learning'
    accentRail?: FunctionalAccentRole
  }
>(({ className, variant = 'default', accentRail, ...props }, ref) => {
  const variantStyles = {
    default: 'bg-surface-card border-border-default text-foreground shadow-xs hover:border-border-strong',
    elevated: 'bg-surface-card-elevated border-border-strong text-foreground shadow-md hover:border-border-emphasis',
    muted: 'bg-surface-card-muted border-border-subtle text-foreground',
    accent: 'bg-surface-card-accent border-border-accent text-foreground shadow-xs',
    learning: 'bg-learning-progress-bg border-learning-progress-border text-learning-progress-fg shadow-xs',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border transition-all duration-200 relative overflow-hidden',
        variantStyles[variant],
        accentRail && [
          'before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-r-full',
          accentRailStyles[accentRail],
        ],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-2xl font-black leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-text-tertiary font-medium', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
