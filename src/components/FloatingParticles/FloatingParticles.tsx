/**
 * FloatingParticles — ambient particle layer.
 *
 * Renders a deterministic set of small dots that float upward with
 * horizontal drift. Purely decorative — `aria-hidden="true"`.
 *
 * Performance:
 *  - Particles are pre-computed once via `useMemo` — no per-frame JS.
 *  - Each particle uses a unique CSS custom-property seed for its
 *    animation (position, size, duration, delay, drift) so there is
 *    only ONE keyframe definition shared by all particles.
 *  - Animates only `transform` (translate + scale) — GPU composited.
 *  - `will-change` is NOT set on individual particles to avoid
 *    creating hundreds of compositor layers.
 */

import { useMemo } from 'react'
import './FloatingParticles.css'

/* ── Deterministic particle descriptor ── */

interface Particle {
  readonly id: number
  /** Horizontal position (vw unit) */
  readonly x: number
  /** Vertical start position (vh unit) */
  readonly y: number
  /** Particle diameter in px */
  readonly size: number
  /** Base opacity */
  readonly opacity: number
  /** Float-up duration in seconds */
  readonly duration: number
  /** Animation delay in seconds */
  readonly delay: number
  /** Horizontal drift offset in px */
  readonly drift: number
  /** Warm-toned HSL hue (amber 30–violet 280) */
  readonly hue: number
}

/* ── Seeded pseudo-random (golden-angle) ── */

const PARTICLE_COUNT = 36
const GOLDEN_ANGLE = 137.508

function buildParticles(): readonly Particle[] {
  const particles: Particle[] = []

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const seed = i * GOLDEN_ANGLE

    // Warm-toned hues across the amber → rose → violet spectrum
    const warmHues = [30, 35, 40, 340, 350, 10, 20, 280, 300, 320]
    particles.push({
      id: i,
      x: ((seed * 1.07) % 100),
      y: ((seed * 0.73 + 10) % 90),
      size: 2 + ((seed * 0.31) % 4),
      opacity: 0.15 + ((seed * 0.37) % 0.55),
      duration: 14 + ((seed * 0.67) % 22),
      delay: (seed * 0.53) % 18,
      drift: ((seed * 2.03) % 60) - 30,
      hue: warmHues[i % warmHues.length] + ((seed * 3) % 15),
    })
  }

  return particles
}

/* ── Component ── */

function FloatingParticles() {
  const particles = useMemo(() => buildParticles(), [])

  return (
    <div className="floating-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="floating-particles__dot"
          style={
            {
              left: `${p.x}vw`,
              top: `${p.y}vh`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              '--duration': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--drift': `${p.drift}px`,
              '--hue': p.hue,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

export default FloatingParticles
