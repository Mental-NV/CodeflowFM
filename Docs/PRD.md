# Codeflow FM — Product Requirements Document (PRD)

Version: 1.2  
Status: Aligned and cleaned for implementation  
Product: Codeflow FM  
Document owner: Product / Design  
Primary platform: Responsive web app  
Frontend: React + TypeScript  
Backend: ASP.NET Core + Minimal API

---

## 1. Document Purpose

This PRD defines the product requirements for Codeflow FM, a radio-style focus music app for developers, creators, students, and other knowledge workers. It translates the existing brand direction into an implementable product specification covering problem statement, goals, target users, functional requirements, non-functional requirements, information architecture, data model, API surface, success metrics, rollout plan, and delivery scope.

The product direction is derived from the Codeflow FM brand book: Codeflow FM should be calm, precise, minimal, atmospheric, and optimized for fast entry into focused work. The product should prioritize curated stations, low cognitive load, dependable playback, and an immediate start experience rather than catalog exploration or social engagement.

---

## 2. Product Summary

Codeflow FM is a station-first music application designed around one core loop:

1. Open app.
2. Select a genre station.
3. Start listening immediately.
4. Stay in flow with minimal interaction.

The app is not intended to behave like a general-purpose streaming service. It is a curated radio experience for deep work. Users should not need to search a large catalog, manage playlists, or spend time choosing among too many options. The interface and system behavior should reinforce ritual, continuity, and editorial trust.

---

## 3. Problem Statement

Most music products are optimized for exploration, novelty, and content engagement. That creates friction for users who are trying to start work quickly. They must browse, compare, search, and decide before they can begin listening. This delays the start of a work session and adds cognitive overhead.

For coding and deep work, users often want the opposite:

- a small set of dependable listening options,
- immediate playback,
- stable atmosphere,
- minimal interface noise,
- consistent use over time.

Codeflow FM exists to reduce that friction by offering curated genre stations that work like radio channels for focus sessions.

---

## 4. Product Vision and Positioning

### 4.1 Vision
Become the default audio companion for deep work.

### 4.2 Mission
Help people enter and sustain flow through curated music stations designed for coding, concentration, and calm momentum.

### 4.3 Positioning Statement
Codeflow FM is a radio-style productivity music app for developers and focused professionals who want curated stations that help them start working faster and stay in flow longer.

### 4.4 Product Promise
Select a station. Enter flow. Playback should begin in seconds with almost no setup.

### 4.5 Core Differentiator
Unlike playlist-first or catalog-first streaming products, Codeflow FM is optimized around instant station playback for focus work rather than discovery-heavy browsing.

---

## 5. Goals and Non-Goals

### 5.1 Business Goals

1. Launch a distinctive product in the productivity-audio category.
2. Maximize successful first-play starts for new visitors.
3. Establish repeat session behavior and ritualized use.
4. Build a backend and frontend foundation that can support premium features later.
5. Create a product that feels native to developer culture and premium dark-mode workflows.

### 5.2 User Goals

1. Start focus music immediately.
2. Choose a station without decision fatigue.
3. Keep music running with minimal interruption.
4. Switch stations quickly without losing momentum.
5. Trust the service to provide a stable, calm work atmosphere.

### 5.3 Non-Goals for MVP

1. Full music catalog browsing.
2. Playlist creation and editing.
3. Social features, chat, comments, or collaborative listening.
4. Complex discovery feeds or algorithmic home timelines.
5. Native mobile apps.
6. Offline listening.
7. Rich visualizers that compete for attention.
8. Station search.
9. Focus timer.
10. Geo-restriction controls or rights-management workflows.

---

## 6. Target Users

### 6.1 Primary Audience

- Software engineers
- Product designers
- Startup founders
- Writers
- Students
- Researchers
- Remote knowledge workers

### 6.2 Secondary Audience

- Video editors
- Data analysts
- Game developers
- Digital nomads
- Anyone doing sustained laptop-based work

### 6.3 User Mindset

