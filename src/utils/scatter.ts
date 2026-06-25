/**
 * Random scatter utility.
 *
 * Generates rotation and offset values for each photo using Math.random().
 * Layout is different on every refresh — cards land in random positions.
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
 * Returns random scatter values for a given photo ID.
 *
 * - rotation:  -15° ~ +15°
 * - offsetX:   -150px ~ +150px
 * - offsetY:   -150px ~ +150px
 *
 * The large offset range creates heavy card-to-card overlap that
 * mimics the look of physical photos scattered on a desk.
 * On mobile the values are scaled down via --scatter-scale CSS var.
 */
export function getPhotoScatter(_id: number): ScatterValues {
  const rotation = (Math.random() - 0.5) * 30
  const offsetX = (Math.random() - 0.5) * 300
  const offsetY = (Math.random() - 0.5) * 300

  return { rotation, offsetX, offsetY }
}
