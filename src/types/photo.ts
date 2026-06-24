/**
 * Core type definitions for the Interactive Photo Wall.
 *
 * All values are readonly to enforce determinism and prevent accidental mutation.
 */

export interface Photo {
  /** Unique identifier, matches the image sequence number */
  readonly id: number

  /** Path to the image file under public/pic/ */
  readonly src: string

  /** Artistic caption displayed in the lightbox */
  readonly caption: string

  /** Rotation angle in degrees (-6 ~ +6) */
  readonly rotation: number

  /** Horizontal offset in pixels (-15 ~ +15) */
  readonly offsetX: number

  /** Vertical offset in pixels (-15 ~ +15) */
  readonly offsetY: number
}

export interface LightboxState {
  /** Whether the lightbox is currently open */
  readonly open: boolean

  /** Index of the currently selected photo, or null if closed */
  readonly selectedIndex: number | null
}
