# Architecture

## Overview

This project is a client-only React application.

No backend.

No database.

No API.

All assets are local static files.

Architecture priorities:

1. simplicity;
2. maintainability;
3. deterministic behavior;
4. visual quality;
5. smooth animations.

---

# Photo Model

Each photo contains:

id

src

caption

rotation

offsetX

offsetY

The caption belongs to the photo itself.

Lightbox only renders captions.

Caption generation should not happen inside UI components.


# High Level Structure

App

├── Background

├── FloatingParticles

├── PageTitle

├── PhotoGrid

│ └── PhotoCard

└── Lightbox

---

# Component Responsibilities

## App

Responsibilities:

* initialize page;
* manage global state;
* mount background;
* mount gallery;
* mount lightbox.

App should remain small.

Avoid placing business logic inside App.

---

## Background

Responsibilities:

* aurora effects;
* gradient layers;
* ambient lighting;
* blur circles.

Background should never know about photos.

---

## FloatingParticles

Responsibilities:

* decorative particles;
* subtle movement only.

No user interaction.

---

## PageTitle

Responsibilities:

* display title;
* subtitle;
* entrance animation.

---

## PhotoGrid

Responsibilities:

* render photo collection;
* manage layout;
* apply scatter offsets.

PhotoGrid should NOT handle preview state.

---

## PhotoCard

Responsibilities:

* display image;
* display optional preview label;
* trigger click event.

PhotoCard should not know neighboring cards.

---

## Lightbox

Responsibilities:

* preview image;
* render caption;
* next image;
* previous image;
* close preview.

Lightbox should not manage photo generation.

---

# Position System

Final position:

default scatter position

+

user offset

Formula:

finalX = scatterX + userOffsetX

finalY = scatterY + userOffsetY

User offsets belong to state.

Scatter values remain immutable.

# Hooks

## useLightbox

Manage:

* selected index;
* open state;
* next image;
* previous image;
* close action.

No UI inside hooks.

---

## useKeyboard

Responsibilities:

* ESC close;
* ArrowLeft previous;
* ArrowRight next.

---

# Data Layer

Location:

src/data/

Photo data is deterministic.

Never fetch data from server.

Never use runtime APIs.

Images are generated from:

/pic/001.jpg

/pic/002.jpg

...

---

# Types

Location:

src/types/

Purpose:

centralize TypeScript definitions.

Example:

Photo

LightboxState

Avoid duplicate interfaces.

---

# Utilities

Location:

src/utils/

Utilities include:

scatter.ts

Purpose:

generate deterministic rotation values and offsets.

Never use:

Math.random()

Every refresh must produce identical layout.

---

# Animation Layer

Location:

src/animations/

Files:

cardAnimations.ts

lightboxAnimations.ts

backgroundAnimations.ts

Purpose:

keep animation code isolated.

Avoid mixing animation logic inside components.

---

# Style Layer

Location:

src/styles/

Files:

globals.css

animations.css

variables.css

Purpose:

centralize styling.

Avoid duplicated CSS.

---

# State Flow

Photo click

↓

openLightbox(index)

↓

selectedIndex updated

↓

Lightbox rendered

↓

next / previous

↓

selectedIndex changes

↓

close

↓

selectedIndex becomes null

---

# Event Flow

Hover card

↓

GSAP hover animation

Click card

↓

Open lightbox

ESC

↓

Close lightbox

Arrow keys

↓

Switch images

Touch drag

↓

Move preview image

Release

↓

Return animation

---

# Animation Principles

Animations should feel:

* soft;
* premium;
* elegant.

Avoid:

* chaotic motion;
* excessive bounce;
* aggressive scaling.

Prefer:

ease-out curves.

---

# Responsive Strategy

Desktop:

5~6 columns.

Tablet:

3 columns.

Mobile:

2 columns.

No horizontal scrolling.

---

# Dependency Policy

Allowed:

React

TypeScript

GSAP

Disallowed:

large UI frameworks;

unnecessary libraries.

Always prefer native solutions.

---

# File Size Policy

Target:

Component:

< 200 lines.

Hook:

< 100 lines.

Utility:

< 100 lines.

If file becomes too large:

split it.

---

# Refactor Policy

Never rewrite working code without reason.

Preserve existing APIs.

Ask before major refactors.

Avoid cascading changes.

---

# Error Policy

Fix:

TypeScript errors.

Remove:

unused imports.

Avoid:

dead code.

Always perform self-review after implementation.

---

# Performance Policy

Prefer:

CSS transforms.

Avoid:

expensive layout calculations.

Keep animations GPU friendly.

Target:

smooth interactions.

---

# Future Extensions

Possible future features:

* music mode;
* fullscreen mode;
* image captions;
* favorite system;
* slideshow mode;
* category filters.

Current architecture should support future extensions without major rewrites.
