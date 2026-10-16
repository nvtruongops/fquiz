import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const alertVariants = cva(
  'relative w-full rounded-2xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4.5 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-card text-foreground border-border shadow-2xs',
        destructive:
          'border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive shadow-2xs',
        warning:
          'border-warning-border bg-warning-bg text-warning-fg [&>svg]:text-warning-fg shadow-2xs',
        success:
          'border-success-border bg-success-bg text-success-fg [&>svg]:text-success-fg shadow-2xs',
        info:
          'border-primary/30 bg-primary/10 text-primary [&>svg]:text-primary shadow-2xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-black text-sm leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h5>
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs leading-relaxed font-medium', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription, alertVariants }

