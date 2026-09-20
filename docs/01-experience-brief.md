# Phase 1 specification: experience brief

**Status:** Playback model confirmed; brief for product review  
**Basis:** [Design workflow](./00-design-workflow.md) and [DI.FM](https://www.di.fm/) listening model

## Who, when, and why

**Audience:** Software engineers, students, researchers, remote digital nomads, and other knowledge workers who code, write, read, study, or analyze for long stretches. The primary setting is a desktop or laptop browser during a deep-work session; mobile listening is secondary.

**Job to be done:** “When I start a concentration session, let me get dependable background music playing in seconds, make a small adjustment if needed, and return to my work.”

**Promise:** **Pick a station. Get into your work.** The app has only two curated stations, **Future Garage** and **Lo-Fi Beats** (with future possibility to extend the list to 10+ stations). A listener chooses one and tunes into continuous music. The app remains quiet visually and needs little attention during a 30-minute to multi-hour session.

| Station | Intended feel | Curation guardrail |
| --- | --- | --- |
| Future Garage | Atmospheric, rhythmic, forward-moving | Keep energy and transitions suitable for sustained concentration. |
| Lo-Fi Beats | Warm, steady, unobtrusive | Limit abrupt changes and attention-grabbing moments. |

These are curation goals, not claims that music improves performance. Favor consistent loudness and limited spoken content where feasible. The stations should be distinct enough to choose quickly without further filters.

## Experience rules

1. **Start quickly:** Show both stations immediately and make starting either one a clear action.
2. **Stay in the background:** Avoid prompts, motion, or choices that interrupt work.
3. **Make state obvious:** Show the active station and whether playback is playing, paused, loading, or unavailable.
4. **Use familiar controls:** Provide play/pause, station switching, and volume or mute, with keyboard access and visible feedback.

The intended tone is calm, focused, warm, and subtly nocturnal. Specific colors, artwork, layout, and screens belong to later design phases.

## Boundaries

**Playback model:** Continuous curated radio, confirmed for Phase 1. Listeners tune into a station; they do not manage individual tracks. Seeking, skipping, previous/next, and queue editing are outside the first release. Current-track metadata may appear if it is reliable, but station and playback status take priority.

**First-release scope:** No account requirement, recommendations, social features, uploads, payments, user-created playlists, or complex library. Playback starts after an explicit user action. Returning to the tab should make the current state and controls clear. A station switch should give immediate feedback while the new station loads.

DI.FM is a reference for choosing a channel and listening continuously, not a source of licensed audio, branding, or UI assets. Audio rights and delivery must be resolved before a public playable release. DI.FM’s [help page](https://www.di.fm/contact) describes tuning in through a channel, and its [Future Garage page](https://www.di.fm/futuregarage) illustrates that structure.

## Success criteria to validate later

| Measure | Target |
| --- | --- |
| First audio | About 10 seconds from opening the app on a typical connection, after a station choice. |
| Decision load | A first-time listener can choose and start either station without a tutorial or account. |
| State clarity | A returning listener can identify the selected station and playback state at a glance. |
| Work compatibility | Routine listening needs no further interaction; listeners do not find the interface or transitions distracting. |
| Switching | A listener can change stations without menus or queue management. |

**Phase 1 exit:** Agree on this audience, promise, two-station scope, radio model, and validation targets. Phase 2 turns them into user flows, navigation, and wireframes.

**Workflow reconciliation:** The source workflow includes a broader relaxation audience and an example MVP with playlists, seeking, and queues. This brief narrows the use case to deep work and adopts the confirmed continuous-radio model. DI.FM also offers [track skipping](https://www.di.fm/premium?in_app=1), but the first release omits it to keep listening simple.