Users want a reliable audio environment that supports work rather than demands attention. They value speed, simplicity, consistency, and restrained design. They are less interested in endless content choice and more interested in entering a repeatable work rhythm.

### 6.4 Jobs to Be Done

- Help me start a focused work session.
- Reduce distraction while I code.
- Make my workspace feel calmer and more intentional.
- Give me a simple listening ritual that supports concentration.

---

## 7. Product Principles

### 7.1 Immediate Start
A new user should be able to reach playback with one primary decision: station selection.

### 7.2 Low Cognitive Load
The interface should be shallow, predictable, and low-noise. Every extra choice must justify itself.

### 7.3 Editorial Trust
Stations should feel curated and intentional. Their presentation should signal quality and consistency.

### 7.4 Calm Continuity
Playback continuity matters more than novelty. The UI should avoid sudden, distracting changes.

### 7.5 Technical Precision
Playback state, buffering state, errors, and reconnect behavior must be accurate and deterministic.

### 7.6 Atmosphere With Restraint
The product should be immersive without becoming decorative or visually loud.

---

## 8. Assumptions

1. Music stations are available as stream endpoints from a trusted source or internal media pipeline.
2. Track metadata is available for currently playing content, even if it updates independently from the audio stream.
3. The first release is a web app optimized for desktop and laptop usage, with responsive support for tablets and mobile browsers.
4. Authentication is handled with Google Sign-In on the frontend and JWT Bearer validation on the backend.
5. Public listening is allowed without sign-in in order to preserve low-friction playback. Authentication is required for account-linked features.
6. Music catalog is curated from royalty-free sources; the product does not require per-track licensing workflows or geo-rights enforcement.
7. There are no geographic restrictions on stream availability in the product specification.
8. Favorites are out of MVP scope and reserved for a later phase.

---

## 9. Success Metrics

### 9.1 North Star Metric
Weekly active listening sessions per active user.

### 9.2 Core Product Metrics

1. **Open-to-play rate**: percentage of sessions where playback begins within 30 seconds of app open.
2. **Successful playback start rate**: percentage of play attempts that successfully enter playing state.
3. **Median time to first audio**: time from first render to confirmed playback.
4. **Average listening duration** per session.
5. **Repeat listener rate**: percentage of users who return within 7 days.
6. **Station switch rate** within first 5 minutes.
7. **Buffering failure rate** and reconnect success rate.
8. **Player error rate** by browser/device.
9. **Recently played reuse rate**.
10. **Session completion proxy**: percentage of sessions lasting more than 20 minutes.

### 9.3 Design Quality Metrics

1. Task completion rate for “start listening.”
2. Perceived simplicity in qualitative testing.
3. User-reported fit for focused work.
4. UI comprehension of station cards and global player.

---

## 10. Scope

### 10.1 MVP Scope

#### Included

- Google authentication
- Public listening without mandatory sign-in
- Station browsing screen
- Editorial station cards
- One-click station playback
- Global audio player
- Live / On Air state
- Current track metadata
- Volume and mute controls
- Recently played stations
- Session persistence across refresh when possible
- Basic playback error handling and auto-reconnect
- Responsive UI
- Basic analytics instrumentation
- Backend APIs for stations, playback metadata, recent stations, preferences, auth bootstrap, and health status

#### Excluded

- Playlists
- Social features
- Search across full catalog or station search
- Advanced library management beyond curated browsing
- Favorites
- Personalized recommendations beyond simple heuristics
- Native mobile apps
- Offline support
- Rich account settings system
- Focus timer
- Geo-restriction controls or country-based availability gates
- Music licensing management workflows

### 10.2 Post-MVP / Future Scope

- Favorites and pinned stations
- Suggested frequencies / personalized station recommendations
- Listening history insights
- Keyboard shortcuts and command palette integration
- Mini player mode
- Premium subscription
- Team/workspace listening experiences
- Native desktop/mobile clients

---

## 11. Primary User Flows

### 11.1 First-Time User Flow

