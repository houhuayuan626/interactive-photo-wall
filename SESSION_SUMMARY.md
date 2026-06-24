# Session Summary — Interactive Photo Wall

## Mobile UX Review ✅

### Summary

Reviewed the mobile experience at 390 px (iPhone) and 768 px (iPad). Found and fixed 4 issues — one critical (page couldn't scroll on mobile), three cosmetic/performance.

### Issues Found & Fixed

#### 🔴 Critical — Page couldn't scroll on mobile (touch hijacking)

| Aspect | Before | After |
|--------|--------|-------|
| `touch-action` | `none` on every `.photo-card` — browser wouldn't initiate scroll from a card | `pan-y` — browser handles vertical scroll, our JS handles horizontal drag |
| Drag claim timing | `startTouchDrag` set `isDragging = true` immediately on touchstart; first `touchmove` unconditionally called `preventDefault()` | `isDragging` starts `false`; a **12 px horizontal threshold** with axis-lock decides whether the gesture is scroll or drag |
| Scroll behaviour | Any touch on a card hijacked the gesture — page couldn't scroll | Vertical movement stays below the horizontal threshold → never enters drag mode → browser scrolls naturally |
| Drag initiation | Immediate | Only after horizontal movement > 12 px AND horizontal > vertical (axis lock) |

**How the axis lock works:**

| User action | Detection | Result |
|---|---|---|
| Finger moves vertically | `dy` > 12 px, `dy` ≥ `dx` | Axis locked to `'v'` → touchmove listener removed, browser scrolls normally |
| Finger moves horizontally | `dx` > 12 px, `dx` ≥ `dy` | Axis locked to `'h'` → `isDragging = true`, drag begins, scroll prevented |
| Finger moves diagonally | First axis past 12 px decides lock | Once locked, the other axis is ignored |

**Modified files:**
- `src/components/PhotoCard/PhotoCard.css` — `touch-action: none` → `touch-action: pan-y`
- `src/hooks/useCardDrag.ts` — `startTouchDrag` rewritten with deferred claim + axis lock

---

#### 🟠 Medium — Nav buttons hidden at 390 px

| Aspect | Before | After |
|--------|--------|-------|
| `< 480 px` | `.lightbox__nav { display: none }` — no visible prev/next | Buttons always visible, sized at `44 px` (Apple HIG minimum touch target) |
| `< 768 px` | Nav and close buttons at `36 px` — below recommended target | All touch targets bumped to `44 px` |
| Close button `< 480 px` | `36 × 36 px` | `44 × 44 px` with tighter positioning |

**Modified:** `src/components/Lightbox/Lightbox.css` — removed `display: none`, bumped all touchable button sizes to 44 px at both breakpoints.

---

#### 🟡 Low — Background GPU load on mobile

| Aspect | Desktop / Tablet | Phone (< 480 px) |
|--------|-----------------|------------------|
| Blob blur | `80 px` | `30 px` |
| Blob count | 5 | 3 (blob‑3 and blob‑4 hidden) |
| Blob sizes | 600 / 420 / 360 / 280 / 500 px | 200 / 160 / 0 / 0 / 180 px — ~⅓ of desktop |
| Particle glow | Dual-layer box-shadow | Removed entirely |
| Particle opacity | `0.15–0.6` per dot | Capped at `0.3` |

**Modified:** `src/components/Background/Background.css`, `src/components/FloatingParticles/FloatingParticles.css` — added mobile / tablet media queries.

---

#### 🟡 Low — Scatter offset too large on small cards

| Aspect | Before | After |
|--------|--------|-------|
| Scatter range | ±15 px / ±6° regardless of screen size | Full range on desktop, scaled proportionally on mobile |
| Scale factor | — | 0.6 on tablet, 0.4 on phone |
| Effective on 390 px | ±15 px offset, ±6° rotation (= 9 % of card width) | ±6 px offset, ±2.4° rotation (= 3.6 % of card width) |
| Caption text | 12 px, 2-line clamp | 11 px, 1-line clamp on < 480 px |

**Modified:** `src/components/PhotoCard/PhotoCard.css` — added `--scatter-scale` variable with responsive overrides.

### Build Output

- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: **14.17 KB CSS** / **280.19 KB JS** (+1.15 KB CSS from mobile media queries).
- Gzipped: **3.76 KB CSS** / **94.13 KB JS**.

---

## Phase 7B — Touch Drag Support ✅

### Summary

Extended the card drag system to support touch input on iOS and Android. The hook now exposes `startTouchDrag` alongside `startDrag`, sharing the same offset state and commit pipeline while using native (non-React) touch events to ensure reliable scroll prevention.

### Architecture

```
  touchstart (native, passive)
       │
       ▼
  startTouchDrag(id, el, clientX, clientY)
       │
       ├── sets touchGuardRef = true  (blocks synthetic mouse events)
       │
       ▼
  document.addEventListener('touchmove',  { passive: false })
  document.addEventListener('touchend',   { passive: true  })
       │
   ┌───┴───┐
   ▼       ▼
touchmove  touchend
   │          │
   ▼          ▼
preventDefault  remove listeners
applyMove(dx,dy)  endDrag()
dataset.dragged    touchGuardRef = false  (after 300 ms)
```

### Modified Files

**`src/hooks/useCardDrag.ts`**

| Change | Detail |
|---|---|
| **`startTouchDrag`** | New public method — mirrors `startDrag` but attaches `document`-level `touchmove` / `touchend` listeners. The `touchmove` listener uses `{ passive: false }` and calls `ev.preventDefault()` so the browser waits for the handler before deciding to scroll |
| **`touchGuardRef`** | A boolean ref set `true` on touchstart and cleared 300 ms after touchend. The mouse `startDrag` checks this guard — if a touch gesture just finished (or is still active), synthetic mousedown events are silently dropped |
| **`applyMove(dx, dy)`** | Extracted from the mouse-only inline closure so both mouse and touch paths share the same CSS custom-property write and drag‑flag logic |
| **`endDrag()`** | Extracted cleanup logic shared by both `onMouseUp` and `onTouchEnd` — removes listeners, calls commit callback, clears dataset via `setTimeout(0)` |
| **Dual-input guard** | `startDrag` checks `touchGuardRef.current`; `startTouchDrag` checks `dragRef.current.isDragging` — the two paths never conflict |

**`src/components/PhotoCard/PhotoCard.tsx`**

| Change | Detail |
|---|---|
| **`onTouchDragStart` prop** | Receives `startTouchDrag` from the hook via PhotoGrid |
| **`onTouchDragStartRef`** | Ref that stays in sync with the prop — the native touchstart effect only depends on `[id]`, so the listener is never re‑attached |
| **`useEffect` touchstart** | Attaches a **native** `touchstart` listener on the card element (`{ passive: true }` — no `preventDefault` needed here). On touchstart it calls `onTouchDragStartRef.current` with the photo `id`, the DOM element, and touch coordinates |

**`src/components/PhotoGrid/PhotoGrid.tsx`**

| Change | Detail |
|---|---|
| **`startTouchDrag`** | Destructured from `useCardDrag` return value and passed to every `PhotoCard` as `onTouchDragStart` |

**`src/components/PhotoCard/PhotoCard.css`**

| Change | Detail |
|---|---|
| **`touch-action: none`** | Added before `will-change: transform`. Tells the browser not to interpret any touch gestures (scroll, pinch-zoom, double-tap zoom) on the card — the app handles all touch input |

### Scroll Prevention Strategy (defence in depth)

| Layer | Mechanism | When active |
|---|---|---|
| CSS | `touch-action: none` on `.photo-card` | Always — browser won't initiate scroll from the card element |
| JS listener | `touchmove` attached with `{ passive: false }` → `preventDefault()` | During active drag only — document level catches moves that leave the card |
| JS guard | `touchGuardRef` blocks synthetic mouse events for 300 ms after touch end | Prevents redundant `mousedown`-initiated drag from firing after a touch gesture completes |

### iOS / Android Compatibility

- **iOS Safari**: Uses native `touchstart` (not React synthetic) — bypasses Safari's passive-by-default touch behaviour. The `{ passive: false }` touchmove handler reliably prevents scroll during drag. Synthetic `mousedown` events after touch are suppressed by `touchGuardRef`.
- **Android Chrome**: `touch-action: none` prevents Chrome's gesture recognition from intercepting the drag. The `{ passive: false }` touchmove listener works identically to desktop mouse drag.

### Build Output

- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: **13.02 KB CSS** / **279.67 KB JS** (+0.02 KB CSS / +1.41 KB JS from touch guard refactoring).
- Gzipped: **3.60 KB CSS** / **93.97 KB JS**.

---

## Phase 7A — Draggable Photo Cards (Desktop) ✅

### Summary

Added desktop mouse-drag support to photo cards. Users can freely reposition cards by dragging — the position persists and integrates with the existing scatter layout + GSAP hover animations.

### Architecture

The drag system follows the same pattern as the lightbox drag:

```
mousedown ──► useCardDrag.startDrag(id, el, clientX, clientY)
                  │
                  ▼
             attach document-level mousemove / mouseup listeners
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
      mousemove  mouseup   (unload)
          │        │
          ▼        ▼
     setProperty  remove listeners
     (--user-x)   commit offset via callback
     (--user-y)   setTimeout clear dataset
```

### New File

**`src/hooks/useCardDrag.ts`** — Ref‑based drag lifecycle hook:

| Feature | Detail |
|---|---|
| **Zero re-render during drag** | All drag state stored in a `useRef` — no `setState` calls during mousemove |
| **Direct DOM updates** | During drag, writes to CSS custom properties `--user-x` / `--user-y` via `el.style.setProperty()` — style recalc only, no layout/paint |
| **Accumulating offsets** | Reads current `--user-*` values on `startDrag` so each drag session adds to, not replaces, the existing offset |
| **Drag‑vs‑click** | Sets `el.dataset.dragged` when movement exceeds 5 px threshold; clears via `setTimeout(0)` after `mouseup` so the subsequent `click` event can detect the drag and skip opening the lightbox |
| **Ref‑based callback** | `onCommitRef` updated every render so native listeners always invoke the latest callback without re‑attaching |
| **Desktop only** | No touch handlers — Phase 7A scope is mouse only |

### Modified Files

**`src/components/PhotoCard/PhotoCard.css`**

| Change | Detail |
|---|---|
| `--user-x` / `--user-y` | Added two new CSS custom properties (default `0px`) composited into the transform stack |
| `translate` → `translate3d` | Switched to `translate3d()` per spec requirement — avoids GPU‑promotion issues on some hardware |
| `cursor: grab` | Card now shows a grab cursor, changing to `grabbing` on `:active` — clear drag affordance |
| Transform formula | `translate3d(calc(scatter-x + user-x), calc(scatter-y + gsap-y + user-y), 0) rotate(...) scale(...)` — user offset adds to scatter, GSAP hover (gsap-y) is untouched |

**`src/components/PhotoCard/PhotoCard.tsx`**

| Change | Detail |
|---|---|
| `userOffsetX` / `userOffsetY` props | Receive persisted user offset from PhotoGrid; rendered as `--user-x` / `--user-y` CSS vars |
| `onDragStart` prop | Connects to `useCardDrag.startDrag`, called from a new `onMouseDown` handler |
| `handleClick` | Overridden to check `el.dataset.dragged` — suppresses lightbox open after a real drag |
| `handleMouseDown` | New handler for primary button only, calls `onDragStart` with the card DOM element |

**`src/components/PhotoGrid/PhotoGrid.tsx`**

| Change | Detail |
|---|---|
| `userOffsets` state | `Record<number, {x, y}>` — updated only on drag end via `handleDragCommit` |
| `useCardDrag` hook | Instantiated at grid level, `startDrag` passed to each `PhotoCard` |
| Offset per card | `userOffsets[photo.id]` looked up in render and spread as props — non‑dragged cards keep their existing offset |

### Performance

- **GPU‑composited**: dragg only writes to properties that composite (`transform` via `translate3d`) — no layout or paint triggered during drag.
- **No React overhead**: CSS custom property mutations via `style.setProperty` bypass React's reconciliation entirely.
- **One re-render on drag end**: PhotoGrid state updates once per drag (not per frame). With React.memo‑like prop stability (16 cards), only the dragged card's props change.
- **GSAP compatibility**: `--user-x`/`--user-y` are independent CSS vars from `--gsap-y`/`--gsap-scale` — hover animations continue working during and after drag.

### Build Output

- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: **13.00 KB CSS** / **278.26 KB JS** (+0.11 KB CSS / +1.47 KB JS from new hook and CSS variables).
- Gzipped: **3.60 KB CSS** / **93.72 KB JS**.

### Future (Phase 7B)

- Touch / mobile drag support
- Drag threshold visual feedback
- Z‑index elevation during drag
- Snap‑to‑grid optional mode

---

## Phase 8 — Polish UI ✅

### Summary

Refined every visual surface with premium design tokens and effects inspired by Apple, Linear, and Pinterest — consistent token usage, richer gradients, enhanced glow effects, refined backgrounds, and improved animation timing.

### Token Overhaul (`src/index.css`)

| Token group | Detail |
|---|---|
| **Border-radius** | Added `--radius-sm` (6px) through `--radius-xl` (16px), plus `--radius-full` (50%) — Apple‑inspired consistent roundness |
| **Shadows** | Added `--shadow-ui-hover` (elevated button state). Updated `--shadow-card` to include subtle 1‑px edge highlight. Enhanced `--shadow-card-hover` accent ring to 0.12 alpha. Increased `--shadow-image` glow to 80px spread at 0.1 alpha |
| **Gradients** | Added `--gradient-accent-strong` (deeper purple/pink). Added `--gradient-glass-strong` (denser glass). Added `--gradient-overlay-strong` (richer fade). Tightened `--gradient-vignette` from 40%→35% start with 0.6 alpha (deeper edge darkening) |
| **Accent** | Added `--accent-deep` (#7c3aed) and `--accent-glow-warm` (pink‑tinted glow at 0.2) |
| **Glass** | Enhanced `--glass-border-accent` to 0.25 alpha. Added `--glass-bg-light` (4% white) and `--glass-border-accent-strong` (0.4 alpha) for richer frosted effects |

### Component‑by‑Component Polish

**`src/components/PhotoCard/PhotoCard.css`**

| Change | Detail |
|---|---|
| **border-radius** | Now uses `var(--radius-lg)` token instead of hardcoded `12px` |
| **Base shadow** | Uses `var(--shadow-card)` token — the token itself now includes the subtle edge highlight |
| **Focus‑visible** | Replaced hardcoded glow with `var(--accent-glow)` token |
| **Image overlay** | Uses `var(--gradient-overlay)` token; transition eased to 0.4s |
| **Image hover** | Added `transform: scale(1.02)` for subtle inner‑zoom; extended transition to 0.4s covering both filter and transform |
| **Caption** | Now uses `var(--glass-bg-light)` and `var(--glass-border)` tokens instead of raw `rgba()` values |

**`src/components/PhotoGrid/PhotoGrid.css`** — Unchanged (already using tokens).

**`src/components/Lightbox/Lightbox.css`**

| Change | Detail |
|---|---|
| **Backdrop gradient** | Upgraded to dual‑layer: purple ellipse (0.08 alpha) at 50% 40% + pink ellipse (0.04 alpha) at 30% 60% — richer depth without overpowering |
| **Image glow** | Expanded to dual‑layer: purple (0.12 alpha) + pink (0.06 alpha) at 80% width/height — more visible accent aura |
| **Image shadow** | Uses `var(--shadow-image)` token — enhanced glow spread |
| **Button hover** | Uses `var(--shadow-ui-hover)` token with `--glass-border-accent` border — consistent elevated state |
| **Button border‑radius** | Uses `var(--radius-full)` token |
| **Info bar** | Uses `var(--radius-lg)` token, `var(--glass-border-accent)` with 0.25 alpha |

**`src/components/Background/Background.css`**

| Change | Detail |
|---|---|
| **Breathing** | Extended to 10s (was 8s), increased scale to 1.03 (was 1.025) — more dramatic |
| **Aurora saturation** | Purple 0.22→0.25, pink 0.14→0.16, cyan 0.12→0.14 — richer color presence. Extended drift durations 2s longer each |
| **Blob saturation** | Purple 0.12→0.14, pink 0.1→0.12, cyan 0.08→0.1, indigo 0.1→0.12 (size 260→280px), amber 0.06→0.08 — all blobs more visible |
| **Reduced motion** | Aurora fallback opacity 0.5→0.6; noise texture opacity 0.025→0.04 |

**`src/components/FloatingParticles/FloatingParticles.css`**

| Change | Detail |
|---|---|
| **Dot background** | 0.5→0.55 for slightly brighter base |
| **Glow shadow** | Dual‑layer: `0 0 8px 2px rgba(255,255,255,0.25)` + `0 0 20px 4px rgba(192,132,252,0.08)` — Apple‑style light bloom |

**`src/animations/cardAnimations.ts`**

| Change | Detail |
|---|---|
| **Hover shadow** | Accent ring alpha 0.1→0.12 to match token `--shadow-card-hover`. Duration 0.35→0.4s |
| **Rest shadow** | Duration 0.4→0.45s for smoother return |

**`src/animations/lightboxAnimations.ts`**

| Change | Detail |
|---|---|
| **Entry blur** | 6px→8px for more dramatic blur‑out; duration 0.45→0.5s |
| **Exit blur** | 6px→8px for symmetrical dissolve; duration 0.25→0.3s |

### Key principle

All component CSS now references `:root` design tokens instead of hardcoded values — changing one token in `index.css` propagates globally. GSAP animation shadows remain hardcoded (GSAP can't read CSS custom properties for `boxShadow`) but are kept in sync with token values.

### Build Output

- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: **12.89 KB CSS** / **276.79 KB JS** — negligible increase from enhanced tokens and effects.
- Gzipped: **3.57 KB CSS** / **92.80 KB JS**.

---

## Phase 7 — Draggable Preview Image ✅

### Summary

Added drag-gesture support to the lightbox preview image, working identically on desktop and mobile.

### Implementation

**Lightbox.tsx** — full rewrite of the drag subsystem:

| Feature | Detail | Lines |
|---|---|---|
| **Mouse drag** | `onMouseDown` on the image sets up document-level `mousemove` / `mouseup` listeners so dragging is smooth even when the cursor leaves the element | `168-185` |
| **Touch drag** | Native (non-React) `touchstart` / `touchmove` / `touchend` listeners attached via `useEffect` with `{ passive: false }` for `touchmove` — this is required because React synthetic touch events are passive by default and silently ignore `preventDefault()`, making scroll prevention impossible | `109-148` |
| **Scroll prevention** | Non-passive `touchmove` listener calls `e.preventDefault()` during drag; this works reliably because the `{ passive: false }` option tells the browser not to ignore `preventDefault`. Document-level listeners also catch moves that leave the image element | `124-130` |
| **Visual feedback** | During drag the image slightly scales down (`1 - progress * 0.06`) and rotates (`offsetX * 0.02°`) for a tactile "pulled" feel | `71-78` |
| **Threshold-based navigation** | Dragging past 80 px horizontally triggers a snap-out animation (x: ±250, opacity: 0, scale: 0.92) then `onNext` / `onPrevious` | `82-105` |
| **Smooth return** | Below threshold, a `back.out(1.7)` spring eases the image back to rest (x: 0, y: 0, scale: 1, rotation: 0) over 0.65 s — the slight overshoot creates a physical "rubber-band" feel | `107-115` |
| **Stale-transform fix** | The open-effect `useEffect` now calls `gsap.set(imageRef.current, { clearProps: 'all' })` before the entry animation. Without this, a snap-out animation (which sets x: 250, opacity: 0 on the image) would leave those transforms in place when the next photo loads, making the new image invisible until the next render | `138-143` |
| **Ref-based callbacks** | `onCloseRef` / `onNextRef` / `onPreviousRef` are updated every render so native touch listeners (which are set up once with `useEffect([], [])`) always invoke the latest navigation callbacks without re-attaching | `49-52` |
| **Touch handlers removed from JSX** | The old `onTouchStart` / `onTouchMove` / `onTouchEnd` React props on the `<img>` element were removed because their `preventDefault()` calls were silently failing in React's passive event system | `192-194` |

### Cross-browser / mobile notes

- **`touch-action: none`** on the image's CSS (already present) prevents the browser's default touch gestures (scroll, zoom) on the element itself.
- **Document-level touch listeners** mirror what the mouse handlers already do — they ensure the gesture is tracked even when the user's finger moves off the image.
- **GSAP `clearProps`** is used instead of manual reset because it clears every inline style GSAP may have set (transform, opacity, etc.) in a single call, without touching HTML attributes like `src` or `alt`.

### Build Output

- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: 9.02 KB CSS, 274.64 KB JS (gzipped: 2.59 KB / 92.04 KB) — JS reduced slightly because React touch event props were removed from JSX.

---

## Phase 6 — Lightbox Features Verified ✅

### Review

All lightbox features have been verified working:

| Feature | How | File |
|---|---|---|
| **Open image** | Click any photo card → `App.handlePhotoClick` converts 1‑based ID to 0‑based index → `useLightbox().openLightbox(index)` | `App.tsx:35` |
| **Close image** | Close button (`lightbox__close`) → `animateLightboxClose` → `closeLightbox()`; also overlay‑click‑to‑close | `Lightbox.tsx:207-215` |
| **Next image** | Next nav button → `onNext` → `nextPhoto(totalCount)` — wraps modularly | `Lightbox.tsx:268-276` |
| **Previous image** | Prev nav button → `onPrevious` → `previousPhoto(totalCount)` — wraps modularly | `Lightbox.tsx:241-250` |
| **ESC close** | `useKeyboard` listens for `Escape` on `document` → `onClose` | `useKeyboard.ts:29-31` |
| **Keyboard navigation** | `ArrowLeft` → `onPrevious`, `ArrowRight` → `onNext`; `preventDefault` stops scroll | `useKeyboard.ts:32-38` |
| **Caption below image** | Caption + counter rendered in `.lightbox__info` bar below the image container | `Lightbox.tsx:280-285` |

### Build Output
- TypeScript (`tsc --noEmit`): 0 errors.
- Vite production build: 9.02 KB CSS, 275.42 KB JS (gzipped: 2.59 KB / 92.54 KB) — unchanged from Phase 5.

---

## Phase 5 — GSAP Card Interactions ✅

### New File

**`src/animations/cardAnimations.ts`** — GSAP animation utilities for card-level interactions:

- **`animateGridEnter(cards, onComplete?)`** — Staggered fade‑in + slide‑up for every `.photo-card` element in the grid. Cards start at `opacity: 0`, `--gsap-y: 36px`, `--gsap-scale: 0.95` and animate to rest over 0.6 s with a `power3.out` ease. Stagger order is randomized (`from: 'random'`, 45 ms between cards) for an organic feel.
- **`animateCardHoverIn(el)`** — On hover/focus: lifts the card 8 px (`--gsap-y: -8px`), scales to 1.04×, deepens the shadow. Duration 0.35 s, `power2.out`.
- **`animateCardHoverOut(el)`** — Returns the card to rest: `--gsap-y: 0px`, `scale: 1`, base shadow. Duration 0.4 s, `power2.out`.
- **Reduced‑motion guard** — All functions check `prefers-reduced-motion: reduce` at first call (cached). When active, stagger resolves instantly (`.set()`) and hover tweens return a no‑op timeline.

### Updated Components

**PhotoCard** (`src/components/PhotoCard/PhotoCard.tsx`)
- Added `useRef<HTMLDivElement>` for the card element.
- `onMouseEnter` / `onMouseLeave` call `animateCardHoverIn` / `animateCardHoverOut`.
- `onFocus` / `onBlur` parity: keyboard‑focused cards get the same lift treatment as hovered ones.
- All four handlers are `useCallback`-memoized (no re‑creates on re‑render).

**PhotoCard.css** (`src/components/PhotoCard/PhotoCard.css`)
- Added composable CSS custom properties `--gsap-y` and `--gsap-scale` which are merged into the transform stack:
  ```
  translate(scatter-x, scatter-y + gsap-y)
  rotate(scatter-rotate)
  scale(gsap-scale)
  ```
- **Removed** the `:hover` block (scale, lift, shadow) — GSAP now owns all motion.
- **Removed** the `transition` property — GSAP handles timing.
- Added `opacity: 0` as the initial state (GSAP reveals cards via stagger).
- Added `will-change: transform` for compositor‑layer promotion.
- Kept `:hover .photo-card__image { filter: brightness(1.08) }` — CSS is fine for a child‑only filter effect.

**PhotoGrid** (`src/components/PhotoGrid/PhotoGrid.tsx`)
- Added `useRef<HTMLDivElement>` on the grid container.
- `useEffect` on mount queries `.photo-grid__cell > .photo-card` elements and passes them to `animateGridEnter`.
- Returns `tl.kill()` in the cleanup function for Strict‑mode safety.

### Build Output
- TypeScript (`tsc --noEmit`): 0 errors.
- ESLint: 0 errors, 0 warnings.
- Vite production build: 9.02 KB CSS, 275.42 KB JS (gzipped: 2.59 KB / 92.54 KB).

---

## Phase 4 — Cinematic Background & Floating Particles ✅

### Components Created

**Background** (`src/components/Background/`)
- Three aurora gradient layers (purple/violet, pink/rose, cyan/blue) with staggered position-shift and opacity-pulse animations for depth.
- Five colorful blur circles ("blobs") — purple, pink, cyan, indigo, amber — each with independent float keyframes.
- Container-level breathing animation (1 → 1.025 → 1 over 8 s).
- `will-change: transform` on animated layers only; no `will-change` on container to avoid layer explosion.
- `prefers-reduced-motion: reduce` support — disables all animation.
- Fixed position at `z-index: -1` behind content.

**FloatingParticles** (`src/components/FloatingParticles/`)
- 36 deterministic particles seeded via golden-angle formula — consistent across renders.
- One shared `@keyframes particleFloat` parameterised via CSS custom properties (`--duration`, `--delay`, `--drift`) set inline per particle.
- Particles float upward with horizontal drift, fading in/out at edges.
- No `will-change` to avoid 36 compositor layers.
- `z-index: -1` (above Background but behind content in source-order stacking).

### Integration
- Both components rendered as children of `<main className="app">` before PhotoGrid.
- `.app` has `position: relative` → creates stacking context.
  - Background + FloatingParticles at `z-index: -1` → below normal-flow content.
  - PhotoGrid + Lightbox (normal flow) → on top.

### Performance
- All animations on `transform` + `opacity` only (GPU composited).
- No JS-driven animation frames — fully CSS driven.
- 3 aurora layers + 5 blobs + 36 particles within budget.
- No layout-triggering properties animated (`width`, `height`, `inset`, `top`, `left`).

---

## Phase 1 — Project Scaffold ✅
- Vite + React + TypeScript project init.
- Dark cinematic theme (`src/index.css`).
- Photo data model + deterministic scatter offsets.

## Phase 2 — Photo Grid ✅
- Responsive grid: 5→3→2→1 columns.
- PhotoCard component with lazy loading + scatter offsets.
- Empty state handling.

## Phase 3 — Lightbox ✅
- Full-viewport lightbox overlay with navigation.
- Fade + scale entry animation.
- Keyboard navigation (← → ESC).
- Focus trap + body scroll lock.
