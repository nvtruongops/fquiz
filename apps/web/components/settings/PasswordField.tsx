'use client'

import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { PasswordForm } from '@/hooks/useUserSettings'

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  field: keyof PasswordForm
  autoComplete: string
  visible: boolean
  error?: string
  disabled?: boolean
  onChange: (field: keyof PasswordForm, value: string) => void
  onToggleVisibility: (field: keyof PasswordForm) => void
}

export function PasswordField({
  id,
  label,
  value,
  field,
  autoComplete,
  visible,
  error,
  disabled,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          className={`w-full h-9 sm:h-10 rounded-lg sm:rounded-xl border bg-muted px-3 sm:px-4 py-2 pr-10 text-xs sm:text-sm font-semibold text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
              : 'border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
          }`}
        />
        <button
          type="button"
          onClick={() => onToggleVisibility(field)}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? (
            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[11px] font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