1. User lands on app homepage.
2. User sees hero framing and station directory above the fold.
3. User clicks a station card.
4. Stream starts.
5. Global player appears active.
6. Current station marked On Air.
7. Track metadata loads.
8. Recently played station is stored locally and queued for server sync if the user signs in.

**Success condition:** user hears audio in under 10 seconds.

### 11.2 Returning User Flow

1. User opens app.
2. App restores previous station if autoplay is permitted and policy-compliant, or offers a clear “Continue Session” CTA.
3. If the user is authenticated, synced recents and preferences hydrate after local restore.
4. User resumes playback.

**Success condition:** user resumes work with less friction than first-time flow.

### 11.3 Station Switching Flow

1. User is currently listening.
2. User browses directory or recent stations.
3. User selects another station.
4. Existing stream stops cleanly.
5. New stream starts.
6. Player and track metadata update.

**Success condition:** station switch occurs quickly with clear feedback and no ambiguous state.

### 11.4 Playback Error Recovery Flow

1. Playback fails or stream disconnects.
2. Player enters recoverable error or reconnecting state.
3. App retries automatically using bounded backoff.
4. If recovery fails, user sees compact error messaging with retry option.

**Success condition:** most transient failures recover without manual intervention.

---

## 12. Information Architecture

### 12.1 Top-Level Navigation

- Home / Stations
- Recently Played
- Account
- Optional About / Product intro

### 12.2 Primary Screens

1. Station Directory / Home
2. Expanded Now Playing panel
3. Recently Played view
4. Account surface for sign-in state and profile basics
5. Optional lightweight onboarding / landing state
6. Error and empty states

### 12.3 IA Principles

- Avoid deep nesting.
- Keep player globally available.
- Keep discovery secondary to instant start.
- Use station terminology consistently.
- Preserve radio language like “On Air,” “Stations,” and “Session” where it helps comprehension.

---

## 13. Feature Requirements

### 13.1 Station Directory

The station directory is the product’s primary decision surface.

#### Functional Requirements

- System shall display the full supported station list.
- Each station shall have a name, short descriptor, slug/key, artwork or visual treatment, stream endpoint, active state, and sort order.
- User shall be able to start playback directly from a station card.
- Current active station shall be visually distinct.
- Directory shall support responsive layouts.
- Editorial order shall be the default ordering.
- Recently played stations may be surfaced above or adjacent to the main grid.

#### MVP Station List

- Ambient
- Chillhop
- Chillout
- Chillout Dreams
- Chillstep
- Downtempo Lounge
- Future Garage
- Lo-Fi Hip-Hop
- Lo-Fi Lounge & Chill
- Lounge
- Minimal
- Psybient
- PsyChill
- Space Music
- Vocal Chillout

#### Editorial Descriptors

- Ambient — Quiet concentration
- Chillhop — Relaxed momentum
- Chillout — Smooth focus
- Chillout Dreams — Soft immersion
- Chillstep — Driven calm
- Downtempo Lounge — Elegant productivity
- Future Garage — Nocturnal flow
- Lo-Fi Hip-Hop — Everyday coding
- Lo-Fi Lounge & Chill — Warm background focus
- Lounge — Refined work mode
- Minimal — Clean mental space
- Psybient — Expansive concentration
- PsyChill — Creative drift
- Space Music — Deep atmospheric work
- Vocal Chillout — Airy motion

#### Acceptance Criteria

- User can identify all stations at a glance.
- Clicking a station triggers playback and updates active state.
- Active state remains synchronized with player state.
- Directory remains usable on desktop and mobile widths.

---

### 13.2 Global Audio Player

The player must be persistently available and minimal.

#### Functional Requirements

- System shall expose play/pause.
- System shall show current station name.
- System shall show current track artist/title when metadata is available.
- System shall show playback state: idle, buffering, playing, paused, reconnecting, error.
- System shall support volume control and mute toggle.
- System shall support opening an expanded now-playing panel.
- Playback shall continue while navigating between screens within the app.
- System shall attempt reconnect on transient failures.
- Player state shall persist across refresh when possible.

#### Acceptance Criteria

