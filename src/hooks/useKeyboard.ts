/**
 * useKeyboard — keyboard event handler hook.
 *
 * Listens for specific key presses and invokes the corresponding callbacks.
 * Designed for lightbox navigation: ESC close, arrows for prev/next.
 */

import { useEffect } from 'react'

export interface UseKeyboardOptions {
  readonly onEscape?: () => void
  readonly onArrowLeft?: () => void
  readonly onArrowRight?: () => void
  /** When false, keyboard events are ignored */
  readonly enabled?: boolean
}

export function useKeyboard({
  onEscape,
  onArrowLeft,
  onArrowRight,
  enabled = true,
}: UseKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onEscape?.()
          break
        case 'ArrowLeft':
          e.preventDefault()
          onArrowLeft?.()
          break
        case 'ArrowRight':
          e.preventDefault()
          onArrowRight?.()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onEscape, onArrowLeft, onArrowRight])
}
