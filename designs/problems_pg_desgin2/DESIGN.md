---
name: Editorial Obsidian
colors:
  surface: '#151312'
  surface-dim: '#151312'
  surface-bright: '#3c3837'
  surface-container-lowest: '#100e0d'
  surface-container-low: '#1d1b1a'
  surface-container: '#221f1e'
  surface-container-high: '#2c2928'
  surface-container-highest: '#373433'
  on-surface: '#e8e1df'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e8e1df'
  inverse-on-surface: '#33302e'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffffff'
  on-tertiary: '#472a00'
  tertiary-container: '#ffddb8'
  on-tertiary-container: '#8d5900'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#151312'
  on-background: '#e8e1df'
  surface-variant: '#373433'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-inline:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system combines the intellectual precision of an editorial literary review with the uncompromising clarity of modern developer environments. Designed for engineers solving complex algorithmic, architectural, and systemic challenges, the aesthetic rejects clinical sterility in favor of a deep, warm dark canvas reminiscent of stone, bespoke ink, and warm ambient light.

The design movement mixes **Editorial Elegance** and **Minimalist Utility**:
- High-contrast, literary display headings establish focal authority and thoughtful contemplation.
- Precision UI tooling, dense data tables, and metadata tags are executed with utilitarian sans-serif typography.
- Depth is achieved not through hard boundaries, but through warm tonal layering, hairlines, and slow-radiance atmospheric background orbs that prevent visual fatigue during prolonged sessions.

## Colors
The palette utilizes rich, warm umber and obsidian undertones rather than cold grays, grounding the interface in a tactile, book-like warmth.

### Canvas & Surface Hierarchy
- **Base Canvas (`#0c0a09`)**: Deepest umber black, used for root application scaffolding and view background.
- **Canvas Subtier (`#12100e`, `#1c1917`)**: Alternating workspace sections, elevated page headers, and secondary panel foundations.
- **Card Surfaces (`#171614`, `#1f1d1a`)**: Component and table cards, floating inspect panels, and dialog surfaces.
- **Hairline Borders (`#292524`, `#33302c`)**: Razor-thin structural separation, used at 1px opacity for cards, table dividers, and input strokes.

### Ink & Typography
- **Primary Ink (`#f5f5f5`)**: High-contrast headline emphasis and primary interactive triggers.
- **Body Ink (`#e7e5e4`, `#d6d3d1`)**: Sustained readability for descriptions, code snippets, and active state indicators.
- **Muted Ink (`#a8a29e`, `#78716c`)**: Meta attributes, timestamps, disabled iconography, and secondary column indicators.

### Semantics & Status Accents
- **Completed / Solved (`#10b981`)**: Rich emerald; used sparingly for checkmarks, success tags, and pass states.
- **Due / Today (`#f59e0b`)**: Amber; conveys urgency, pending status, or focus markers.
- **Upcoming / Queued (`#0ea5e9`)**: Sky blue; designates scheduled items, future releases, and telemetry.

### Atmospheric Orbs
Background layers feature two fixed, low-opacity radial gradients (200px to 600px blur radius) using warm plum-tinted amber (`rgba(245, 158, 11, 0.04)`) and deep midnight azure (`rgba(14, 165, 233, 0.03)`), casting an analog glow across the deep canvas.

## Typography
Typographic rhythm relies on the tension between the classical elegance of **Newsreader** (italicized accents, literary serifs, generous optical kerning) and the neutral, high-density clarity of **Inter** for programmatic data and list states.

- Titles, challenge overviews, section intros, and editorial markers use **Newsreader**. Italic styling should be used deliberately for key nouns, categories, or problem tiers (e.g., *Dynamic Programming*, *Concurrency*).
- System metrics, tabular numbers, code references, navigation links, and filter facets use **Inter**.
- For all numeric counters and data-dense problem lists, enable tabular figures (`font-variant-numeric: tabular-nums`) to ensure strict vertical column alignment.

## Layout & Spacing
The layout follows a fluid-responsive model with fixed maximum content wells, maintaining tight scannability for large datasets.

