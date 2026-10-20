import type { KeyboardEvent } from 'react'

export function handleArrowOptionNavigation(
  event: KeyboardEvent<HTMLButtonElement>,
  optionIndex: number,
  optionCount: number,
  onSelectOption: (index: number) => void,
  focusOption: (index: number) => void,
) {
  const direction = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key] ?? 0
  if (!direction || optionCount < 1) return
  event.preventDefault()
  const nextIndex = (optionIndex + direction + optionCount) % optionCount
  focusOption(nextIndex)
  onSelectOption(nextIndex)
}
