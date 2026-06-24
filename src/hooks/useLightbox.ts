/**
 * useLightbox — lightbox state management hook.
 *
 * Manages the open/close state and selected index for the photo preview.
 * No UI logic — purely state.
 */

import { useState, useCallback } from 'react'

export interface UseLightboxReturn {
  /** Whether the lightbox is currently open */
  readonly open: boolean

  /** Index of the selected photo, or null when closed */
  readonly selectedIndex: number | null

  /** Open the lightbox at a specific photo index */
  readonly openLightbox: (index: number) => void

  /** Close the lightbox */
  readonly closeLightbox: () => void

  /** Navigate to the next photo (wraps to start) */
  readonly nextPhoto: (total: number) => void

  /** Navigate to the previous photo (wraps to end) */
  readonly previousPhoto: (total: number) => void
}

export function useLightbox(): UseLightboxReturn {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const open = selectedIndex !== null

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  const nextPhoto = useCallback((total: number) => {
    setSelectedIndex(prev => {
      if (prev === null) return null
      return (prev + 1) % total
    })
  }, [])

  const previousPhoto = useCallback((total: number) => {
    setSelectedIndex(prev => {
      if (prev === null) return null
      return (prev - 1 + total) % total
    })
  }, [])

  return {
    open,
    selectedIndex,
    openLightbox,
    closeLightbox,
    nextPhoto,
    previousPhoto,
  }
}