- Playback state in UI matches actual media-layer state.
- Volume changes take effect immediately.
- Reconnect attempts are visible but not noisy.
- Error state includes a retry affordance.

---

### 13.3 Now Playing / Expanded Player Panel

This is a lightweight expanded view, not a distraction-heavy media page.

#### Functional Requirements

- Show station artwork/branding treatment.
- Show track artist/title.
- Show station descriptor.
- Show current state: On Air / Live.
- Show larger playback controls and volume.
- Show optional recent tracks if metadata is available and low effort to support.

#### Acceptance Criteria

- Expanded panel adds clarity without introducing unnecessary complexity.
- Closing the panel returns user to prior context without interrupting playback.

---

### 13.4 Recently Played

Recently played exists to reduce friction for repeat use.

#### Functional Requirements

- System shall store recently played stations locally for fast client-side restore.
- System shall sync recent stations server-side for authenticated users.
- Recently played shall display last played timestamp where useful.
- User shall be able to restart a recent station with one click.
- User shall be able to clear recent history locally and, when applicable, server-side.

#### Acceptance Criteria

- User sees at least last 3 to 10 stations depending on use behavior.
- Selecting a recent station behaves the same as selecting from directory.

---

### 13.5 Session Persistence

#### Functional Requirements

- System shall remember last selected station in local storage or equivalent client persistence.
- System shall remember volume and mute preference.
- If autoplay is blocked by browser policy, app shall restore state and prompt user with Continue Session instead of failing silently.
- If the user is authenticated, server-side preferences may refine local state after client boot.

#### Acceptance Criteria

- Refreshing app does not erase obvious user context.
- Restore logic respects browser autoplay constraints.

---

### 13.6 Station Browsing Only

Codeflow FM shall not include station search in MVP or in the baseline product specification. Station discovery is browse-only and intentionally editorial.

#### Functional Requirements

- Users shall discover stations via curated browse surfaces only.
- System shall not expose a search box, search endpoint, or typeahead for stations.
- Editorial ordering, descriptors, grouping, and recently played surfaces shall carry discovery needs.
- Station count and IA shall remain small enough that search is unnecessary.

---

### 13.7 Authentication

Authentication is in scope for MVP.

#### Functional Requirements

- Frontend shall support Google Sign-In.
- Backend shall validate Google-issued JWTs using ASP.NET Core JWT Bearer authentication.
- Protected endpoints shall require a valid Bearer token.
- Public station and now-playing endpoints shall remain public for low-friction listening.
- On successful sign-in, the system shall create or update the user profile record.
- Authentication flow shall support silent session restore when the Google session remains valid.
- Sign-out shall clear local app session state and token material related to authenticated features.

#### Technical Notes

- Use ASP.NET Core authentication middleware with JwtBearerDefaults.AuthenticationScheme.
- Validate issuer, audience, expiration, and signature against Google identity configuration.
- Map stable Google subject identifier to internal user identity.
- Keep authorization minimal in MVP: authenticated user endpoints and admin-only operations separated by role/claim.

---

### 13.8 Analytics

#### Required Events

- app_opened
- station_impression
- station_selected
- playback_requested
- playback_started
- playback_paused
- playback_resumed
- playback_failed
- playback_reconnected
- station_switched
- recent_station_selected
- now_playing_opened
- session_restored
- volume_changed
- sign_in_started
- sign_in_completed
- sign_out_completed

Each event should include station key where applicable, timestamp, client session ID, browser/device metadata, and relevant latency or error details.

---

## 14. User Stories

### Core Listening

- As a first-time user, I want to click one station and hear music immediately so I can start working without delay.
- As a returning user, I want the app to remember my last station so I can resume my routine quickly.
- As a listener, I want clear playback state so I know whether the stream is buffering, playing, or broken.
- As a user in a flow state, I want to switch stations quickly without navigating away or managing playlists.

### Trust and Usability

- As a user, I want station names and descriptors to be clear so I can choose based on mood quickly.
- As a user, I want errors to be recoverable so temporary stream issues do not end my session.
- As a user, I want the interface to feel calm and minimal so it supports focus instead of distracting me.

