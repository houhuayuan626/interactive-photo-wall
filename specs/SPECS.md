# A Beautiful Interactive Photo Wall

## Project Overview

Build a visually stunning and highly interactive photo wall application.

The project should feel premium, artistic, and modern.

Visual inspiration:

* Apple Event pages
* Apple Photos
* Linear
* Pinterest
* Cosmos
* Polaroid wall aesthetics

The application is entirely client-side and focuses on aesthetics, smooth interactions, and delightful user experience.

---

# Goals

Create a beautiful interactive photo gallery where:

* users can browse photos naturally;
* photos appear scattered like physical photos on a desk;
* every photo can be opened in a premium preview mode;
* images can be dragged by mouse and touch;
* animations feel smooth and elegant;
* the interface looks modern and cinematic.

---

# Non Goals

Do NOT implement:

* backend;
* database;
* login system;
* upload system;
* image editing;
* cloud storage;
* admin panel;
* unnecessary dependencies.

Keep the project lightweight and maintainable.

---

# Tech Stack

Framework:

* React
* TypeScript
* Vite

Animation:

* GSAP
* CSS animations

Styling:

* CSS modules or plain CSS
* modern CSS features

No Tailwind unless explicitly added later.

---
# Photo Captions

Every photo should have an interesting caption.

The caption should feel:

- warm;
- artistic;
- emotional;
- occasionally humorous;
- memorable.

The text should complement the image instead of describing obvious things.

Avoid:

- generic captions;
- repetitive sentences;
- meaningless text;
- overly long paragraphs.

Target length:

1~3 sentences.

Examples:

"Some moments are too beautiful to stay only in memory."

"Not every sunset needs an audience."

"This picture accidentally became one of my favorites."

Captions should create emotional atmosphere.

# Interactive Photo Position

Users can drag photo cards freely.

Supported platforms:

- Desktop mouse
- Mobile touch devices
- Tablets

Dragging should feel smooth and natural.

After dragging:

- photo remains at the new position;
- layout updates immediately;
- interactions stay responsive.

The default scatter layout acts only as the initial position.

User movement overrides default positions.

# AI Caption Rules

Whenever new photos are added:

Automatically generate captions.

Captions should:

- be unique;
- avoid repetition;
- match the mood of the image;
- feel human-written;
- sound natural.

Do not use placeholder text.

Do not generate identical patterns.

Prefer cinematic and storytelling styles.

# Asset Structure

All images are static assets.

Directory:

public/

pic/

001.jpg

002.jpg

003.jpg

...

Images are manually placed by the user.

No runtime upload.

No API requests.

No image metadata files.

---

# Photo Naming Convention

Images are sequential.

Examples:

001.jpg

002.jpg

003.jpg

004.jpg

...

The application should automatically generate image paths.

Avoid hardcoding every image manually.

---

# Layout Philosophy

The gallery should NOT look like a boring grid.

Instead:

* slightly rotated cards;
* scattered composition;
* magazine feeling;
* scrapbook style;
* physical photo wall feeling.

The layout must be deterministic.

Never use:

Math.random()

Every refresh should produce the same result.

---

# Responsive Design

Desktop:

* 5 to 6 columns.

Tablet:

* 3 columns.

Mobile:

* 2 columns.

The layout should adapt smoothly.

No horizontal scrolling.

---

# Visual Style

Main theme:

Dark cinematic background.

Use:

* soft gradients;
* glassmorphism;
* blur effects;
* colorful lighting;
* ambient glow;
* premium shadows.

Avoid:

* excessive neon;
* overly saturated colors;
* noisy effects.

Everything should feel elegant.

---

# Background Effects

Background should include:

### Aurora lights

Large blurred colorful areas.

### Floating particles

Slow movement.

### Breathing animation

Subtle scale changes.

### Ambient gradients

Smooth transitions.

Performance must remain good.

---

# Photo Card Design

Every card should have:

* rounded corners;
* shadow;
* border highlight;
* smooth hover effect;
* slight rotation;
* premium appearance.

Optional:

* Polaroid style caption area.

---

# Hover Interaction

On hover:

* lift upward;
* slightly scale up;
* enhance shadow;
* increase brightness.

Animations should feel soft.

Avoid aggressive motion.

---

# Page Entry Animation

When the application loads:

1. background appears;
2. title fades in;
3. cards appear with stagger animation;
4. particles start moving.

Use GSAP stagger animations.

---

# Lightbox

When clicking a photo:

Open a premium preview window.

Requirements:

* centered image;
* glass background;
* blurred overlay;
* fade animation;
* smooth opening;
* smooth closing.

Support:

* overlay click close;
* ESC close.

---

# Navigation

Inside preview mode:

Support:

* previous image;
* next image;
* keyboard arrows.

ArrowLeft:

previous photo.

ArrowRight:

next photo.

---

# Draggable Preview

Preview image should support:

Desktop:

* mouse dragging.

Mobile:

* touch dragging.

Interaction:

drag → release → smooth return.

The motion should feel natural.

---

# Animation Principles

Animations should feel:

* elegant;
* premium;
* cinematic;
* smooth.

Avoid:

* chaotic effects;
* excessive bouncing;
* exaggerated movement.

Prefer subtle motion.

---

# Accessibility

Support:

* keyboard navigation;
* focus states;
* ESC close;
* proper alt attributes.

Avoid accessibility regressions.

---

# Performance Requirements

Keep:

* fast loading;
* smooth scrolling;
* stable frame rate.

Avoid:

* unnecessary re-renders;
* large dependencies;
* heavy calculations.

---

# Folder Structure

src/

components/

PhotoCard/

PhotoGrid/

Lightbox/

Background/

FloatingParticles/

hooks/

data/

utils/

animations/

styles/

types/

---

# Single Responsibility Principle

Each component should have one responsibility.

PhotoCard:

single card only.

PhotoGrid:

layout only.

Lightbox:

preview only.

Background:

background effects only.

Animations:

animation logic only.

Avoid giant files.

---

# TypeScript Rules

Use strict mode.

Avoid:

any

Prefer:

interfaces

types

readonly values

Keep code clean.

---

# Code Style

Prefer:

small functions;

readable names;

reusable logic.

Avoid:

deep nesting;

duplicate code;

overengineering.

---

# AI Coding Rules

Never rewrite working files unnecessarily.

Preserve existing APIs.

Ask before large refactors.

Do not introduce new dependencies without reason.

Do not remove features silently.

Implement incrementally.

Always explain:

* created files;
* responsibilities;
* important decisions.

After every task:

perform self review.

Check:

* TypeScript errors;
* unused imports;
* duplicated logic;
* responsive issues;
* accessibility issues.

Fix problems automatically.

---

# Desired Feeling

The final result should feel like:

Apple + Pinterest + Linear + Polaroid + Glassmorphism.

The application should feel warm, artistic, elegant, and premium.
