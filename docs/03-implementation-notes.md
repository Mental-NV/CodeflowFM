# Static MVP implementation

## Scope and conservative assumptions

The user's implementation request takes precedence over the design workflow. Phase 1 and Phase 2 define the listening experience; the broader workflow's queue, seeking, skipping, focus mode, accounts, backend, and Figma stages are omitted.

- **One available station:** Future Garage uses the existing, enriched 57-track playlist. Lo-Fi Beats has no supplied playlist, so it is omitted. The catalog supports more stations when real playlists are available.
- **Endless radio from static MP3s:** The audio URLs are files rather than a live stream. A repeating schedule is calculated locally from the playlist's timestamp and durations. Tune In and resume join the current scheduled track and offset; subsequent tracks play in order, looping indefinitely. There is no shared backend or exact synchronization guarantee between browsers.
- **Simple frontend:** Browser-native modules and CSS are sufficient for this single screen. No framework, package dependencies, API, or authentication is required.
- **Local storage:** Save only station ID, volume, and mute state. Do not autoplay on reload or tab return. A storage failure does not prevent listening.
- **Errors:** Stop and show a short recovery message, leaving the same Play control and card available. Do not silently skip unavailable tracks or add queue controls.
- **Presentation:** A restrained dark layout with square local SVG artwork, text statuses, visible focus, reduced-motion support, and a persistent player. No external fonts or image services are needed.

## Low-fidelity structure

```text
Desktop
┌───────────────────────────────────────────────────────────┐
│ codeflow FM                              Background radio │
├───────────────────────────────────────────────────────────┤
│ Pick a station. Get into your work.                       │
│ Stations                                         1 station│
│ ┌──────────────────────────────────────┐                  │
│ │ □  Future Garage                     │                  │
│ │    Atmospheric, rhythmic…            │                  │
│ │    Continuous radio / On air         │                  │
│ └──────────────────────────────────────┘                  │
│ Station area scrolls only when content overflows.         │
├───────────────────────────────────────────────────────────┤
│ □ Station · State       [Play / Pause]   [Mute] [Volume]   │
│   Artist · Title                                         │
└───────────────────────────────────────────────────────────┘

Mobile
┌─────────────────────────────┐
│ codeflow FM                 │
├─────────────────────────────┤
│ Pick a station.             │
│ Get into your work.         │
│ Stations                    │
│ ┌─────────────────────────┐ │
│ │ □ Future Garage         │ │
│ │   Description · State   │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ □ Station · State           │
│   Artist · Title            │
│ [Play / Pause] [Mute] ──●──  │
└─────────────────────────────┘
```

Header and player remain in view. The whole card is a keyboard-accessible Tune In action, with no separate printed action label. A visible, draggable custom scrollbar appears only when the chooser overflows, including on systems that hide native overlay scrollbars.

## Checks

`npm test` covers scheduling, endless wrapping, explicit playback, no autoplay on restoration, pause/resume, station switching, stale play requests, media errors, retry, connection timeout, storage failures, and the supplied catalog. `npm run build` validates station data and produces deployable static files in `dist/`.

Implementation verification: all 14 tests passed, the supplied playlist passed its JSON Schema validation, and all frontend entry points returned HTTP 200 with the expected content types. The first and last MP3 URLs returned HTTP 206 for byte-range requests. Browser automation was unavailable in the implementation session, so rendered desktop/mobile layouts and audible browser playback still need a manual check.

Manual smoke check: start the app, click Future Garage, confirm audio and Playing, pause/resume, change volume and mute, then reload and confirm settings persist without autoplay. On a narrow viewport, confirm player controls remain reachable. With an expanded station catalog, confirm only the chooser scrolls and its thumb can be dragged. Temporarily disconnect the network to check the error and Play-to-retry flow.
