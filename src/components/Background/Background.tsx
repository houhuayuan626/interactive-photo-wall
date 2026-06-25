/**
 * Background — iOS 26 gradient wallpaper.
 *
 * Three layered purple-violet glow zones (lavender top-left, violet bottom-right,
 * lilac center) that drift and pulse independently over a deep indigo base gradient.
 *
 * Purely decorative — `aria-hidden="true"` and no interactive or semantic role.
 *
 * Performance:
 *  - All animations on transform/opacity only — GPU composited.
 *  - No blur filters on glow layers (uses opacity + radial gradients).
 *  - No JS-driven animation loop; entirely CSS driven.
 */

import { memo } from 'react'
import './Background.css'

function Background() {
  return (
    <div className="background" aria-hidden="true">
      {/* ── Lavender-purple glow — top-left ── */}
      <div className="background__warm" />

      {/* ── Violet-indigo glow — bottom-right ── */}
      <div className="background__cool" />

      {/* ── Lilac ambient glow — center ── */}
      <div className="background__center" />

      {/* ── Vignette (dark edges for focus) ── */}
      <div className="background__vignette" />

      {/* ── Film grain / noise texture ── */}
      <div className="background__noise" />
    </div>
  )
}

export default memo(Background)
