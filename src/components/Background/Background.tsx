/**
 * Background — iOS 26 gradient wallpaper.
 *
 * Three layered glow zones (warm top-left, cool bottom-right, center ambient)
 * that drift and pulse independently over a deep midnight base gradient.
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
      {/* ── Warm amber/rose glow — top-left ── */}
      <div className="background__warm" />

      {/* ── Cool blue/violet glow — bottom-right ── */}
      <div className="background__cool" />

      {/* ── Center ambient glow — ties warm and cool ── */}
      <div className="background__center" />

      {/* ── Vignette (dark edges for focus) ── */}
      <div className="background__vignette" />

      {/* ── Film grain / noise texture ── */}
      <div className="background__noise" />
    </div>
  )
}

export default memo(Background)