### Account-Linked Experience

- As a signed-in user, I want my recent stations and preferences to sync so my routine is portable across devices.

---

## 15. Functional Requirements by System Component

### 15.1 Frontend Requirements

#### App Shell
- Must load quickly and render initial station directory skeletons while data is fetched.
- Must preserve global player across route changes.
- Must support dark theme as default primary experience.

#### State Management
- Must maintain a single source of truth for current station, playback state, volume, mute state, metadata, and recent stations.
- Should separate remote data state from player runtime state.

#### Audio Layer
- Should use HTMLAudioElement initially unless advanced streaming needs require a different media engine.
- Must handle browser autoplay restrictions gracefully.
- Must support stream teardown and restart on station switch.

#### Error Handling
- Must display compact, actionable messages.
- Must not trap user in ambiguous spinner-only states.

### 15.2 Backend Requirements

#### Station Service
- Must return published stations with metadata required by frontend.
- Must allow editorial ordering.
- Must support active/inactive station toggling for operations.

#### Authentication Service
- Must support Google identity token exchange/validation path appropriate to chosen frontend sign-in approach.
- Must issue or accept JWT Bearer tokens for API access using ASP.NET Core authentication middleware.
- Must attach authenticated user context to preference and recent activity endpoints.

#### Playback Metadata Service
- Must return current track metadata by station.
- Should return timestamps for metadata freshness.
- Should degrade gracefully when metadata is unavailable.

#### Music Sourcing Constraint
- Catalog is limited to curated royalty-free music.
- System does not require licensing entitlement checks, territory checks, or per-user rights evaluation.

#### Recent Activity / Preferences
- Backend shall store last played station and preferences for authenticated users.
- Client shall keep a local cache of last played station and preferences for fast restore regardless of auth state.

#### Health and Ops
- Must expose health endpoint.
- Should expose readiness/liveness endpoints for deployment.
- Should support structured logs and correlation IDs.

---

## 16. Non-Functional Requirements

### 16.1 Performance

- Initial route usable within 2 seconds on a standard broadband desktop connection.
- Station directory API should return within 500 ms p95 under expected load.
- Playback request to audio start should target under 3 seconds median, subject to stream source constraints.
- Metadata polling or subscriptions must not degrade UI responsiveness.

### 16.2 Reliability

- Player should recover automatically from transient failures where possible.
- API uptime target for MVP: 99.5% or better.
- Frontend should fail gracefully if metadata is stale or absent.

### 16.3 Accessibility

- WCAG 2.1 AA target for core screens.
- Keyboard navigation required for station selection and player controls.
- Visible focus states required.
- Screen reader labels required for controls and playback state.
- Contrast must remain sufficient within dark theme.

### 16.4 Security

- All APIs served over HTTPS.
- Rate limiting for public endpoints as needed.
- Avoid exposing sensitive stream provider credentials in client.
- JWTs and frontend auth artifacts must be stored securely.
- Structured audit logging for privileged admin actions.

### 16.5 Privacy

- Unauthenticated listening must be clearly separated from authenticated account features.
- Analytics should avoid collecting unnecessary personal data.
- User preference storage should be documented transparently.

### 16.6 Maintainability

- Frontend must use typed API contracts.
- Backend endpoints should be versionable.
- System should separate station configuration from deployed code where practical.

---

## 17. Content and Editorial Requirements

The station list is part of the product identity and should be treated as curated content, not a raw taxonomy.

### Requirements

- Each station must have a stable public name and internal key.
- Each station should have a descriptor.
- Each station may have artwork or mood treatment.
- Editorial order should be configurable.
- Marketing or product copy should remain concise, calm, and low-hype.

---

## 18. UX Requirements

### 18.1 Visual Direction

The app should follow the brand book’s recommended direction: developer-native premium with late-night FM atmosphere. That implies dark UI surfaces, restrained luminous accents, subtle signal/broadcast motifs, precise typography, and low visual noise.

