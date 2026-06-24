/**
 * Card animation utilities.
 *
 * GSAP-driven entrance stagger and hover interactions for PhotoCard.
 * All functions respect `prefers-reduced-motion: reduce`.
 *
 * Uses composable CSS custom properties (--gsap-y, --gsap-scale) so GSAP
 * transform tweens don't fight with the scatter offset applied in CSS.
 *
 * Polish: premium layered shadows on hover with an accent glow ring.
 */

import gsap from 'gsap'

// ── Reduced‑motion guard ───────────────────────────────────────────────

/**
 * Check whether the user prefers reduced motion.
 * Cached after first call — the setting doesn't change mid‑session.
 */
let _reducedMotion: boolean | null = null

function prefersReducedMotion(): boolean {
  if (_reducedMotion === null) {
    _reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return _reducedMotion
}

// ── Staggered entrance ─────────────────────────────────────────────────

/**
 * Reveal a set of cards with a staggered fade‑in + slide‑up.
 *
 * @param cards  Array of card DOM elements (falsy values filtered out).
 * @param onComplete  Optional callback when the timeline finishes.
 * @returns The GSAP timeline (call `.kill()` to cancel).
 */
export function animateGridEnter(
  cards: (HTMLElement | null)[],
  onComplete?: () => void,
): gsap.core.Timeline {
  const valid = cards.filter((c): c is HTMLElement => c !== null)
  if (valid.length === 0) return gsap.timeline()

  const tl = gsap.timeline({ onComplete })

  if (prefersReducedMotion()) {
    // Show everything instantly — no animation.
    gsap.set(valid, { opacity: 1, '--gsap-y': '0px', '--gsap-scale': 1 })
    onComplete?.()
    return tl
  }

  // Set initial (hidden) state
  gsap.set(valid, { opacity: 0, '--gsap-y': '36px', '--gsap-scale': 0.95 })

  // Stagger reveal — natural random order
  tl.to(valid, {
    opacity: 1,
    '--gsap-y': '0px',
    '--gsap-scale': 1,
    duration: 0.6,
    stagger: {
      each: 0.045,
      from: 'random',
    },
    ease: 'power3.out',
  })

  return tl
}

// ── Hover (and keyboard focus) ─────────────────────────────────────────

/**
 * Animate a card on hover/focus enter — scale, lift, shadow.
 *
 * @param el  The `.photo-card` element.
 * @returns The GSAP tween.
 */
export function animateCardHoverIn(el: HTMLElement) {
  if (prefersReducedMotion()) return gsap.timeline()

  return gsap.to(el, {
    '--gsap-y': '-10px',
    '--gsap-scale': 1.04,
    // Liquid glass hover: deeper float, brighter inner rim, accent glow
    boxShadow:
      '0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2)',
    duration: 0.45,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

/**
 * Animate a card on hover/focus leave — return to rest.
 *
 * @param el  The `.photo-card` element.
 * @returns The GSAP tween.
 */
export function animateCardHoverOut(el: HTMLElement) {
  if (prefersReducedMotion()) return gsap.timeline()

  return gsap.to(el, {
    '--gsap-y': '0px',
    '--gsap-scale': 1,
    // Liquid glass resting: volumetric inner depth + ambient shadow
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)',
    duration: 0.5,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}