- **Desktop (1200px+)**: 12-column layout with 24px (`gutter`) gutters and max-width of 1440px. The sidebar/filter index spans 3 columns, and the problem index/data view spans 9 columns.
- **Tablet (768px - 1199px)**: 8-column layout with collapsible left-rail drawer. Outer margin shrinks to 24px.
- **Mobile (<768px)**: Single-column flow with 16px (`margin-sm`) margins. Problem list records collapse into structured, touch-friendly list cards with horizontal scrolling tags.

Vertical pacing follows strict multiples of 4px. Structural dividers between data rows must retain uniform row heights (48px for compact lists, 60px for expanded lists) to allow rapid keyboard-driven navigation.

## Elevation & Depth
Depth is produced via subtle tonal stepping and 1px crisp hairlines, strictly avoiding heavy drop shadows.

- **Level 0 (Canvas)**: `#0c0a09` baseline.
- **Level 1 (Structural Cards & Tables)**: `#171614` background with a crisp `1px solid #292524` border. No shadow.
- **Level 2 (Active/Hover Cards, Flyout Menus)**: `#1f1d1a` surface with `1px solid #33302c` border and an ultra-diffused, ambient shadow: `0 8px 32px -8px rgba(0, 0, 0, 0.6)`.
- **Level 3 (Modals & Command Palettes)**: `#1f1d1a` surface, `1px solid #33302c`, overlaid on a backdrop blur (`backdrop-filter: blur(12px)`) with `rgba(12, 10, 9, 0.75)`.

Hairline borders act as the primary elevation mechanism, ensuring elements feel chiselled rather than floating.

## Shapes
The shape philosophy contrasts pill geometry for interactive indicators with restrained softening for containers:

- **CTAs, Badges, and Chips**: Full pill curvature (`rounded-full` / 9999px) to establish a distinct, tactile silhouette that stands out from dense rectangular data grids.
- **Cards, Code Containers, Modals**: Subtly rounded corners (8px to 12px) to prevent clipped table boundaries and maintain structured layout efficiency.
- **Form Controls & Search Inputs**: Pill-shaped outer edges (`2rem` / 32px height) for quick-search and filter pills; 8px for standard inputs.

## Components

### Buttons & Pill CTAs
- **Primary CTA**: Full pill radius (`rounded-full`), `#f5f5f5` background, `#0c0a09` text, `label-lg` font. Hover shifts to `#e7e5e4` with subtle scale transition.
- **Secondary / Ghost**: Full pill radius, `#1f1d1a` background, 1px `#33302c` hairline border, `#e7e5e4` text. Hover shifts border to `#78716c` and surface to `#292524`.
- **Icon Actions**: 36px circular pill containers with centered 16px glyphs in `#a8a29e`, brightening to `#f5f5f5` on hover.

### Badges & Status Chips
- Pill geometry with vertical padding of 2px and horizontal padding of 10px.
- **Completed**: Background `rgba(16, 185, 129, 0.12)`, text `#10b981`, border `1px solid rgba(16, 185, 129, 0.25)`.
- **Due Today**: Background `rgba(245, 158, 11, 0.12)`, text `#f59e0b`, border `1px solid rgba(245, 158, 11, 0.25)`.
- **Upcoming**: Background `rgba(14, 165, 233, 0.12)`, text `#0ea5e9`, border `1px solid rgba(14, 165, 233, 0.25)`.
- **Topic Tags**: Neutral `#1c1917` fill, `#a8a29e` text, `1px solid #292524`.

### Problem Data List
- Table header features muted uppercase tracking (`label-sm`), `#78716c` text, and zero background with a continuous `#292524` bottom hairline.
- List items feature `#171614` rest state, transitioning to `#1f1d1a` on hover. 
- Row elements align to standard columns: Problem Status (checkbox/icon), Problem Title (`body-md` in `#f5f5f5` with Newsreader italic topic hint), Difficulty Chip, Acceptance Rate (`code-inline` muted), and Target Due Date badge.

### Search & Filtering Inputs
- Filter inputs use a 40px pill design with leading search icon, `#12100e` background, `#292524` border, and `#f5f5f5` active ink.
- Focus states switch border to `#78716c` without blue rings, preserving the monochromatic editorial atmosphere.

### Cards
- Surface card tokens use `#171614` with a 1px border of `#292524`.
- Internal dividers within cards use hairline `#292524`.
- Card titles utilize Newsreader `headline-sm` with optional editorial subheadings in Inter `body-sm` (`#a8a29e`).