# Codeflow FM — Design System Documentation

Version: 1.0  
Status: Derived from approved visual mockups and prior product/brand direction  
Platforms: Desktop web and mobile web  
Product: Codeflow FM  
Scope: UI foundations, interaction patterns, component guidance, and implementation notes

---

## 1. Purpose

This document defines the design system for Codeflow FM, a premium radio-style focus music product built for developers and deep workers. It translates the approved mockups into a reusable, implementation-oriented system for desktop and mobile web apps.

The system is designed to support a station-first listening experience with low cognitive load, persistent playback, restrained atmosphere, and a calm, developer-native visual language.

This is not a generic streaming UI kit. Every pattern in the system should reinforce the product’s core promise:

**Select a station. Enter flow.**

---

## 2. Product Experience Principles

### 2.1 Instant station-first listening
The interface should reduce the path from app open to playback to the minimum possible number of interactions. A user should be able to start a station immediately without browsing deep menus or managing a library.

### 2.2 Low cognitive load
The UI must remain shallow, predictable, and quiet. Hierarchy should be obvious. Visual density should stay controlled. Users should not need to interpret multiple competing surfaces.

### 2.3 Calm continuity
Playback is persistent, and the interface should feel stable while music plays. State transitions should be smooth and subtle, not theatrical.

### 2.4 Persistent control surface
Playback controls should remain available across primary surfaces. The player must be globally accessible but visually subordinate to station browsing.

### 2.5 Editorial trust
Stations should look curated rather than algorithmically generated. Cards, labels, artwork, descriptors, and copy should all signal deliberate curation.

### 2.6 Atmosphere without clutter
The product should feel immersive through spacing, gradients, glow, and artwork treatment, but never noisy. Motion, brightness, and decoration should remain restrained.

---

## 3. Brand Character in UI

The interface should consistently feel:

- calm
- precise
- modern
- atmospheric
- intelligent
- minimal
- immersive
- non-intrusive

The correct visual reference is a late-night, premium, developer-native environment. The system should feel closer to a refined coding workspace or focused audio tool than to a mainstream consumer streaming catalog.

### Avoid

- bright, high-saturation rainbow palettes
- loud equalizers and visualizers
- playful, cartoonish music motifs
- overly soft lifestyle aesthetics
- “lofi cliché” visual tropes used without restraint
- hype-driven copy or gamified UI

---

## 4. Supported Platforms

### 4.1 Desktop web
Desktop is the primary product surface. The desktop experience should take advantage of horizontal space for:

- a spacious station grid
- a lightweight top navigation bar
- secondary context panels such as Continue Session or Recent Tracks
- a persistent bottom player

### 4.2 Mobile web
Mobile is a condensed adaptation of the same product language. Mobile should preserve the same hierarchy and mood while simplifying layout and reducing simultaneous surface complexity.

On mobile, the design system prioritizes:

- stacked content
- compact station list items or cards
- simplified navigation
- persistent mini-player
- expanded now-playing view optimized for thumb interaction

---

## 5. Responsive Strategy

### 5.1 Breakpoint model
Recommended breakpoints:

- **xs:** 0–479px
- **sm:** 480–767px
- **md:** 768–1023px
- **lg:** 1024–1439px
- **xl:** 1440px+

### 5.2 Layout behavior by breakpoint

#### xs / sm
- single-column layout
- stacked cards and sections
- bottom tab navigation when needed
- persistent mini-player at bottom
- expanded player opens as full-screen sheet/page

#### md
- compact multi-column layout where useful
- desktop navigation may collapse or simplify
- continue-session and supporting modules can move below hero

#### lg / xl
- multi-column station grid
- hero + secondary module layout
- right-side support panels for expanded now-playing or recent tracks
- full persistent bottom player

### 5.3 Responsive invariants
These should remain consistent across breakpoints:

- station-first browsing
- strong hierarchy
- persistent playback access
- dark theme as primary mode
- same color tokens and typography logic
- same meaning of states such as On Air, Loading, Unavailable

---

## 6. Color System

The color system is based on dark neutral foundations with cool luminous accents.

### 6.1 Core palette

