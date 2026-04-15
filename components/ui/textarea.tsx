import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, onInput, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      // @ts-expect-error -- combining refs
      internalRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as any).current = node
    }

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current
      if (textarea && autoResize) {
        textarea.style.height = "auto"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [autoResize])

    React.useEffect(() => {
      if (autoResize) adjustHeight()
    }, [adjustHeight, props.value])

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) adjustHeight()
      if (onInput) onInput(e)
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
          autoResize && "overflow-hidden",
          className
        )}
        onInput={handleInput}
        ref={combinedRef}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
