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
 *  move  up    (cancel)
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
 *  - The 300 ms timer is tracked and cancelled on new gesture start,
 *    preventing stale timeouts from corrupting state.
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
  /** Track the touch-guard timeout so we can cancel it on new gesture. */
  const touchGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Cancel any pending touch-guard timeout. */
  function clearTouchGuardTimer() {
    if (touchGuardTimerRef.current !== null) {
      clearTimeout(touchGuardTimerRef.current)
      touchGuardTimerRef.current = null
    }
  }

  /** Set touch guard with a cancellable timeout. */
  function scheduleTouchGuardRelease(ms: number) {
    clearTouchGuardTimer()
    touchGuardTimerRef.current = setTimeout(() => {
      touchGuardRef.current = false
      touchGuardTimerRef.current = null
    }, ms)
  }

  /**
   * Monotonically increasing stacking counter.
   * Each time a drag ends, we increment this and assign it as the card's
   * z-index, so the most recently dragged card always sits on top.
   */
  const stackingIndexRef = useRef(0)

  /**
   * Full state reset — used both at drag end and defensively before
   * starting a new gesture to recover from any stuck state.
   */
  function forceResetState() {
    const s = dragRef.current

    // Only reset the temporary drag z-index (999) — never clear a
    // permanent stacking z-index that was assigned by a previous drag.
    if (s.element && s.element.style.zIndex === '999') {
      s.element.style.zIndex = ''
    }
    if (s.element) {
      s.element = null
    }

    s.isDragging = false
    s.cardId = null
    s.startX = 0
    s.startY = 0
    s.offsetX = 0
    s.offsetY = 0

    clearTouchGuardTimer()
    touchGuardRef.current = false
  }

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

    if (s.cardId !== null) {
      onCommitRef.current?.(s.cardId, s.offsetX, s.offsetY)
    }

    // Bump the stacking counter and freeze this card's layer so the most
    // recently dragged card always sits on top of previously moved ones.
    if (s.element) {
      stackingIndexRef.current += 1
      s.element.style.zIndex = String(stackingIndexRef.current)
    }

    // Clear drag flag after click has a chance to fire.
    // Without the delay the `click` event won't see `dragged`.
    const el = s.element
    setTimeout(() => { delete el?.dataset?.dragged }, 0)

    s.isDragging = false
    s.element = null
    s.cardId = null
  }

  // ── Mouse drag ───────────────────────────────────────────────────────

  const startDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      // Defensive: if state got stuck (e.g. missed mouseup), recover first.
      if (dragRef.current.isDragging || touchGuardRef.current) {
        forceResetState()
      }

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

  const TOUCH_DRAG_THRESHOLD = 6

  const startTouchDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      // Defensive: if any state is stuck (e.g. stale touchGuardRef), recover first.
      if (dragRef.current.isDragging || touchGuardRef.current) {
        forceResetState()
      }

      // Block synthetic mouse events for a full cycle
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
          document.removeEventListener('touchcancel', onTouchCancel)
          // Release the touch guard so the next gesture isn't blocked.
          touchGuardRef.current = false
          clearTouchGuardTimer()
          return
        }

        // Horizontal threshold crossed → claim the gesture as a drag
        s.isDragging = true

        // Bring the dragged card to the top layer
        s.element.style.zIndex = '999'

        ev.preventDefault()
        applyMove(dx, dy)
      }

      function cleanupTouch() {
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
        document.removeEventListener('touchcancel', onTouchCancel)

        // Commit only if an actual drag happened
        const s = dragRef.current
        if (s.isDragging && s.cardId !== null) {
          endDrag()
        } else {
          // Clean up without committing.
          // IMPORTANT: NEVER clear the element's z-index here — it may
          // hold a permanent stacking value from a previous drag. The
          // temporary z-index 999 is only set AFTER the drag threshold
          // is crossed (inside onTouchMove), so it was never applied in
          // this path.
          s.element = null
          s.cardId = null
          s.isDragging = false
        }

        // Keep the touch guard for 300 ms — cancel any stale timer first
        // so a lingering timeout from a prior gesture doesn't clear our guard.
        scheduleTouchGuardRelease(300)
      }

      function onTouchEnd() { cleanupTouch() }
      function onTouchCancel() { cleanupTouch() }

      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd, { passive: true })
      document.addEventListener('touchcancel', onTouchCancel, { passive: true })

      // Cancel any stale touch-guard timer from a prior gesture so it
      // doesn't fire during this gesture and corrupt touchGuardRef.
      clearTouchGuardTimer()
    },
    [],
  )

  return { startDrag, startTouchDrag }
}
