# Phase 2 specification: user flows and information architecture

**Status:** Structure proposal for low-fidelity review  
**Basis:** [Design workflow](./00-design-workflow.md), [Phase 1 experience brief](./01-experience-brief.md), and the channel-tune-in model described in [DI.FM's help](https://www.di.fm/contact) and [persistent-player announcement](https://www.di.fm/content/digitally-imported-revamps-user-experience-and-launches-exclusive-dj-series-on-its-award-winning-electronic-music-radio-platform)

## Purpose and source priority

This phase defines what a listener can reach, how listening begins and changes, and where controls live. It is deliberately grayscale and content-first; visual identity belongs to Phase 3.

The Phase 1 brief is the product scope for this phase. The workflow's playlist, track, seek, skip, and editable-queue examples describe a broader possible music product. Phase 1 launches with **two continuous stations**, Future Garage and Lo-Fi Beats, and allows the station list to grow to **10 or more** later. Accordingly, this specification has no playlist, track-list, queue, seek, or skip flow. The five primary tasks below are adapted to radio listening. DI.FM is a reference for choosing a channel and keeping a player available while browsing, not for its account, trial, premium, content, or visual design.

## Experience to structure

The first screen answers two questions: **“What can I play?”** and **“What is playing now?”** The first station choices and current status are visible without scrolling on a typical desktop screen. A listener can Tune In to a station through one explicit action, then leave the tab alone. The active station and playback state remain visible whenever the app is open. Tuning In to another station is the same action, with clear feedback during connection. If the station list exceeds its available space, the listener can scroll that list without moving the player.

### Terms

| Term | Meaning in this product |
| --- | --- |
| Station | One continuous curated radio stream. Future Garage and Lo-Fi Beats are the two launch stations; the chooser must also work with 10 or more stations. |
| Tune In | Request a station and start its stream after a user action, whether nothing is playing or another station is active. It does not start a track from its beginning. |
| Current station | The station selected for playback, including while it is loading, playing, paused, or showing an error. |
| On air | A status used only when that station's audio is being heard. |
| Player | The persistent area showing current station artwork beside its name and state, play/pause, and volume/mute. |

### In and out of scope

| Included in this phase | Excluded from the first release |
| --- | --- |
| Two stations at launch; a station chooser and card layout that work with 10 or more; square station artwork; one Tune In action on station cards; persistent player; play/pause; volume/mute; clear loading and error text; desktop and mobile layouts | Focus View; accounts; onboarding; recommendations; additional stations in the first release; playlist and track pages; track-level actions; queue; seek; skip; previous/next; sharing; payments; uploads |

Current-track metadata is optional supporting information when a reliable source exists. It never displaces the station name or playback state, and its absence creates no empty track panel.

## Information architecture

```text
Listen  /  (the only primary destination)
├── Station chooser (scrolls vertically only when cards overflow)
│   ├── Future Garage card + square artwork → Tune In
│   ├── Lo-Fi Beats card + square artwork   → Tune In
│   └── More station cards when the catalog grows (10+ total)
└── Persistent player
    ├── Current station artwork + name + playback status
    ├── Play / Pause
    └── Volume / Mute
```

There is no separate station detail page. The same card pattern repeats for every station, whether there are two or 10 or more. Every card contains square artwork, a station name, and a short description. **Tune In** is the only station-card action, for both starting playback and changing stations; its name is not printed on the card. The current card shows its status. If playback fails, clicking or tapping that card again repeats Tune In. The player repeats the selected station's square artwork immediately beside its name and playback status, using the same source image at a smaller size. If an image is unavailable, a square fallback occupies the same space.

### Navigation and orientation rules

1. Opening `/` shows both stations and the player in its idle state. No stream starts on page load.
2. The player stays visible while choosing and scrolling stations. It shows current station artwork, name, and an unambiguous text status alongside any icon or motion.
3. One station can be on air at a time. Tuning In to another station stops the old stream immediately and selects the new station. The chooser shows **On air** only when audio is heard.
4. Station cards offer Tune In through the card surface, without a separately labeled button. The current playing card does not restart playback; the player provides pause and resume. After an error, the current card can repeat Tune In.
5. Returning to an open tab shows the actual current state. After a reload, the app remembers the last station as a convenience, but playback waits for another explicit action.

## Structure for grayscale wireframes

**Option A — Scrollable chooser with persistent bottom player.** Station cards fill the main area; a compact player stays anchored at the bottom. This keeps choices and playback state easy to find, meets the roughly ten-second first-audio target, and scales from two launch stations to 10 or more. Validate it with two-card and 12-card grayscale frames before visual exploration.

### Station card behavior

- Each card has a **square artwork area** that keeps its shape at every responsive size. The artwork is decorative beside the visible station name; missing artwork uses a same-size fallback. Do not use DI.FM's artwork or branding.
- The whole card surface is the Tune In target for any station that is not currently playing. No action text is printed on the card. While the current station is playing, its card shows status and clicking it does not restart audio. After an error, the card can be clicked again to try playing it.
- Hovering a card that can Tune In smoothly enlarges it slightly (target scale about **1.02** over **180–220 ms**) and may strengthen its outline or shadow. Hover alone never starts playback. The card must not cover neighboring cards, the scrollbar, or the player. The current playing card does not enlarge because clicking it would do nothing.

### Station-area scrollbar behavior

The station chooser has a bounded area between the heading and persistent player. On desktop it uses a repeating card grid; on narrow screens it uses one column. The layout must accept 10 or more station records without adding a new page or changing the player. **Only this area scrolls vertically** when cards do not fit. Do not create a horizontal scrollbar. Keep the header and player in view while the station cards scroll.

- When every card fits, show **no scrollbar or empty track**.
- When cards exceed the available height, show a visible vertical scrollbar **inside the chooser's right edge**, with a track and draggable thumb. Reserve space so it never covers artwork, labels, or card hover growth. Its thumb should indicate how much of the list is visible. This visible affordance is required even on systems that normally auto-hide overlay scrollbars.
- Support mouse wheel, trackpad, dragging the thumb, and touch swipes.
- The player and its artwork do not move as the list scrolls. Tuning In to another station keeps the list at its current scroll position unless needed to reveal the new current card. Changing viewport size recalculates whether the scrollbar is needed.

## Five primary user flows

| Task | Entry and actions | Expected result | If playback fails |
| --- | --- | --- | --- |
| 1. Start listening | Open Listen → Tune In through a station card (Future Garage or Lo-Fi Beats at launch) | The card becomes current; the player shows its artwork and **Loading**, then **Playing** when audio starts | Show a plain text error. The listener can click **Play**, click the card again, or refresh the page. |
| 2. Choose a different station | While a station is playing or paused → Tune In through any other station card | Stop the old station immediately; select the new one and show **Loading**, then **Playing** | Show a plain text error for the new station. The listener can click **Play**, click its card again, choose another card, or refresh the page. |
| 3. Pause and resume | Click **Pause** in the player → later click **Play** | The station stays selected; the player says **Paused** or **Playing** | If playback fails on resume, show a plain text error; **Play** remains available. |
| 4. Adjust sound and return to work | Use volume control or **Mute** → leave the tab → return | Sound change is immediate; returning tab shows the station and actual state | If audio stopped unexpectedly, show a plain text error and keep **Play** available. |
| 5. Browse an overflowing station list | With a 10+ station catalog → scroll the chooser → Tune In through a card below the fold | Scrollbar is visible; cards move within the chooser without interrupting audio; player remains visible; choosing a card follows flow 2 | The same plain text error behavior applies. |

The workflow's example task “inspect or change the queue” does not apply to continuous radio. Flow 5 checks that an expanded station collection remains navigable without interrupting listening.

### Tuning In while another station plays

Clicking station B stops station A immediately and selects B. The player shows B's artwork and **Loading** until audio starts, then **Playing**. There is no crossfade or wait for B to be ready before stopping A. If B cannot play, show plain text such as “Could not play Lo-Fi Beats.” The listener can try the card or **Play** again, choose another station, or refresh the page.

## Low-fidelity wireframe content

These blocks specify placement and labels, not typography, artwork style, or color. `□` represents a square artwork image or its fallback. In Figma, make grayscale frames for default desktop and mobile views, the visible-scrollbar case, card hover, and the state variations below.

### A1. Desktop Listen, idle

```text
┌──────────────────────────────────────────────────────────────┐
│ App name                                                     │
├──────────────────────────────────────────────────────────────┤
│ Pick a station                                               │
│ Continuous music for your work session.                      │
│                                                              │
│ ┌─────────────────────────┐  ┌─────────────────────────┐     │
│ │ □  Future Garage        │  │ □  Lo-Fi Beats          │     │
│ │    Atmospheric, rhythmic│  │    Warm, steady         │     │
│ └─────────────────────────┘  └─────────────────────────┘     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Nothing playing                 Volume [────●──] [Mute]      │
└──────────────────────────────────────────────────────────────┘
```

### A2. Desktop Listen, playing

```text
┌──────────────────────────────────────────────────────────────┐
│ App name                                                     │
├──────────────────────────────────────────────────────────────┤
│ Pick a station                                               │
│                                                              │
│ ┌─────────────────────────┐  ┌─────────────────────────┐     │
│ │ □  Future Garage        │  │ □  Lo-Fi Beats          │     │
│ │    On air               │  │    Warm, steady         │     │
│ └─────────────────────────┘  └─────────────────────────┘     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ □ Future Garage · Playing [Pause] Volume [──●────] [Mute]    │
└──────────────────────────────────────────────────────────────┘
```

The idle volume control may set a starting level before playback. Clicking Lo-Fi Beats stops Future Garage immediately. The Lo-Fi Beats card becomes current, and the player shows its artwork and **Loading**. When its audio starts, the status changes to **Playing**.

### A3. Desktop Listen, 12-station overflow case

```text
┌──────────────────────────────────────────────────────────────┐
│ App name                                                     │
├──────────────────────────────────────────────────────────────┤
│ Pick a station                                               │
│ ┌─────────────────────────┐  ┌─────────────────────────┐ ┌─┐ │
│ │ □  Future Garage        │  │ □  Lo-Fi Beats          │ │█│ │
│ │    On air               │  │    Warm, steady         │ │█│ │
│ └─────────────────────────┘  └─────────────────────────┘ │█│ │
│ ┌─────────────────────────┐  ┌─────────────────────────┐ │░│ │
│ │ □  Additional station A │  │ □  Additional station B │ │░│ │
│ └─────────────────────────┘  └─────────────────────────┘ └─┘ │
│       8 more cards below; only this station area scrolls     │
├──────────────────────────────────────────────────────────────┤
│ □ Future Garage · Playing [Pause] Volume [──●────] [Mute]    │
└──────────────────────────────────────────────────────────────┘
```

The right-edge track and thumb appear only because the cards overflow. The 12-card frame represents a later catalog, not the first-release catalog. The same scrollbar rule applies if even two cards overflow a short viewport.

### A4. Mobile Listen, playing

```text
┌──────────────────────────┐
│ App name                 │
├──────────────────────────┤
│ Pick a station           │
│ ┌──────────────────────┐ │
│ │ □  Future Garage     │ │
│ │    On air            │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ □  Lo-Fi Beats       │ │
│ │    Warm, steady      │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ □ Future Garage · Playing│
│ [Pause] [Mute] [Volume]  │
└──────────────────────────┘
```

On narrow screens, the player is a compact persistent bar with square artwork, station, state, play/pause, and mute. Its **Volume** control opens within the player or a small panel; a listener does not need to navigate away to adjust it. The chooser remains directly above the bar and scrolls vertically when needed, with its scrollbar on the right edge.

### State variants to draw on the selected structure

| State | Required visible content and action |
| --- | --- |
| Idle | Every available station card offers Tune In with no action text printed on it; player says **Nothing playing** and shows no station artwork. |
| Loading | Selected card and player show **Loading**; player shows that station's square artwork. |
| Playing | Current card says **On air**; player shows matching artwork, **Playing**, **Pause**, volume and mute. |
| Paused | Player keeps current artwork and says **Paused**, with **Play**, volume and mute; card has no **On air** label. |
| Playback error | Show a plain text error for the selected station; keep **Play** and station cards available. No separate error action appears. |
| Station chooser empty | Show plain text such as “Stations could not load. Refresh the page.” |
| Chooser overflow | Show the right-edge scrollbar and keep the player fixed; remove the scrollbar when all cards fit. |
| Card hover | A card offering Tune In grows slightly on hover. The current playing card does not suggest another action. |

If metadata is present, test long titles, different languages, and missing metadata in the player. Station artwork, name, and state must remain readable in every case.

## Interaction rules

- Clicking or tapping a station card uses Tune In. The player keeps play/pause and sound controls available on desktop and mobile.
- Show playback status in text. A station must not say **Playing** before its audio starts, and an error is plain text without a new button.
- Playback starts only from a user action. Page load and tab return do not start audio.

## Phase 2 review and exit criteria

Create grayscale Figma frames from the layouts and state variants above. Test them with the five task prompts in this document before Phase 3 visual exploration. The structural choice is ready to advance when participants can:

1. Find and start either station without instruction, with a plausible path to first audio in roughly ten seconds.
2. Tell which station is selected and whether audio is loading, playing, paused, or showing an error.
3. Tune In to another station, observe the old station stop immediately, and try again through the card or **Play** if the new station fails.
4. Find play/pause and sound controls on desktop and mobile, and recognize the current station from its artwork, name, and status.
5. With 12 stations on desktop and mobile, reach and activate a station below the fold without losing the player; see no scrollbar when the cards fit.
6. Return after leaving the tab and understand the current state at a glance.

Record hesitation, wrong clicks, and any status language that users misunderstand. Revise the navigation and wireframes before making high-fidelity screens. The coded prototype later checks real stream startup time, browser audio restrictions, and error handling.
