/**
 * useCardDrag — mouse + touch drag hook for photo cards.
 *
 * Drags a card by directly updating CSS custom properties (--user-x, --user-y)
 * so there are zero React re-renders during the gesture.
 *
 * On drag end the final offset is committed via a callback, allowing the
 * parent to persist user positions in React state.
 *
 * ## Architecture
 *
 * ```
 * mousedown / touchstart
 *         │
 *         ▼
 *   startDrag / startTouchDrag(id, el, clientX, clientY)
 *         │
 *         ▼
 *    attach document-level move / up listeners
 *         │
 *   ┌─────┼──────┐
 *   ▼     ▼      ▼
 *  move  up    (unload)
 *   │     │
 *   ▼     ▼
 * setProperty  remove listeners
 * (--user-x)   commit via callback
 * (--user-y)   setTimeout clear dataset
 * ```
 *
 * ## Touch handling
 *  - `onTouchDragStart` returns a registration function; the component
 *    calls it inside a useEffect to attach a **native** touchstart listener
 *    (React synthetic touchstart is passive by default, which prevents
 *    reliable scroll suppression).
 *  - The touchmove handler uses `{ passive: false }` and calls
 *    `preventDefault()` — the browser waits for this listener before
 *    deciding to scroll, so a finger drag on a card stays on the card.
 *  - `touch-action: none` on the card element (set in CSS) provides an
 *    additional layer of scroll prevention.
 *
 * ## Dual-input guarding
 *  - Both `startDrag` and `startTouchDrag` check `dragRef.current.isDragging`
 *    before proceeding — if a touch drag is active a mouse-initiated drag
 *    is silently ignored and vice versa.
 *  - A `touchInProgress` flag is set during a touch gesture and cleared
 *    300 ms after touchend. This blocks synthetic mousedown events (which
 *    iOS / Android fire after touch) from starting a redundant mouse drag.
 *
 * ## Drag-vs-click
 *  - Sets `el.dataset.dragged` when movement exceeds 5 px threshold.
 *  - Clears it via setTimeout(0) after mouseup / touchend so the subsequent
 *    click event can detect the drag and skip opening the lightbox.
 *
 * ## Performance
 *  - Only writes to CSS custom properties (style recalc, no layout / paint).
 *  - The card already has `will-change: transform`.
 *  - No requestAnimationFrame needed — move events fire at display refresh.
 */

import { useRef, useCallback, useEffect } from 'react'

/* ── Public types ──────────────────────────────────────────────────────── */

export interface UseCardDragOptions {
  /** Called at drag end with the final accumulated offset */
  readonly onCommit?: (id: number, offsetX: number, offsetY: number) => void
}

export interface UseCardDragReturn {
  /** Call from the card's onMouseDown to initiate a mouse drag */
  readonly startDrag: (id: number, el: HTMLElement, clientX: number, clientY: number) => void

  /** Call from the card's native touchstart handler to initiate a touch drag */
  readonly startTouchDrag: (id: number, el: HTMLElement, clientX: number, clientY: number) => void
}

/* ── Internal drag state (mutable ref, never triggers render) ──────────── */

interface DragState {
  isDragging: boolean
  element: HTMLElement | null
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  cardId: number | null
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useCardDrag({ onCommit }: UseCardDragOptions): UseCardDragReturn {
  const onCommitRef = useRef(onCommit)
  useEffect(() => { onCommitRef.current = onCommit }, [onCommit])

  const dragRef = useRef<DragState>({
    isDragging: false,
    element: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    cardId: null,
  })

  /**
   * Guard flag that stays true during a touch gesture + a short cooldown
   * after touchend to suppress synthetic mousedown events.
   */
  const touchGuardRef = useRef(false)

  // ── Shared "move" logic (identical between mouse and touch) ──────────

  function applyMove(dx: number, dy: number) {
    const s = dragRef.current
    if (!s.isDragging || !s.element) return

    s.offsetX = dx
    s.offsetY = dy

    s.element.style.setProperty('--user-x', `${dx}px`)
    s.element.style.setProperty('--user-y', `${dy}px`)

    // Flag drag for click-suppression (>5 px threshold)
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      s.element.dataset.dragged = 'true'
    }
  }

