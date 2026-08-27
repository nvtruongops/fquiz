import React from 'react'

interface StepIndicatorProps {
  number: number
  label: string
  active: boolean
  completed: boolean
}

export function StepIndicator({
  number,
  label,
  active,
  completed,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          completed
            ? 'bg-success-fg text-primary-foreground'
            : active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? 'text-card-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