### 18.2 Interaction Principles

- Primary actions should be obvious and few.
- Playback controls should be always accessible but visually subordinate to the station directory when not in use.
- Motion should be restrained and communicative, not decorative.
- Empty states and error states should be short and composed.
- Radio language should appear where it clarifies rather than theatrically branding every element.

### 18.3 UI Labels

Recommended terms include:
- Stations
- On Air
- Now Playing
- Recently Played
- Continue Session
- Switch Station
- Start Listening

---

## 19. Technical Architecture Overview

### 19.1 Frontend

#### Stack
- React
- TypeScript
- Vite or equivalent build system
- React Router for routes if multi-page shell is needed
- TanStack Query or equivalent for server-state management
- Zustand, Redux Toolkit, or equivalent for player runtime state
- CSS strategy: Tailwind CSS or CSS modules; dark theme first

#### Frontend Modules
- App shell
- Station directory
- Station card
- Global player
- Expanded now-playing panel
- Recent stations module
- Account/auth module
- API client layer
- Analytics instrumentation layer

### 19.2 Backend

#### Stack
- ASP.NET Core
- Minimal API
- Optional Entity Framework Core for persistence if user accounts/preferences exist
- In-memory or distributed cache for metadata acceleration if needed

#### Backend Modules
- Stations endpoints
- Playback metadata endpoints
- Preferences / recent activity endpoints
- Auth bootstrap / user profile endpoints
- Health endpoints
- Admin/configuration endpoints later

---

## 20. Proposed Data Model

### 20.1 Station

```json
{
  "id": "uuid",
  "key": "ambient",
  "name": "Ambient",
  "descriptor": "Quiet concentration",
  "description": "Calm atmospheric sound for deep focus",
  "streamUrl": "https://...",
  "artworkUrl": "https://...",
  "sortOrder": 1,
  "isActive": true,
  "accentColor": "#4DA3FF",
  "tags": ["focus", "ambient"],
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z"
}
```

### 20.2 Current Track Metadata

```json
{
  "stationKey": "ambient",
  "trackTitle": "Esperdrome",
  "artistName": "Simon Wilkinson",
  "startedAt": "2026-04-01T00:00:00Z",
  "durationSeconds": 320,
  "fetchedAt": "2026-04-01T00:02:10Z",
  "isLive": true
}
```

### 20.3 Client Session Preference

```json
{
  "lastStationKey": "minimal",
  "volume": 0.65,
  "isMuted": false,
  "recentStations": ["minimal", "ambient", "future-garage"],
  "updatedAt": "2026-04-01T00:00:00Z"
}
```

### 20.4 User Profile

```json
{
  "userId": "uuid",
  "googleSubject": "string",
  "email": "user@example.com",
  "displayName": "Ada Lovelace",
  "avatarUrl": "https://...",
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z"
}
```

### 20.5 User Preference

```json
{
  "userId": "uuid",
  "lastStationKey": "ambient",
  "volume": 0.75,
  "theme": "dark",
  "updatedAt": "2026-04-01T00:00:00Z"
}
```

---

## 21. API Requirements

Suggested REST-style Minimal API endpoints.

### 21.1 Public Endpoints

#### GET /api/v1/stations
Returns all published stations in editorial order.

#### GET /api/v1/stations/{key}
Returns full station detail.

#### GET /api/v1/stations/{key}/now-playing
Returns current track metadata.

#### GET /api/v1/health
Health status.

#### POST /api/v1/auth/google
Optional backend exchange/verification endpoint if the frontend sends Google ID tokens for server-side validation and session bootstrap.

### 21.2 Authenticated Endpoints

#### GET /api/v1/me
Returns authenticated user profile.

#### GET /api/v1/me/preferences
Returns user preferences.

#### PUT /api/v1/me/preferences
Updates preferences.

#### GET /api/v1/me/recent-stations
Returns recent stations.

#### POST /api/v1/me/recent-stations
Adds station to recent history.

### 21.3 Admin Endpoints (Later)