| Token | Name | Hex | Primary Use |
|---|---|---:|---|
| `color.bg.canvas` | Obsidian | `#0B0F14` | primary app background |
| `color.bg.surface` | Graphite | `#131A22` | cards, panels, nav, player |
| `color.text.primary` | Mist | `#E8EEF5` | primary text |
| `color.text.secondary` | Slate | `#8D99A8` | secondary text, metadata |
| `color.accent.primary` | Signal Blue | `#4DA3FF` | primary actions, focus accents |
| `color.accent.secondary` | Violet Glow | `#8B7CFF` | glow accents, active richness |
| `color.accent.tertiary` | Cyan Drift | `#59E1D9` | On Air / live cues, secondary accent |

### 6.2 Semantic tokens

| Semantic Token | Recommended Value | Usage |
|---|---:|---|
| `color.bg.app` | `#0B0F14` | page background |
| `color.bg.elevated` | `#131A22` | elevated surfaces |
| `color.bg.hover` | mix of Graphite + subtle blue tint | hoverable surfaces |
| `color.bg.active` | Graphite with blue/violet glow treatment | active cards, active nav |
| `color.border.subtle` | low-opacity Mist or Slate | standard strokes |
| `color.border.focus` | `#4DA3FF` | keyboard focus ring |
| `color.text.inverse` | `#0B0F14` | text on bright surfaces |
| `color.state.success` | `#59E1D9` | On Air, live, synced |
| `color.state.loading` | `#4DA3FF` | loading indicators |
| `color.state.disabled` | desaturated Slate on dark surface | unavailable/disabled |
| `color.state.error` | muted red, introduced only if needed | errors; not a brand accent |

### 6.3 Usage rules

1. Dark neutrals should dominate the interface.
2. Signal Blue is the main interactive accent.
3. Violet Glow should be used as a secondary atmospheric accent, not as the primary action color.
4. Cyan Drift is best for live, synced, or active-broadcast cues.
5. White or near-white surfaces should be rare and reserved for text or isolated contrast needs.
6. Large areas of saturated color should be avoided.

### 6.4 Gradients
Allowed gradients should remain subtle and purpose-driven.

Recommended gradient directions:

- Signal Blue → Violet Glow
- Violet Glow → Cyan Drift
- Deep navy → soft violet haze

Use gradients for:

- primary CTA fills
- ambient surface enhancement
- icon/logo accents
- hero atmosphere layers

Do not use gradients for every card or every component.

---

## 7. Typography

Typography should feel technical, calm, and highly legible on dark surfaces.

### 7.1 Type strategy

Use a two-tier type system:

- **Primary UI sans-serif** for headings, body, controls, and navigation
- **Monospace accent** for technical labels, states, timestamps, and metadata

### 7.2 Recommended font roles

#### UI Sans
Recommended production options:

- Inter
- Geist
- SF Pro Text / Display equivalent

#### Mono Accent
Recommended production options:

- SF Mono
- JetBrains Mono
- IBM Plex Mono
- Geist Mono

### 7.3 Desktop type scale

| Style | Suggested Size / Line Height | Weight | Usage |
|---|---|---:|---|
| Display / Hero | 56 / 64 | 600 | homepage hero headline |
| H1 | 40 / 48 | 600 | screen titles, station hero titles |
| H2 | 28 / 36 | 600 | secondary titles, now-playing headers |
| Section Title | 20 / 28 | 600 | module headings |
| Body | 16 / 24 | 400 | standard body copy |
| Secondary Body | 14 / 20 | 400 | descriptors, metadata |
| Caption | 12 / 16 | 400 | timestamps, supporting detail |
| Mono Label | 12 / 16 | 500 | ON AIR, LIVE, elapsed times |

### 7.4 Mobile type scale

| Style | Suggested Size / Line Height | Weight | Usage |
|---|---|---:|---|
| Display / Hero | 32 / 40 | 600 | mobile hero headline |
| H1 | 24 / 32 | 600 | screen titles |
| H2 | 18 / 24 | 600 | section headers |
| Section Title | 16 / 22 | 600 | sub-section titles |
| Body | 14 / 20 | 400 | standard content |
| Secondary Body | 12 / 18 | 400 | descriptors |
| Caption | 10 / 14 | 400 | compact metadata |
| Mono Label | 10 / 14 | 500 | state labels |

### 7.5 Typography rules

1. Keep heading weight moderate, not ultra-bold.
2. Avoid overly condensed or decorative type.
3. Maintain clear contrast between primary and secondary text.
4. Use mono sparingly for signal-like precision, not as a dominant style.
5. Never rely on type alone to indicate state; pair with color or iconography.

---

## 8. Layout Foundations

### 8.1 Grid

