/**
 * Lightbox — premium photo preview component.
 *
 * Full-screen overlay with glass/blur backdrop, centered image,
 * caption, prev/next navigation, and draggable gesture support.
 *
 * Uses GSAP for entry/exit animations and smooth drag-return.
 *
 * ## Drag gestures
 * - Horizontal drag → navigate prev/next (past 80 px threshold)
 * - Below threshold → spring-back to center (back.out easing)
 * - Desktop: mouse drag via document-level listeners
 * - Mobile: non-passive touch listeners (native, not React synthetic)
 *   so e.preventDefault() reliably stops scroll during drag
 */

import { useEffect, useRef, useCallback } from 'react'
import type { Photo } from '../../types/photo.ts'
import { useKeyboard } from '../../hooks/useKeyboard.ts'
import {
  animateLightboxOpen,
  animateLightboxClose,
} from '../../animations/lightboxAnimations.ts'
import gsap from 'gsap'
import './Lightbox.css'

export interface LightboxProps {
  /** The currently selected photo, or null when closed */
  readonly photo: Photo | null

  /** The total number of photos (for wrapping navigation) */
  readonly totalPhotos: number

  /** Close handler */
  readonly onClose: () => void

  /** Navigate to next photo */
  readonly onNext: () => void

  /** Navigate to previous photo */
  readonly onPrevious: () => void
}