#### POST /api/v1/admin/stations
Create station.

#### PUT /api/v1/admin/stations/{key}
Update station.

#### POST /api/v1/admin/stations/reorder
Update editorial order.

---

## 22. API and Client Behavior Contracts

### Station Fetching
- Frontend should fetch station list on app load.
- Results may be cached briefly, but not so long that disabled stations remain visible for extended periods.

### Metadata Polling
- Current-track metadata may be polled every 15 to 30 seconds while playing, or updated via server push if infrastructure allows.
- Metadata failures must not stop audio playback.

### Error Semantics
- 404 for unknown station.
- 503 for upstream metadata provider unavailable.
- Health endpoint should distinguish degraded upstream metadata from total service failure.

### Geography Policy
- APIs and playback flows shall not enforce country-based restrictions.
- Station availability is global unless a future operational constraint explicitly overrides this PRD.

---

## 23. State Model

### 23.1 Playback States

- Idle
- Loading
- Buffering
- Playing
- Paused
- Reconnecting
- Error

### 23.2 Station State Rules

- Only one station can be active at a time.
- Active station must correspond to current stream URL.
- UI must not show two stations as On Air simultaneously.

### 23.3 Restore Rules

- If last station exists and autoplay is allowed, app may resume automatically.
- If autoplay is blocked, app should restore visual state and offer resume action.
- If saved station is no longer active, app should clear invalid state and fall back to directory.

---

## 24. Acceptance Criteria Summary

### 24.1 MVP Release Acceptance

MVP is ready when:

1. A new user can open the app and start a station in one click.
2. Playback succeeds reliably across modern Chromium, Safari, and Firefox browsers.
3. Global player reflects correct states and recovers from transient failures.
4. Recently played stations are stored and reusable.
5. Station directory remains usable and visually coherent across desktop and mobile widths.
6. Basic analytics can measure adoption, success, and failure in the core listening loop.
7. Core accessibility standards are met for navigation and playback.
8. Backend exposes stable station, now-playing, auth, preference, and recents endpoints.
9. Google sign-in works for account-linked features without blocking public listening.

---

## 25. Edge Cases and Failure Modes

1. **Autoplay blocked**: app must not appear broken; show clear resume CTA.
2. **Metadata missing**: continue playing audio; show station info and fallback text like “Live station.”
3. **Stream source unavailable**: show recoverable error state and retry option.
4. **Station removed from config**: clear stale recent item or mark unavailable.
5. **Slow network**: show buffering state without locking UI.
6. **Volume zero vs muted**: UI must distinguish them clearly.
7. **Multiple tabs**: define whether last-interaction tab controls playback; avoid confusing race conditions.
8. **Unsupported browser behavior**: provide graceful fallback messaging.
9. **Signed-out after token expiry**: preserve public playback while gracefully downgrading account-linked features.

---

## 26. QA Requirements

### 26.1 Functional QA

- Station selection starts correct stream.
- Player controls work correctly across browsers.
- Recent stations persist after refresh.
- State restoration behaves correctly under autoplay restrictions.
- Metadata updates correctly when track changes.
- Google sign-in, sign-out, and silent restore behave correctly.
- Error and reconnect flows function as designed.

### 26.2 Responsive QA

- Desktop widescreen
- Laptop widths
- Tablet portrait/landscape
- Mobile browsers

### 26.3 Accessibility QA

- Keyboard-only station selection
- Screen reader labels for controls
- Focus visibility in dark mode
- Color contrast validation

### 26.4 Performance QA

- Time to first meaningful paint
- Time to first audio
- API response times under simulated load

---

## 27. Release Plan

### 27.1 Phase 1 — Core MVP

- Station directory
- Global player
- Now playing metadata
- Recent stations
- Client persistence
- Google authentication
- Basic analytics
- Health monitoring

### 27.2 Phase 2 — Usability Enhancements

- Better restore flows
- Improved metadata presentation
- Keyboard shortcuts
- Account polish

### 27.3 Phase 3 — Retention Features

