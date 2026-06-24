/**
 * PhotoGrid — responsive grid container for PhotoCard components.
 *
 * Renders a collection of photos with deterministic scatter layout.
 * Handles responsive column counts (5→3→2→1) and empty state.
 *
 * On mount, orchestrates a GSAP stagger-reveal animation across all cards
 * (fade‑in + slide‑up). The grid ref is used to query `.photo-card`
 * elements so cards don't need forwarded refs.
 *
 * Pure layout component — no preview/lightbox state management.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { Photo } from '../../types/photo.ts'
import { PhotoCard } from '../PhotoCard/PhotoCard.tsx'
import { animateGridEnter } from '../../animations/cardAnimations.ts'
import { useCardDrag } from '../../hooks/useCardDrag.ts'
import './PhotoGrid.css'

export interface PhotoGridProps {
  /** The full collection of photos */
  readonly photos: readonly Photo[]

  /** Called when a photo card is clicked */
  readonly onPhotoClick?: (id: number) => void

  /** Whether to show captions on photo cards */
  readonly showCaptions?: boolean

  /** Additional CSS class names */
  readonly className?: string
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  showCaptions = true,
  className = '',
}: PhotoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  /**
   * Base positions — the accumulated user-applied offset from all completed
   * drags.  After each drag ends, the gesture's delta is ADDED to this base
   * (absorption) and the in-progress --user-x/y CSS var is reset to 0.
   * This keeps the card's total translate offset bounded in a single CSS
   * custom property and prevents iOS Safari compositor-layer hit-test
   * degradation after many drags.
   */
  const [basePositions, setBasePositions] = useState<Record<number, { x: number; y: number }>>({})

  const handleDragCommit = useCallback((id: number, offsetX: number, offsetY: number) => {
    setBasePositions(prev => ({
      ...prev,
      [id]: {
        x: (prev[id]?.x ?? 0) + offsetX,
        y: (prev[id]?.y ?? 0) + offsetY,
      },
    }))
  }, [])

  const { startDrag, startTouchDrag } = useCardDrag({ onCommit: handleDragCommit })

  // ── Stagger reveal on mount ──────────────────────────────────────────

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    // Only target direct PhotoCard children to avoid catching nested grids
    const cards: HTMLElement[] = []
    const cells = grid.querySelectorAll<HTMLElement>('.photo-grid__cell > .photo-card')
    cells.forEach((el) => cards.push(el))

    const tl = animateGridEnter(cards)
    return () => {
      tl.kill()
    }
  }, [])

  // ── Empty state ──────────────────────────────────────────────────────

  if (photos.length === 0) {
    return (
      <div className={`photo-grid photo-grid--empty ${className}`}>
        <p className="photo-grid__empty-text">
          No photos to display
        </p>
      </div>
    )
  }

  // ── Grid ─────────────────────────────────────────────────────────────

  return (
    <div ref={gridRef} className={`photo-grid ${className}`} role="list">
      {photos.map((photo) => {
        const base = basePositions[photo.id]
        return (
          <div key={photo.id} className="photo-grid__cell" role="listitem">
            <PhotoCard
              photo={photo}
              onClick={onPhotoClick}
              showCaption={showCaptions}
              baseOffsetX={base?.x ?? 0}
              baseOffsetY={base?.y ?? 0}
              onDragStart={startDrag}
              onTouchDragStart={startTouchDrag}
            />
          </div>
        )
      })}
    </div>
  )
}
