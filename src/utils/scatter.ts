/**
 * Deterministic scatter utility.
 *
 * Generates rotation and offset values for each photo based on its ID.
 * Layout is identical on every refresh — no Math.random() is used.
 *
 * Range: rotation ±15°, offset ±150 px — cards overlap in a dense
 * "scattered on a desk" arrangement that fits most screens without scroll.
 */

export interface ScatterValues {
  readonly rotation: number
  readonly offsetX: number
  readonly offsetY: number
}

/**
 * Deterministic pseudo-random number in [0, 1).
 * Based on sinusoidal hashing — same seed always produces the same result.
 */
function deterministicFloat(seed: number): number {
  const value = Math.sin(seed * 9301 + 49297) * 233280
  return value - Math.floor(value)
}

/**
 * Returns deterministic scatter values for a given photo ID.
 *
 * - rotation:  -15° ~ +15°
 * - offsetX:   -150px ~ +150px
 * - offsetY:   -150px ~ +150px
 *
 * The large offset range creates heavy card-to-card overlap that
 * mimics the look of physical photos scattered on a desk.
 * On mobile the values are scaled down via --scatter-scale CSS var.
 */
export function getPhotoScatter(id: number): ScatterValues {
  const rotation = (deterministicFloat(id * 7 + 1) - 0.5) * 30
  const offsetX = (deterministicFloat(id * 13 + 3) - 0.5) * 300
  const offsetY = (deterministicFloat(id * 17 + 5) - 0.5) * 300

  return { rotation, offsetX, offsetY }
}