- Favorites
- Personalized suggestions
- Account sync enhancements
- Premium subscription features

---

## 28. Risks and Mitigations

### Risk 1: Stream reliability depends on external source quality
**Mitigation:** design robust reconnect logic, cache station config, instrument playback failures, and surface degraded upstream status operationally.

### Risk 2: Product may feel too minimal if there is insufficient perceived value
**Mitigation:** emphasize quality of curation, speed, polish, metadata quality, and repeat-session features like recents and account sync.

### Risk 3: Browser autoplay policies degrade resume experience
**Mitigation:** implement explicit Continue Session prompts and restore state visually even when automatic playback is blocked.

### Risk 4: Metadata freshness may lag behind audio stream
**Mitigation:** separate audio continuity from metadata accuracy and display freshness-aware fallback states.

### Risk 5: Brand atmosphere could become visually overdesigned
**Mitigation:** keep UI hierarchy functional first and treat glow, gradients, and motion as secondary enhancement layers.

### Risk 6: Authentication adds friction or implementation complexity
**Mitigation:** keep listening public, limit auth to account-linked features, and use a minimal Google sign-in flow.

---

## 29. Resolved Product Decisions

1. **Authentication**: In scope for MVP using Google Sign-In plus backend JWT Bearer validation.
2. **Playback access**: Public listening remains available without mandatory sign-in.
3. **Station discovery**: Browse-only. No station search in MVP or baseline spec.
4. **Licensing model**: Curated royalty-free music only; no licensing workflow layer in MVP.
5. **Geographic availability**: No geographic restrictions in baseline product spec.
6. **Favorites**: Explicitly post-MVP.
7. **Focus timer**: Not in scope.

---

## 30. Recommended Delivery Priorities

### P0
- Station directory
- Player runtime
- Stream playback integration
- Current metadata
- Client persistence
- Responsive UI shell
- Google auth bootstrap
- Health endpoint
- Analytics for playback funnel

### P1
- Recently played view
- Expanded now-playing panel
- Better empty/error states
- Keyboard accessibility polish
- Server sync for recents/preferences

### P2
- Favorites
- Preference sync enhancements
- Personalized suggestions
- Premium packaging

---

## 31. Appendix A — Brand Alignment Requirements

The product must remain aligned with the brand book. In practical terms, that means:

- The app must feel calm, precise, modern, atmospheric, intelligent, minimal, immersive, and non-intrusive.
- It must preserve the radio metaphor through stations, On Air, and session-based listening.
- It must favor dark neutral foundations with cool luminous accents and avoid high-saturation overload.
- It must sound concise, composed, and low-hype in UX copy.
- It must optimize for immediate start, calm continuity, low cognitive load, sensory restraint, and ritual quality.

---

## 32. Appendix B — Suggested Epic Breakdown

### Epic 1: Station Browsing
- Build station list endpoint
- Build station directory UI
- Build station card component
- Implement active station state

### Epic 2: Playback Core
- Implement audio engine abstraction
- Connect play/pause controls
- Add buffering and reconnect states
- Add volume/mute controls

### Epic 3: Metadata
- Build now-playing endpoint
- Poll metadata while station is active
- Display fallback states when metadata absent

### Epic 4: Persistence and Recents
- Store last station locally
- Store volume/mute
- Store and render recent stations
- Implement continue session behavior
- Sync recents/preferences for authenticated users

### Epic 5: Identity and Account Sync
- Implement Google sign-in
- Validate JWTs server-side
- Create/update user profile record
- Expose me/preferences endpoints

### Epic 6: Quality and Analytics
- Instrument analytics events
- Add health checks and structured logs
- Run accessibility and browser QA
- Optimize performance and initial load

---

## 33. Final Product Requirement Statement

Codeflow FM MVP succeeds if it delivers a dependable, low-friction station listening experience that lets a user start focus music almost instantly, stay in flow with minimal interaction, and return to the product as a repeatable work ritual. Everything in the first release should be subordinate to that goal. The product should feel less like a streaming app and more like a premium, developer-native focus radio.