  function endDrag() {
    const s = dragRef.current
    s.isDragging = false

    if (s.cardId !== null) {
      onCommitRef.current?.(s.cardId, s.offsetX, s.offsetY)
    }

    // Reset z-index back to auto so cards stack naturally again
    if (s.element) {
      s.element.style.zIndex = ''
    }

    // Clear drag flag after click has a chance to fire.
    // Without the delay the `click` event won't see `dragged`.
    const el = s.element
    setTimeout(() => { delete el?.dataset?.dragged }, 0)

    s.element = null
    s.cardId = null
  }

  // ── Mouse drag ───────────────────────────────────────────────────────

  const startDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      // Block if a touch gesture is still in cooldown
      if (dragRef.current.isDragging || touchGuardRef.current) return

      const state = dragRef.current

      // Read any previously-committed user offset so we add to it,
      // not replace it — allows drag → commit → drag again.
      const currentX = parseFloat(el.style.getPropertyValue('--user-x')) || 0
      const currentY = parseFloat(el.style.getPropertyValue('--user-y')) || 0

      state.isDragging = true
      state.element = el
      state.cardId = id
      state.startX = clientX - currentX
      state.startY = clientY - currentY
      state.offsetX = currentX
      state.offsetY = currentY

      // Bring the dragged card to the top layer
      el.style.zIndex = '999'

      function onMouseMove(ev: MouseEvent) {
        const s = dragRef.current
        if (!s.isDragging || !s.element) return
        applyMove(ev.clientX - s.startX, ev.clientY - s.startY)
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        endDrag()
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [], // stable — onCommit read via ref
  )

  // ── Touch drag ───────────────────────────────────────────────────────
  //
  // touch-action: pan-y on the card means the browser handles vertical
  // scroll natively. We only claim the gesture once horizontal movement
  // exceeds THRESHOLD — until then touchmove passes through for scroll.

  const TOUCH_DRAG_THRESHOLD = 12

  const startTouchDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      if (dragRef.current.isDragging) return

      // Set touch guard — blocks synthetic mouse events
      touchGuardRef.current = true

      const state = dragRef.current

      const currentX = parseFloat(el.style.getPropertyValue('--user-x')) || 0
      const currentY = parseFloat(el.style.getPropertyValue('--user-y')) || 0

      // NOTE: isDragging is NOT set yet — we wait until movement
      // crosses the threshold to avoid hijacking vertical scroll.
      state.element = el
      state.cardId = id
      state.startX = clientX - currentX
      state.startY = clientY - currentY
      state.offsetX = currentX
      state.offsetY = currentY
      state.isDragging = false

      let axisLocked: 'h' | 'v' | null = null

      function onTouchMove(ev: TouchEvent) {
        const s = dragRef.current
        if (!s.element) return
        const touch = ev.touches[0]
        if (!touch) return

        const dx = touch.clientX - s.startX
        const dy = touch.clientY - s.startY

        // ── Already dragging → move freely ─────────────────
        if (s.isDragging) {
          ev.preventDefault()
          applyMove(dx, dy)
          return
        }

        // ── Not yet dragging — axis-lock check ─────────────
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (!axisLocked) {
          // Need at least one axis past threshold to decide
          if (absDx < TOUCH_DRAG_THRESHOLD && absDy < TOUCH_DRAG_THRESHOLD) {
            return // still within dead zone — let browser handle
          }
          axisLocked = absDx >= absDy ? 'h' : 'v'
        }

        if (axisLocked === 'v') {
          // Vertical scroll intent — stop tracking, let browser scroll
          s.element = null
          s.cardId = null
          document.removeEventListener('touchmove', onTouchMove)
          document.removeEventListener('touchend', onTouchEnd)
          return
        }

        // Horizontal threshold crossed → claim the gesture as a drag
        s.isDragging = true

        // Bring the dragged card to the top layer
        s.element.style.zIndex = '999'

        ev.preventDefault()
        applyMove(dx, dy)
      }

      function onTouchEnd() {
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)

        // Commit only if an actual drag happened
        const s = dragRef.current
        if (s.isDragging && s.cardId !== null) {
          endDrag()
        } else {
          // Clean up without committing
          if (s.element) s.element.style.zIndex = ''
          s.element = null
          s.cardId = null
          s.isDragging = false
        }

        // Keep the touch guard for 300 ms — long enough for any synthetic
        // mouse events to fire and be ignored, short enough that the next
        // intentional mouse drag on desktop isn't delayed.
        setTimeout(() => { touchGuardRef.current = false }, 300)
      }

      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd, { passive: true })
    },
    [],
  )

  return { startDrag, startTouchDrag }
}
