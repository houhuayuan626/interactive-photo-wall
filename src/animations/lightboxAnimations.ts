/**
 * Lightbox animation utilities.
 *
 * GSAP-driven entry/exit animations for the lightbox overlay and content.
 * Includes blur-in on entry and blur-out on exit for a premium feel.
 * Kept separate from component logic per architectural guidelines.
 */

import gsap from 'gsap'

/**
 * Animate the lightbox overlay entrance.
 * Fades in the backdrop with blur, scales + fades the content.
 */
export function animateLightboxOpen(
  overlay: HTMLElement,
  content: HTMLElement,
  onComplete?: () => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete })

  // Overlay fade + subtle scale (backdrop blur is in CSS)
  tl.fromTo(
    overlay,
    { opacity: 0 },
    { opacity: 1, duration: 0.35, ease: 'power2.out' },
  )

  // Content scale + fade + blur-out entrance — Apple-inspired clarity reveal
  tl.fromTo(
    content,
    { opacity: 0, scale: 0.92, y: 20, filter: 'blur(8px)' },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.5,
      ease: 'power3.out',
    },
    '-=0.25', // overlap with overlay fade
  )

  return tl
}

/**
 * Animate the lightbox exit.
 * Blurs + scales out the content, then fades the overlay.
 */
export function animateLightboxClose(
  overlay: HTMLElement,
  content: HTMLElement,
  onComplete?: () => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete })

  // Content blur-out + scale + fade — premium dissolve
  tl.to(content, {
    opacity: 0,
    scale: 0.92,
    y: -10,
    filter: 'blur(8px)',
    duration: 0.3,
    ease: 'power2.in',
  })

  // Overlay fade
  tl.to(overlay, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
  })

  return tl
}

/**
 * Animate image transition when navigating prev/next.
 * Flashes the image out and in.
 */
export function animateImageChange(
  image: HTMLElement,
  direction: 'left' | 'right',
  onComplete?: () => void,
): gsap.core.Timeline {
  const xFrom = direction === 'right' ? 60 : -60
  const tl = gsap.timeline({ onComplete })

  tl.set(image, { opacity: 0, x: xFrom })
  tl.to(image, {
    opacity: 1,
    x: 0,
    duration: 0.35,
    ease: 'power3.out',
  })

  return tl
}
