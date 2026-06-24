/**
 * PhotoCard — single photo card component.
 *
 * Displays an image with deterministic scatter transform (rotation + offset).
 * Optionally shows a Polaroid-style caption area beneath the image.
 *
 * GSAP-powered hover interactions: scale, lift, shadow.
 * Pure presentational component — no business logic.
 */

import { useRef, useCallback, useEffect } from 'react'
import type { Photo } from '../../types/photo.ts'
import {
  animateCardHoverIn,
  animateCardHoverOut,
} from '../../animations/cardAnimations.ts'
import './PhotoCard.css'

export interface PhotoCardProps {
  /** The photo data to render */
  readonly photo: Photo

  /** Called when the card is clicked or activated via keyboard */
  readonly onClick?: (id: number) => void

  /** Whether to show the caption below the image (Polaroid style) */
  readonly showCaption?: boolean

  /** Additional CSS class names */
  readonly className?: string

  /* ══════════════ Phase 7A — Draggable Card ══════════════ */

  /** Accummulated horizontal base offset (px) from all previous drags */
  readonly baseOffsetX?: number

  /** Accummulated vertical base offset (px) from all previous drags */
  readonly baseOffsetY?: number

  /** Called on mousedown to start a mouse drag gesture */
  readonly onDragStart?: (id: number, el: HTMLElement, clientX: number, clientY: number) => void

  /* ══════════════ Phase 7B — Touch Drag ══════════════ */

  /** Called via native touchstart to start a touch drag gesture */
  readonly onTouchDragStart?: (id: number, el: HTMLElement, clientX: number, clientY: number) => void
}

export function PhotoCard({
  photo,
  onClick,
  showCaption = false,
  className = '',
  baseOffsetX = 0,
  baseOffsetY = 0,
  onDragStart,
  onTouchDragStart,
}: PhotoCardProps) {
  const { id, src, caption, rotation, offsetX, offsetY } = photo
  const cardRef = useRef<HTMLDivElement>(null)

  // ── Ref for touch callback (stable, avoids re-attaching listener) ───

  const onTouchDragStartRef = useRef(onTouchDragStart)
  useEffect(() => { onTouchDragStartRef.current = onTouchDragStart }, [onTouchDragStart])

  // ── Native touch + mouse listeners ───────────────────────────────────
  // React synthetic events can sometimes miss mouseenter/mouseleave
  // (e.g. after a drag or on hybrid touch devices). Native listeners
  // guarantee the hover animation always fires.
  //
  // Touch feedback: the card lifts on touchstart and settles on touchend,
  // providing immediate visual confirmation before any drag gesture.

  useEffect(() => {
    const div = cardRef.current
    if (!div) return
    // Separate const so TypeScript can narrow it across closure boundaries
    const card: HTMLElement = div

    function onTouchStart(e: TouchEvent) {
      // Only respond to single-finger touches on the card itself
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      if (!touch) return
      onTouchDragStartRef.current?.(id, card, touch.clientX, touch.clientY)
      // Immediate visual feedback — lift the card on touch
      animateCardHoverIn(card)
    }

    function onTouchEnd() {
      animateCardHoverOut(card)
    }

    function onNativeMouseEnter() {
      animateCardHoverIn(card)
    }

    function onNativeMouseLeave() {
      animateCardHoverOut(card)
    }

    card.addEventListener('touchstart', onTouchStart, { passive: true })
    card.addEventListener('touchend', onTouchEnd, { passive: true })
    card.addEventListener('touchcancel', onTouchEnd, { passive: true })
    card.addEventListener('mouseenter', onNativeMouseEnter)
    card.addEventListener('mouseleave', onNativeMouseLeave)
    return () => {
      card.removeEventListener('touchstart', onTouchStart)
      card.removeEventListener('touchend', onTouchEnd)
      card.removeEventListener('touchcancel', onTouchEnd)
      card.removeEventListener('mouseenter', onNativeMouseEnter)
      card.removeEventListener('mouseleave', onNativeMouseLeave)
    }
  }, [id])

  // ── Hover / focus handlers ───────────────────────────────────────────

  const handleMouseEnter = useCallback(() => {
    if (cardRef.current) animateCardHoverIn(cardRef.current)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) animateCardHoverOut(cardRef.current)
  }, [])

  const handleFocus = useCallback(() => {
    if (cardRef.current) animateCardHoverIn(cardRef.current)
  }, [])

  const handleBlur = useCallback(() => {
    if (cardRef.current) animateCardHoverOut(cardRef.current)
  }, [])

  // ── Click handler — suppress if preceded by a drag ──────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const el = cardRef.current
      // If the card was just dragged, don't open the lightbox
      if (el?.dataset.dragged) {
        delete el.dataset.dragged
        e.preventDefault()
        return
      }
      onClick?.(id)
    },
    [id, onClick],
  )

  // ── Drag start (onMouseDown) ─────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only primary button
      if (e.button !== 0) return
      // Ignore synthetic mouse events generated from touch (mobile).
      // Supported in Chrome 55+ and Safari 16+.
      const native = e.nativeEvent as MouseEvent
      if ((native as any).sourceCapabilities?.firesTouchEvents) return
      e.preventDefault()
      if (cardRef.current && onDragStart) {
        onDragStart(id, cardRef.current, e.clientX, e.clientY)
      }
    },
    [id, onDragStart],
  )

  // ── Scatter + user offset style ──────────────────────────────────────

  const scatterStyle = {
    '--scatter-x': `${offsetX}px`,
    '--scatter-y': `${offsetY}px`,
    '--scatter-rotate': `${rotation}deg`,
    '--offset-x': `${baseOffsetX}px`,
    '--offset-y': `${baseOffsetY}px`,
    '--user-x': '0px',
    '--user-y': '0px',
  } as React.CSSProperties

  return (
    <div
      ref={cardRef}
      className={`photo-card ${className}`}
      style={scatterStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="button"
      tabIndex={0}
      aria-label={caption}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(id)
        }
      }}
    >
      <div className="photo-card__image-wrapper">
        <img
          className="photo-card__image"
          src={src}
          alt={caption}
          loading="lazy"
        />
      </div>
      {showCaption && (
        <div className="photo-card__caption">
          <span className="photo-card__caption-text">{caption}</span>
        </div>
      )}
    </div>
  )
}