#### Desktop
- 12-column grid recommended
- max content width: 1280–1440px depending on view
- generous outer padding: 32–48px
- consistent gap rhythm: 16–24px

#### Mobile
- single-column base layout
- horizontal page padding: 16–20px
- card spacing: 12–16px

### 8.2 Spacing scale

Use a compact but flexible spacing system:

| Token | Value |
|---|---:|
| `space.1` | 4px |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.5` | 20px |
| `space.6` | 24px |
| `space.8` | 32px |
| `space.10` | 40px |
| `space.12` | 48px |
| `space.16` | 64px |

Recommended usage:

- 8–12px for tight icon/text spacing
- 16px for small component padding
- 20–24px for card padding
- 32px+ for section separation

### 8.3 Corner radius

Rounded geometry is a core part of the visual system.

| Token | Value | Usage |
|---|---:|---|
| `radius.sm` | 12px | small chips, controls |
| `radius.md` | 16px | cards, inputs |
| `radius.lg` | 20px | large panels |
| `radius.xl` | 24px | hero modules, major surfaces |
| `radius.round` | 999px | pills, circular buttons |

### 8.4 Borders and strokes

- standard border: 1px
- cool-toned, low-contrast borders
- use subtle opacity instead of harsh contrast
- combine border with inner glow only on interactive emphasis

### 8.5 Elevation and glow

The system uses soft atmospheric elevation rather than heavy drop shadows.

Recommended levels:

- **Level 0:** flat dark surface, no glow
- **Level 1:** subtle border and faint shadow
- **Level 2:** low blue-violet ambient glow for active/hovered surfaces
- **Level 3:** reserved for hero emphasis or focused active card

Rules:

- use blur and glow sparingly
- avoid thick shadow stacks
- active state should feel energized, not loud

---

## 9. Imagery and Graphic Language

### 9.1 Artwork style
Station imagery should be abstract, atmospheric, and editorial.

Preferred qualities:

- low-clutter compositions
- dark tonal bases
- cool atmospheric lighting
- soft glows or distant light sources
- landscape, ambient, architectural, or abstract scenes
- no literal album-cover chaos

### 9.2 Graphic motifs
Allowed motifs:

- signal arcs
- frequency lines
- subtle waveforms
- dotted spectra
- radar circles
- ambient gradient haze

### 9.3 Rules for decorative graphics

- graphics must support hierarchy, not compete with it
- hero graphics should stay subtle
- decorative waveform lines should be low contrast
- never animate aggressively

---

## 10. Iconography

### 10.1 Icon style
Icons should be:

- linear or lightly filled
- simple and geometric
- optically balanced on dark backgrounds
- consistent in stroke weight

### 10.2 Common icon set
Recommended UI icons:

- play / pause
- next / previous
- volume / mute
- account
- recent / clock
- broadcast / station / signal
- search, if used outside baseline browse-only experience
- more / kebab
- retry / reconnect
- favorite, timer, sleep, share for expanded player if required later

### 10.3 Usage rules

- default icon color should match secondary or primary text, depending on emphasis
- only active icons should use accent color
- icon buttons must have generous hit areas

---

## 11. Motion and Interaction Language

### 11.1 Motion qualities
Motion should be:

- calm
- short
- functional
- non-bouncy
- non-theatrical

### 11.2 Recommended timing

- hover/focus transitions: 120–160ms
- state transitions: 180–220ms
- drawers/panels/sheets: 220–280ms
- loading loops: slow and smooth

### 11.3 Recommended easing

Use neutral easing such as:

- `ease-out` for entry
- `ease-in-out` for small state transitions
- avoid spring-heavy motion by default

### 11.4 Motion do / don’t

Do:

- fade and lift subtly
- crossfade metadata changes
- pulse low-intensity loading indicators

Don’t:

- use bouncing cards
- use aggressive scale-up on hover
- use high-frequency equalizer animation as decoration

---

## 12. Content Design and Voice

### 12.1 Voice characteristics
UI copy should be:

- concise
- composed
- low-hype
- direct
- intelligent
- lightly atmospheric

### 12.2 Preferred labels

- Stations
- On Air
- Now Playing
- Recently Played
- Continue Session
- Start Listening
- Switch Station
- Live

### 12.3 Copy style rules

1. Prefer clarity over cleverness.
2. Keep button labels short.
3. Avoid motivational clichés.
4. Use the radio metaphor consistently, but do not force it into every label.
5. Use title case or sentence case consistently within each surface.

### 12.4 Avoid language like

- Crush your goals
- Ultimate focus hack
- Vibe harder
- Nonstop bangers
- Epic beats

---

## 13. Component Inventory

This section defines the main component families for desktop and mobile web.

### 13.1 App shell
The app shell includes:

- dark canvas background
- top navigation or compact mobile header
- main content region
- persistent player surface
- optional bottom tab navigation on mobile

### 13.2 Navigation

#### Desktop top nav
Contains:

- brand logo + wordmark
- Stations
- Recently Played
- Account

Desktop nav rules:

- lightweight visual treatment
- active item uses accent underline or glow
- nav height should stay compact
- brand should remain visible on all core pages

#### Mobile header
Contains:

- compact brand mark / wordmark
- optional utility action such as search or more
- clear page title when needed

#### Mobile bottom tab bar
Recommended tabs:

- Stations
- Recent
- Account

Rules:

- maintain icon + label pairing
- show active tab via accent color and subtle glow
- leave room for safe area and mini-player

### 13.3 Buttons

#### Primary button
Use for the highest priority action on a surface.

Visual traits:

- filled gradient or luminous blue treatment
- rounded corners or pill geometry
- medium weight label
- icon optional, usually play/resume

Typical labels:

- Resume
- Start Listening
- Continue with Google

#### Secondary / ghost button
Use for lower emphasis actions.

Visual traits:

- dark surface or transparent background
- subtle border
- no heavy fill

Typical labels:

- View Now Playing
- Browse Stations
- Sign out

### 13.4 Inputs and fields
Baseline product direction is browse-first, so search is not a required primary component. If fields are introduced for account or future flows, use:

- dark surface input
- subtle border
- rounded corners
- low-contrast placeholder text
- clear focus ring in Signal Blue

### 13.5 Segmented controls and chips
Used only where they support lightweight categorization or mode switching.

Rules:

- keep count low
- active state should be obvious
- avoid introducing discovery clutter
- do not displace station-first flow

### 13.6 Station card
The station card is the core product component.

#### Required content
- artwork or mood visual
- station name
- descriptor
- play affordance
- state indication when active

#### Desktop station card behavior
- large enough to feel editorial
- click target should cover the full card or primary action region
- active card may show On Air label and subtle spectrum treatment
- hover state uses slight lift and glow

#### Mobile station card behavior
- can compress into list-item or compact card form
- preserve artwork + title + descriptor + play control
- maintain comfortable tap targets

#### Station card states
- default
- hover
- focus
- active / playing
- loading
- unavailable / disabled

State guidance:

- **Default:** dark card, subtle border, neutral play affordance
- **Hover:** small lift, glow, slightly brighter border
- **Focus:** clear keyboard ring using Signal Blue
- **Active / Playing:** On Air label, cyan or blue highlight, playing control
- **Loading:** visible spinner or linear placeholder, do not remove context
- **Unavailable:** reduced contrast, unavailable icon or copy, optional lock

### 13.7 Continue Session card
A high-value recovery pattern for returning users.

Required content:

- recent station artwork
- station name
- descriptor
- elapsed or last-session context
- clear resume CTA
- optional link to Now Playing

Behavior:

- appears near the top of home/recent surfaces
- visually distinct but not louder than the hero
- should feel like a shortcut back into ritual

### 13.8 Recently Played row / card
Represents a recently played station.

Required content:

- artwork thumbnail
- station name
- descriptor
- last played relative time or timestamp
- one-click restart CTA
- optional overflow menu

Rules:

- dense but readable
- chronological ordering
- emphasize speed of return

### 13.9 Account summary card
A lightweight account-linked information surface.

Possible content:

- avatar
- display name
- email
- sync state
- recent stations synced count
- last station
- volume or preference summary

Rules:

- account should feel secondary to listening
- authenticated information should be clear and compact
- public listening availability should remain explicit

### 13.10 Global bottom player
The bottom player is a persistent global control bar.

#### Required content
- current station artwork
- current station name
- descriptor or station context
- play/pause
- previous/next if appropriate
- track artist/title
- progress or elapsed view where available
- volume / mute
- entry point to expanded now playing

#### Desktop player behavior
- docked at bottom
- always visible on core routes
- visually subordinate to content but clearly usable
- progress and metadata should remain readable without dominating

#### Mobile mini-player behavior
- compact fixed bottom bar above or integrated with tab navigation
- shows artwork, station, and play/pause
- tapping opens expanded now playing

### 13.11 Expanded now-playing view
A focused player surface that deepens context without creating noise.

Required content:

- large station artwork
- station name
- descriptor
- On Air / Live cue
- current track artist/title
- playback controls
- volume control
- optional supporting panels such as recent tracks or switch station

Rules:

- should feel immersive but restrained
- use more space, not more clutter
- maintain dark atmospheric tone

### 13.12 Loading card / placeholder
A systemized placeholder for unavailable or pending content.

Rules:

- use subtle animated indicators
- preserve the layout footprint of final content
- avoid spinner-only full-screen states wherever possible

### 13.13 Unavailable / disabled card
Communicates that a station or surface cannot currently be used.

Rules:

- lower contrast than active states
- retain readable title and explanation
- avoid bright error colors unless truly necessary

---

## 14. Desktop Patterns

### 14.1 Home / Stations
The desktop homepage combines:

- lightweight top nav
- hero statement
- secondary Continue Session panel
- station grid
- persistent bottom player

Recommended composition:

- hero and session module above the fold
- grid directly beneath
- no unnecessary discovery chrome

### 14.2 Expanded Now Playing
The desktop expanded player can use a two-column structure:

- large primary player panel left
- supporting recent tracks / switch station panel right

### 14.3 Recently Played
Recommended structure:

- title and supporting description
- Continue Session panel
- list of recent stations
- optional empty-state support module
- persistent player at bottom

### 14.4 Account
Recommended structure:

- page title and short explanation
- signed-out module
- signed-in summary module
- synced preferences module
- account-linked features module
- persistent player

---

## 15. Mobile Patterns

### 15.1 Mobile home
Recommended order:

1. compact header
2. concise hero copy
3. Continue Session card
4. editorial station list or compact cards
5. mini-player
6. bottom tab nav

### 15.2 Mobile station list item
A station list item should include:

- left artwork thumbnail
- title
- descriptor
- right play affordance

### 15.3 Mobile mini-player
Should include:

- artwork
- station name
- descriptor or active context
- play/pause
- slim progress indication

### 15.4 Mobile expanded now playing
Should feel like a focused full-screen player with:

- top dismiss/back affordance
- On Air / Live badge
- large artwork
- station name and descriptor
- current track line
- progress bar
- large transport controls
- optional quick actions such as favorite, timer, sleep, share if product scope supports them later

### 15.5 Mobile safe-area considerations

- reserve space for device bottom inset
- maintain touch comfort around bottom controls
- avoid stacking mini-player and tab bar so tightly that they compete

---

## 16. Interaction States

All key interactive elements should have defined states.

### 16.1 State set
- default
- hover
- focus-visible
- pressed
- active
- loading
- disabled
- unavailable
- playing

### 16.2 State semantics

#### Hover
- subtle lift and border emphasis
- no dramatic motion

#### Focus-visible
- distinct ring or outline in Signal Blue
- must be visible against dark surfaces

#### Pressed
- slight darkening or scale reduction
- instantaneous feedback

#### Active
- clear accent presence
- may include cyan/violet/blue glow

#### Playing
- active station control state
- pair text label with icon or animation cue

#### Loading
- keep structure in place
- show obvious progress or pending feedback

#### Disabled / unavailable
- lower contrast, preserve comprehension
- do not rely solely on opacity if readability is lost

---

## 17. Accessibility

### 17.1 Core target
Aim for WCAG 2.1 AA for core flows.

### 17.2 Required practices

- keyboard navigation for desktop station browsing and player controls
- visible focus states on all interactive controls
- sufficient text contrast on dark surfaces
- meaningful labels for icon-only controls
- semantic structure for headings and sections
- screen-reader announcement for playback state where practical

### 17.3 Player accessibility
The player must expose:

- current station name
- play/pause state
- elapsed or progress context if available
- volume state
- mute state

### 17.4 Motion accessibility
Respect reduced motion preferences by:

- reducing glow pulses
- reducing non-essential transitions
- disabling decorative animation where practical

---

## 18. Implementation Tokens

Below is a suggested token structure for engineering handoff.

```json
{
  "color": {
    "bg": {
      "app": "#0B0F14",
      "surface": "#131A22"
    },
    "text": {
      "primary": "#E8EEF5",
      "secondary": "#8D99A8"
    },
    "accent": {
      "primary": "#4DA3FF",
      "secondary": "#8B7CFF",
      "tertiary": "#59E1D9"
    }
  },
  "space": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "16": 64
  },
  "radius": {
    "sm": 12,
    "md": 16,
    "lg": 20,
    "xl": 24,
    "round": 999
  },
  "type": {
    "display": { "size": 56, "lineHeight": 64, "weight": 600 },
    "h1": { "size": 40, "lineHeight": 48, "weight": 600 },
    "h2": { "size": 28, "lineHeight": 36, "weight": 600 },
    "body": { "size": 16, "lineHeight": 24, "weight": 400 },
    "bodySecondary": { "size": 14, "lineHeight": 20, "weight": 400 },
    "caption": { "size": 12, "lineHeight": 16, "weight": 400 },
    "mono": { "size": 12, "lineHeight": 16, "weight": 500 }
  }
}
```

### 18.1 Suggested CSS variables

```css
:root {
  --cfm-bg-app: #0B0F14;
  --cfm-bg-surface: #131A22;
  --cfm-text-primary: #E8EEF5;
  --cfm-text-secondary: #8D99A8;
  --cfm-accent-primary: #4DA3FF;
  --cfm-accent-secondary: #8B7CFF;
  --cfm-accent-tertiary: #59E1D9;

  --cfm-radius-sm: 12px;
  --cfm-radius-md: 16px;
  --cfm-radius-lg: 20px;
  --cfm-radius-xl: 24px;

  --cfm-space-1: 4px;
  --cfm-space-2: 8px;
  --cfm-space-3: 12px;
  --cfm-space-4: 16px;
  --cfm-space-6: 24px;
  --cfm-space-8: 32px;

  --cfm-border-subtle: 1px solid rgba(232, 238, 245, 0.10);
  --cfm-focus-ring: 0 0 0 2px rgba(77, 163, 255, 0.9);
  --cfm-glow-active: 0 0 24px rgba(77, 163, 255, 0.16);
  --cfm-gradient-primary: linear-gradient(135deg, #4DA3FF 0%, #8B7CFF 100%);
}
```

---

## 19. Example Component Rules

### 19.1 Station card sizing

#### Desktop
- min width: 240–280px depending on grid
- padding: 16–20px
- artwork aspect: square or portrait-leaning cropped tile

#### Mobile
- full-width list item or compact card
- padding: 12–16px
- artwork kept compact

### 19.2 Button sizing

| Size | Height | Typical Use |
|---|---:|---|
| Small | 36px | list items, compact actions |
| Medium | 44px | default action buttons |
| Large | 52px | high-priority primary CTAs |

### 19.3 Player control sizing

- icon-only controls: 40–44px min touch target
- primary play/pause: 56–72px desktop, 64–80px mobile expanded player
- sliders should maintain sufficient thickness and thumb size for dark UI visibility

---

## 20. QA Checklist for Design Consistency

### Visual
- dark neutrals dominate the layout
- accents are used sparingly and purposefully
- text hierarchy is clear at all breakpoints
- cards preserve rounded geometry and low-contrast borders
- active states do not become visually noisy

### Interaction
- station cards have all required states
- focus rings are visible and consistent
- player remains accessible across primary routes
- mobile mini-player and bottom nav do not conflict

### Content
- copy remains concise and low-hype
- labels are consistent across desktop and mobile
- radio metaphors are present but restrained

### Accessibility
- sufficient contrast on core text
- keyboard access works on desktop
- icon buttons have labels
- reduced-motion mode remains usable

---

## 21. Governance

### 21.1 Change management
Any new component or pattern added to the system should be evaluated against these questions:

1. Does it reduce or increase cognitive load?
2. Does it preserve station-first listening?
3. Does it fit the calm, precise visual language?
4. Is it necessary on both desktop and mobile?
5. Does it introduce avoidable clutter?

### 21.2 Design review criteria
A feature should not ship visually unless it:

- uses existing tokens first
- matches current spacing and radius logic
- respects the dark premium tone
- defines all interaction states
- includes mobile treatment where relevant

---

## 22. Final System Definition

Codeflow FM’s design system is a dark, premium, station-first interface framework built for focused listening. It combines restrained luminous accents, technical clarity, editorial calm, and persistent playback patterns across desktop and mobile web. The system succeeds when the product feels effortless to start, stable to use, and atmospheric without ever becoming noisy.

