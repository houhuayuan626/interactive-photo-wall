/**
 * Random scatter utility (viewport‑safe).
 *
 * Generates rotation and offset values for each photo using Math.random().
 * Layout is different on every refresh — cards land in random positions
 * that stay fully visible within the viewport on both desktop and mobile.
 *
 * Range: rotation ±12°, offset ±50 px — enough for visible card overlap
 * ("scattered on a desk") without pushing any card off‑screen.
 *
 * Mobile is handled via the --scatter-scale CSS var (0.3–0.5), which
 * proportionally reduces all values on smaller screens.
 */

export interface ScatterValues {
  readonly rotation: number
  readonly offsetX: number
  readonly offsetY: number
}

/**
 * Returns random scatter values for a given photo ID.
 *
 * - rotation:  -12° ~ +12°
 * - offsetX:   -50px ~ +50px
 * - offsetY:   -50px ~ +50px
 *
 * The reduced range (vs the original ±150px) ensures all cards stay
 * entirely within the viewport while still overlapping their neighbours
 * for the desired "scattered on a desk" aesthetic.
 */
export function getPhotoScatter(_id: number): ScatterValues {
  const rotation = (Math.random() - 0.5) * 24   // ±12°
  const offsetX = (Math.random() - 0.5) * 100    // ±50px
  const offsetY = (Math.random() - 0.5) * 100    // ±50px

  return { rotation, offsetX, offsetY }
}
