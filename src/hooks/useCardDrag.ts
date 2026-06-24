/**
 * useCardDrag — mouse + touch drag hook for photo cards.
 *
 * Drags a card by directly updating CSS custom properties so there are
 * zero React re-renders during the gesture.
 *
 * The total card offset is split across two CSS custom properties:
 *   - `--offset-x/y` — committed base offset (accumulated from ALL past
 *     drags, stored in React state, stable between drags)
 *   - `--user-x/y`   — in-progress drag offset (set by this hook during
 *     a gesture, always reset to 0 after drag end)
 *
 * This split keeps the in-progress transform values small, preventing
 * iOS Safari compositor-layer hit-test degradation that can occur after
 * many drag gestures with large accumulated offsets.
 *
 * On drag end the gesture delta is committed via a callback; the parent
 * absorbs it into the base offset (see PhotoGrid's handleDragCommit).
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
 * (--user-x/y)  commit delta via callback
 *               setTimeout clear dataset
 *               reset --user-x/y to 0px
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
 *  - `touch-action: pan-y` on the card element (set in CSS) provides an
 *    additional layer of scroll prevention.
 *
 * ## Dual-input guarding
 *  - Synthetic mouse events from touch are filtered at the source via
 *    `sourceCapabilities.firesTouchEvents` in PhotoCard's mousedown
 *    handler — no chance to corrupt drag state.
 *  - As a fallback, a `touchActiveRef` flag is set during the touch
 *    gesture and checked in `startDrag`.
 *  - A **gesture generation counter** prevents stale event handlers
 *    (e.g. an orphan `onTouchMove` from a cancelled gesture) from
 *    interfering with the current gesture.
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
   * Monotonically increasing stacking counter.
   * Each time a drag ends, we increment this and assign it as the card's
   * z-index, so the most recently dragged card always sits on top.
   */
  const stackingIndexRef = useRef(0)

  /**
   * Gesture generation ID — incremented at the start of every gesture.
   * Event handlers capture the generation at creation time and check it
   * against the live value. If they don't match, the handler was from a
   * stale / cancelled gesture and should bail out immediately.
   */
  const gestureGenRef = useRef(0)

  /**
   * Flag set during an active touch gesture (startTouchDrag → cleanupTouch).
   * Used as a fallback in startDrag to block synthetic mouse events on
   * devices where sourceCapabilities isn't supported.
   */
  const touchActiveRef = useRef(false)

  /**
   * Full state reset — used both at drag end and defensively before
   * starting a new gesture to recover from any stuck state.
   *
   * NOTE: Does NOT remove document-level event listeners. That is the
   * responsibility of cleanupTouch (for touch) or onMouseUp (for mouse).
   * Callers must ensure stale listeners are handled via gestureGenRef
   * (touch) or by letting the old gesture's cleanup finish (mouse).
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

    touchActiveRef.current = false
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

      // Reset the in-progress drag offset — it has been committed to the
      // base position (--offset-x/y) via onCommit above, so the card's
      // total transform remains correct.  Keeping --user-x/y small
      // prevents iOS Safari compositor-layer hit-test degradation after
      // many drag gestures.
      s.element.style.setProperty('--user-x', '0px')
      s.element.style.setProperty('--user-y', '0px')
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
  // IMPORTANT: Synthetic mouse events generated from touch are filtered
  // at the source (PhotoCard's handleMouseDown checks
  // sourceCapabilities.firesTouchEvents). The defensive checks below are
  // a fallback for browsers that don't support that API.

  const startDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      // Defensive: if state is stuck (e.g. missed mouseup), recover first.
      if (dragRef.current.isDragging || touchActiveRef.current) {
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
  //
  // A gesture generation counter ensures that event handler closures from
  // a previous touch gesture never corrupt the current one.

  const TOUCH_DRAG_THRESHOLD = 6

  const startTouchDrag = useCallback(
    (id: number, el: HTMLElement, clientX: number, clientY: number) => {
      // Bump generation — any lingering handlers from a previous gesture
      // will see the mismatch and bail out.
      gestureGenRef.current += 1
      const gen = gestureGenRef.current

      // Defensive: kill any stuck state
      forceResetState()
      touchActiveRef.current = true

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
        // Stale gesture guard — if we're no longer the current gesture, bail.
        if (gen !== gestureGenRef.current) return

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
          if (s.element) {
            s.element.style.setProperty('--user-x', '0px')
            s.element.style.setProperty('--user-y', '0px')
          }
          s.element = null
          s.cardId = null
          document.removeEventListener('touchmove', onTouchMove)
          document.removeEventListener('touchend', onTouchEnd)
          document.removeEventListener('touchcancel', onTouchCancel)
          touchActiveRef.current = false
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
        // Stale gesture guard — if we're no longer the current gesture,
        // our listeners were already superseded. Bail without touching state.
        if (gen !== gestureGenRef.current) return

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
          // Still reset --user-x/y to 0 so the next gesture starts clean.
          if (s.element) {
            s.element.style.setProperty('--user-x', '0px')
            s.element.style.setProperty('--user-y', '0px')
          }
          s.element = null
          s.cardId = null
          s.isDragging = false
        }

        touchActiveRef.current = false
      }

      function onTouchEnd() { cleanupTouch() }
      function onTouchCancel() { cleanupTouch() }

      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd, { passive: true })
      document.addEventListener('touchcancel', onTouchCancel, { passive: true })
    },
    [],
  )

  return { startDrag, startTouchDrag }
}
