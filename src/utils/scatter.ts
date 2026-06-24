/**
 * Deterministic scatter utility.
 *
 * Generates rotation and offset values for each photo based on its ID.
 * Layout is identical on every refresh — no Math.random() is used.
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
 * - rotation:  -6° ~ +6°
 * - offsetX:   -15px ~ +15px
 * - offsetY:   -15px ~ +15px
 */
export function getPhotoScatter(id: number): ScatterValues {
  const rotation = (deterministicFloat(id * 7 + 1) - 0.5) * 12
  const offsetX = (deterministicFloat(id * 13 + 3) - 0.5) * 30
  const offsetY = (deterministicFloat(id * 17 + 5) - 0.5) * 30

  return { rotation, offsetX, offsetY }
}
