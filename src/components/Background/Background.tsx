/**
 * Background — cinematic animated backdrop.
 *
 * Layers aurora gradients + colorful blur circles with a subtle breathing
 * animation. Purely decorative — `aria-hidden="true"` and no interactive
 * or semantic role.
 *
 * Performance:
 *  - All animations run on GPU-composited properties (transform, opacity).
 *  - `will-change` set only on animated layers to avoid layer explosion.
 *  - Blur circles use CSS `filter: blur()` — hardware accelerated on
 *    modern browsers when paired with transform.
 *  - No JS-driven animation loop; entirely CSS driven.
 */

import { memo } from 'react'
import './Background.css'

function Background() {
  return (
    <div className="background" aria-hidden="true">
      {/* ── Aurora gradient layers ── */}
      <div className="background__aurora background__aurora--1" />
      <div className="background__aurora background__aurora--2" />
      <div className="background__aurora background__aurora--3" />

      {/* ── Colorful blur circles ── */}
      <div className="background__blob background__blob--1" />
      <div className="background__blob background__blob--2" />
      <div className="background__blob background__blob--3" />
      <div className="background__blob background__blob--4" />
      <div className="background__blob background__blob--5" />

      {/* ── Vignette (dark edges for focus) ── */}
      <div className="background__vignette" />

      {/* ── Film grain / noise texture ── */}
      <div className="background__noise" />
    </div>
  )
}

export default memo(Background)