export function Lightbox({
  photo,
  totalPhotos,
  onClose,
  onNext,
  onPrevious,
}: LightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const dragOffsetX = useRef(0)
  const dragOffsetY = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  // ----- Mutable refs for latest callback values -----
  // Native touch listeners (set up once) need to call the latest versions
  // of handlers and navigation callbacks without re-attaching.
  // Assignments moved into useLayoutEffect to satisfy react-hooks/refs rule.
  const onCloseRef = useRef(onClose)
  const onNextRef = useRef(onNext)
  const onPreviousRef = useRef(onPrevious)

  const handlersRef = useRef<{
    dragStart: (clientX: number, clientY: number) => void
    dragMove: (clientX: number, clientY: number) => void
    dragEnd: () => void
  }>({
    dragStart: () => {},
    dragMove: () => {},
    dragEnd: () => {},
  })

  // ===================== Swipe-dismiss constants =====================
  /** Minimum vertical drag distance (px) to trigger swipe-to-dismiss */
  const SWIPE_DISMISS_THRESHOLD = 120

  // ===================== Drag logic =====================

  function handleDragStart(clientX: number, clientY: number) {
    isDragging.current = true
    dragStartX.current = clientX - dragOffsetX.current
    dragStartY.current = clientY - dragOffsetY.current
  }

  function handleDragMove(clientX: number, clientY: number) {
    if (!isDragging.current || !cardRef.current) return

    dragOffsetX.current = clientX - dragStartX.current
    dragOffsetY.current = clientY - dragStartY.current

    const absDx = Math.abs(dragOffsetX.current)
    const absDy = Math.abs(dragOffsetY.current)
    const navProgress = Math.min(absDx / 80, 1)

    // Dim overlay background when vertical drag is dominant (iOS 26 style)
    const dismissProgress = (absDy > absDx)
      ? Math.min(absDy / SWIPE_DISMISS_THRESHOLD, 1)
      : 0

    gsap.set(cardRef.current, {
      x: dragOffsetX.current,
      y: dragOffsetY.current,
      rotation: dragOffsetX.current * 0.02,
      scale: 1 - Math.max(navProgress, dismissProgress) * 0.06,
    })

    // Progressively dim the overlay backdrop as user swipes down/up
    if (overlayRef.current && dismissProgress > 0) {
      const alpha = 0.85 * (1 - dismissProgress)
      const blurPx = Math.round(24 * (1 - dismissProgress))
      overlayRef.current.style.setProperty('--overlay-alpha', String(alpha))
      overlayRef.current.style.setProperty('--overlay-blur', `${blurPx}px`)
    }
  }

  /** Reset overlay CSS custom properties to defaults */
  function resetOverlayProps() {
    if (overlayRef.current) {
      overlayRef.current.style.removeProperty('--overlay-alpha')
      overlayRef.current.style.removeProperty('--overlay-blur')
    }
  }

  /** Reset drag state and overlay after any drag end */
  function resetDragState() {
    dragOffsetX.current = 0
    dragOffsetY.current = 0
    resetOverlayProps()
  }

  /** Animate the lightbox closing via a vertical swipe (iOS 26 style) */
  function closeWithSwipe(direction: number) {
    if (!cardRef.current || !overlayRef.current) return

    const overlay = overlayRef.current
    // Read the current alpha set during drag, or default
    const startAlpha = parseFloat(overlay.style.getPropertyValue('--overlay-alpha')) || 0.85
    const targetY = direction * window.innerHeight

    // Animate the card flying off-screen while fading the overlay
    gsap.to(cardRef.current, {
      y: targetY,
      opacity: 0,
      scale: 0.8,
      duration: 0.4,
      ease: 'power2.in',
      onUpdate: function () {
        // Sync overlay fade with the image tween progress
        const p = this.progress()
        const alpha = startAlpha * (1 - p)
        const blurPx = Math.round(24 * (1 - p))
        overlay.style.setProperty('--overlay-alpha', String(alpha))
        overlay.style.setProperty('--overlay-blur', `${blurPx}px`)
      },
      onComplete: () => {
        resetDragState()
        onCloseRef.current()
      },
    })
  }

  function handleDragEnd() {
    if (!isDragging.current || !cardRef.current) return
    isDragging.current = false

    const navThreshold = 80
    const dismissThreshold = SWIPE_DISMISS_THRESHOLD
    const dx = dragOffsetX.current
    const dy = dragOffsetY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // ── Vertical swipe dismiss (dominant Y) — iOS 26 style ──
    if (absDy > dismissThreshold && absDy > absDx) {
      closeWithSwipe(dy > 0 ? 1 : -1)
      return
    }

    // ── Horizontal navigation (dominant X) ──
    if (absDx > absDy) {
      if (dx > navThreshold) {
        gsap.to(cardRef.current, {
          x: 250,
          opacity: 0,
          rotation: 6,
          scale: 0.92,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            resetDragState()
            onNextRef.current()
          },
        })
        return
      }

      if (dx < -navThreshold) {
        gsap.to(cardRef.current, {
          x: -250,
          opacity: 0,
          rotation: -6,
          scale: 0.92,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            resetDragState()
            onPreviousRef.current()
          },
        })
        return
      }
    }

    // ── Below threshold → smooth spring-back to rest ──
    const springTl = gsap.timeline({
      onComplete: () => resetDragState(),
    })

    springTl.to(cardRef.current, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.65,
      ease: 'back.out(1.7)',
    }, 0)

    // Also animate the overlay back to opaque if it was dimmed
    if (overlayRef.current && overlayRef.current.style.getPropertyValue('--overlay-alpha')) {
      springTl.to(overlayRef.current, {
        '--overlay-alpha': 0.85,
        '--overlay-blur': '24px',
        duration: 0.5,
        ease: 'power2.out',
      }, 0)
    }
  }

  // Keep the ref current so native listeners always invoke fresh handlers
  useEffect(() => {
    handlersRef.current = {
      dragStart: handleDragStart,
      dragMove: handleDragMove,
      dragEnd: handleDragEnd,
    }
  })

  // Sync callback refs on every render so native listeners get latest values
  useEffect(() => {
    onCloseRef.current = onClose
    onNextRef.current = onNext
    onPreviousRef.current = onPrevious
  })

  // ===================== Open animation =====================

  useEffect(() => {
    if (!photo || !overlayRef.current || !contentRef.current) return

    timelineRef.current?.kill()

    // Clear any GSAP inline styles left from a previous drag or snap-out.
    // Without this the new card would start at x:250 / opacity:0 from the
    // prior drag-navigation's snap-out animation.
    if (cardRef.current) {
      gsap.set(cardRef.current, { clearProps: 'all' })
    }

    timelineRef.current = animateLightboxOpen(
      overlayRef.current,
      contentRef.current,
    )

    return () => {
      timelineRef.current?.kill()
    }
  }, [photo])

  // ===================== Native touch listeners =====================
  // React synthetic touch events are passive by default, which means
  // preventDefault() inside them is silently ignored.  We bypass React's
  // event system and attach handlers directly with { passive: false } so
  // we can prevent scrolling while the user drags the image.

  useEffect(() => {
    // Only attach native listeners when the lightbox has DOM
    if (!photo) return
    const overlay = overlayRef.current
    if (!overlay) return

    function onTouchStart(e: TouchEvent) {
      // Don't intercept touches on interactive elements (close, nav buttons)
      const target = e.target as HTMLElement
      if (target.closest('button')) return

      const touch = e.touches[0]
      if (!touch) return
      handlersRef.current.dragStart(touch.clientX, touch.clientY)
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current) return
      // Prevent scroll while dragging — works because listener is non-passive
      e.preventDefault()
      const touch = e.touches[0]
      if (!touch) return
      handlersRef.current.dragMove(touch.clientX, touch.clientY)
    }

    function onTouchEnd() {
      if (!isDragging.current) return
      handlersRef.current.dragEnd()
    }

    overlay.addEventListener('touchstart', onTouchStart, { passive: true })
    overlay.addEventListener('touchmove', onTouchMove, { passive: false })
    overlay.addEventListener('touchend', onTouchEnd, { passive: true })

    // Catch moves/releases that leave the overlay element
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      overlay.removeEventListener('touchstart', onTouchStart)
      overlay.removeEventListener('touchmove', onTouchMove)
      overlay.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [!!photo])

  // ===================== Keyboard =====================

  const handleEscape = useCallback(() => {
    onCloseRef.current()
  }, [])

  useKeyboard({
    onEscape: handleEscape,
    onArrowLeft: onPrevious,
    onArrowRight: onNext,
    enabled: photo !== null,
  })

  // ===================== Render =====================

  if (!photo) return null

  const currentIndex = photo.id - 1
  const caption = photo.caption

  // --- Mouse event handlers (document-level, no passive issue) ---

  function onMouseDown(e: React.MouseEvent) {
    if (e.target !== imageRef.current) return
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)

    function onMouseMove(ev: MouseEvent) {
      handleDragMove(ev.clientX, ev.clientY)
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      handleDragEnd()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      onCloseRef.current()
    }
  }

  function handleClose() {
    if (!overlayRef.current || !contentRef.current) return
    // Reset any overlay dimming that may have been set during a swipe gesture
    resetOverlayProps()
    timelineRef.current?.kill()
    timelineRef.current = animateLightboxClose(
      overlayRef.current,
      contentRef.current,
      onCloseRef.current,
    )
  }

  return (
    <div
      className="lightbox"
      ref={overlayRef}
      onClick={onOverlayClick}
      role="dialog"
      aria-label={`Photo preview: ${caption}`}
      aria-modal="true"
    >
      <div className="lightbox__content" ref={contentRef}>
        {/* Close button */}
        <button
          className="lightbox__close"
          onClick={handleClose}
          aria-label="Close preview"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Previous button */}
        <button
          className="lightbox__nav lightbox__nav--prev"
          onClick={onPrevious}
          aria-label="Previous photo"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Image card — liquid glass frame with Polaroid caption */}
        <div className="lightbox__card" ref={cardRef}>
          <div className="lightbox__card-image-wrapper">
            <img
              ref={imageRef}
              className="lightbox__card-image"
              src={photo.src}
              alt={caption}
              draggable={false}
              onMouseDown={onMouseDown}
            />
          </div>
          <div className="lightbox__card-caption">
            <span className="lightbox__card-caption-text">{caption}</span>
          </div>
        </div>

        {/* Next button */}
        <button
          className="lightbox__nav lightbox__nav--next"
          onClick={onNext}
          aria-label="Next photo"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Counter */}
        <div className="lightbox__info">
          <span className="lightbox__counter">
            {currentIndex + 1} / {totalPhotos}
          </span>
        </div>
      </div>
    </div>
  )
}
