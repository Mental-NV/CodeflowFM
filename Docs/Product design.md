# Codeflow FM — Product Design Document

Version: 1.1  
Status: Aligned to PRD v1.2  
Product: Codeflow FM  
Document type: Product Design Document  
Primary platforms: Web responsive app  
Frontend stack: React + TypeScript  
Backend stack: ASP.NET Core + Minimal API

---

## 1. Executive Summary

Codeflow FM is a radio-style productivity music application built for developers, designers, writers, students, and other knowledge workers who need a fast path into focused work. The core interaction is intentionally simple: the user selects a genre station and music starts immediately. The product is designed to minimize decision fatigue, reduce interaction overhead, and establish a repeatable ritual for entering flow.

The experience should prioritize reliability, low cognitive load, continuity, and editorial trust over discovery-heavy streaming patterns. The product should feel like a premium focus tool rather than a general-purpose music app.

This document is aligned to the PRD and treats the PRD as the scope and policy source of truth.

---

## 2. Product Vision

### Vision
Become the default audio companion for deep work by making it effortless to start and sustain focused listening sessions.

### Mission
Help people enter and sustain flow through curated music stations designed for coding, concentration, and calm momentum.

### Product Promise
A user should be able to open the app, select a station, and begin listening in seconds with no playlist management, no search complexity, and no friction-heavy setup.

---

## 3. Product Positioning

### Category
Productivity music app / radio-style audio app for coding and deep work.

### Positioning Statement
Codeflow FM is a radio-style productivity music app for developers and focused professionals who want curated stations that help them start working faster and stay in flow longer.

### Core Differentiator
Unlike catalog-first streaming products, Codeflow FM is designed around instant station-based listening for focus work rather than infinite browsing.

### Primary Value Proposition
- Less choice paralysis
- Faster entry into deep work
- Consistent audio atmosphere
- A product that feels native to builder culture

---

## 4. Product Objectives

### Business Objectives
1. Establish a differentiated brand in the productivity-audio category.
2. Maximize successful first-play rate for new users.
3. Drive repeat listening through ritualized usage patterns.
4. Create a foundation for future monetization through premium plans, favorites, and personalized station recommendations.
5. Build a scalable station platform with clean APIs and predictable frontend behavior.

### User Objectives
1. Start a focus session immediately.
2. Find a station that matches current work energy.
3. Keep music running with minimal interruption.
4. Switch stations without losing momentum.
5. Trust the app to provide a calm, consistent work environment.

### Experience Objectives
1. Open-to-play in under 10 seconds for a new user.
2. Make the station grid understandable at a glance.
3. Keep playback controls always accessible and never visually dominant.
4. Preserve the “On Air” radio metaphor in a restrained way.
5. Maintain premium dark-mode presentation with subtle atmosphere, not flashy effects.

---

## 5. Target Audience

### Primary Audience
- Software engineers
- Product designers
- Startup founders
- Writers
- Students
- Researchers
- Remote knowledge workers

### Secondary Audience
- Video editors
- Data analysts
- Game developers
- Digital nomads
- Anyone doing sustained laptop-based work

### User Mindset
The target user wants a reliable way to begin work, background music that supports concentration rather than competes with it, and a clean product that fits into a professional workflow.

### Jobs to Be Done
- Help me start a focused work session.
- Reduce distraction while I code.
- Make my workspace feel calmer and more intentional.
- Give me a simple audio ritual that supports concentration.

---

## 6. Core Product Principles

### 6.1 Immediate Start
The user should be able to launch the app and begin playback with one primary decision: station selection.

### 6.2 Calm Continuity
Playback should feel stable. UI changes should be subtle. Interruption patterns should be minimized.

### 6.3 Low Cognitive Load
Information architecture should be shallow. Navigation should remain compact. Labels should be short and functional.

### 6.4 Editorial Trust
Stations must feel curated, not algorithmically noisy. Metadata and station descriptors should reinforce intentionality.

### 6.5 Technical Precision
Latency, buffering behavior, and playback state accuracy matter. The app should feel robust and deterministic.

### 6.6 Atmosphere Without Clutter
The interface should carry mood through spacing, typography, gradients, and motion restraint rather than decoration overload.

---

## 7. Product Scope

### 7.1 MVP Scope
The MVP focuses on the core radio listening loop plus account-linked sync for preferences and recents.

#### Included
- Station browsing via grid/list
- One-click playback start
- Global player
- Playback state management
- Current-track metadata
- Recently played stations
- Basic session persistence
- Responsive web app
- Public listening without mandatory sign-in
- Google authentication for account-linked features
- Backend station API
- Backend playback metadata API
- Preferences and recents APIs
- Basic analytics events
- Health and monitoring endpoints

#### Excluded from MVP
- Full music catalog browsing
- Playlist creation
- Social features
- Comments/chat
- Station search
- Complex recommendations
- Offline listening
- Native mobile apps
- Advanced personalization
- Multi-user collaboration
- Rich audio visualizers
- Favorites
- Focus timer
- Geographic restrictions or rights-management workflows

### 7.2 Post-MVP Scope
- Favorites and pinned stations
- Personalized suggested stations
- Listening history insights
- Keyboard shortcuts and mini player modes
- Premium plan
- Team / workspace ambient channels
- Native desktop or mobile clients

---

## 8. Feature Set

### 8.1 Station Directory
The station directory is the heart of the product. Stations should be represented as editorial objects, not generic tags.

#### Requirements
- Display all supported stations.
- Each station card includes name, descriptor, mood cue, and active state.
- Cards clearly communicate whether a station is currently playing.
- Users can start a station directly from the card.
- Sorting defaults to editorial order, not algorithmic ranking.
- Discovery is browse-only; no station search is provided.

#### Station List
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

#### Descriptor Examples
- Ambient — Quiet concentration
- Chillhop — Relaxed momentum
- Chillout — Smooth focus
- Minimal — Clean mental space
- Future Garage — Nocturnal flow

### 8.2 Global Audio Player
The player must remain available throughout the app and provide essential controls only.

#### Controls
- Play / Pause
- Current station
- Current track title and artist
- Live / On Air state
- Volume
- Mute / unmute
- Open expanded now-playing panel

#### Behavioral Requirements
- Playback persists while navigating.
- Stream reconnect is automatic on transient failure.
- UI reflects buffering, playing, paused, reconnecting, and error states accurately.
- Player state should survive refresh when technically feasible.

### 8.3 Now Playing
A lightweight now-playing surface provides contextual metadata without becoming a distraction.

#### Content
- Station name
- Station descriptor
- Track artist/title
- Playback state
- Cover art if available
- Optional elapsed-time representation if metadata quality supports it

### 8.4 Recently Played
Enable a return path into previous ritual patterns.

#### Requirements
- Persist local recent stations for all users.
- Sync recent stations for authenticated users.
- Show last played timestamp or relative freshness when useful.
- Allow quick resume.

### 8.5 Session Continuation
On app reopen, the product should gently offer the last active station.

#### Example UX
- Continue Session
- Resume Ambient
- Return to your last station

### 8.6 Authentication Surface
Authentication is in scope for MVP, but must not block core listening.

#### Requirements
- Support Google Sign-In.
- Keep playback publicly accessible.
- Sync recents and preferences for authenticated users.
- Restore sign-in state silently where possible.
- Provide clear signed-in and signed-out account states.

### 8.7 Account-Linked Preferences
MVP account features are intentionally narrow.

#### Requirements
- Sync recent stations.
- Sync volume and last-station preference where appropriate.
- Keep settings surface lightweight.

---

## 9. User Personas

### 9.1 Backend Engineer Ben
Works in long coding blocks. Wants music that stays out of the way and does not require active curation.

#### Needs
- Immediate playback
- Minimal UI noise
- Reliable stream performance
- Fast return to recent stations

### 9.2 Product Designer Dana
Uses ambient/chill stations during design execution and writing.

#### Needs
- Aesthetic interface
- Smooth station switching
- Calm atmosphere
- Light metadata visibility

### 9.3 Student Sara
Needs low-friction music for studying and assignments.

#### Needs
- Easy onboarding
- Understandable station descriptions
- Cross-device convenience when signed in
- Session continuity

### 9.4 Founder Felix
Uses the app as a ritual trigger before deep strategic work.

#### Needs
- Fast access
- Trustworthy brand feel
- No playlist maintenance
- High-quality station identity

---

## 10. Key User Flows

### 10.1 First-Time User Flow
1. User lands on homepage/app shell.
2. User sees core value proposition and station grid.
3. User clicks a station card.
4. Playback starts immediately.
5. Global player confirms current station is On Air.
6. Local recent-station state updates.

#### Success Criteria
- Time from first view to first playback is minimal.
- No account creation required for core playback.
- The product communicates simplicity and confidence.

### 10.2 Returning User Flow
1. User opens app.
2. App surfaces last station or recently played stations.
3. If autoplay is blocked, the app offers Continue Session.
4. If signed in, synced recents/preferences hydrate after boot.
5. User resumes last session or selects another station.

### 10.3 Station Switching Flow
1. User is listening to Station A.
2. User opens station browser.
3. User selects Station B.
4. Player swaps stream smoothly.
5. UI updates immediately to reflect new active station.

### 10.4 Error Recovery Flow
1. Stream fails or metadata endpoint times out.
2. Player shows a calm, precise error or reconnecting state.
3. User can retry.
4. Automatic reconnect attempts occur with bounded backoff.
5. If unrecoverable, user is encouraged to retry or switch station.

### 10.5 Sign-In Flow
1. User opens account surface.
2. User selects Google Sign-In.
3. Authentication completes.
4. Existing account-linked preferences and recents sync into the app.
5. Listening remains uninterrupted before, during, and after sign-in where possible.

---

## 11. Information Architecture

### 11.1 Primary Navigation
For MVP, navigation should remain minimal.

#### Top-Level Areas
- Home / Stations
- Recently Played
- Account
- Optional About

### 11.2 Recommended Sitemap
- `/` — Home / station directory
- `/station/:slug` — optional station deep-link page or stateful route
- `/now-playing` — expanded player view
- `/recent` — recent stations
- `/account` — sign-in state and lightweight account surface
- `/about` — brand and product info

### 11.3 IA Principles
- Keep the station directory as the default home.
- Avoid deep menu nesting.
- Keep account surfaces secondary.
- Preserve player visibility across routes.
- Do not introduce search-driven navigation.

---

## 12. UX and Visual Design Requirements

### 12.1 Visual Tone
- Dark UI base
- Premium spacing
- Minimal chrome
- Limited accent glow
- Subtle signal/broadcast motifs
- No noisy visualizers by default

### 12.2 Color Direction
Suggested foundation:
- Obsidian: primary background
- Graphite: secondary surface
- Mist: primary text
- Slate: secondary text
- Signal Blue: primary accent
- Violet Glow: atmospheric accent
- Cyan Drift: secondary accent

### 12.3 Typography
- Primary sans-serif for UI, headings, and navigation
- Monospace accent for metadata, station state, timestamps, and technical cues
- High legibility on dark surfaces
- Avoid decorative or playful typography

### 12.4 Motion
- Motion must support continuity, not attention capture.
- Use subtle transitions for hover, selection, and player state changes.
- Avoid large animated equalizers or high-velocity transitions.

### 12.5 Station Card Design
Each station card should include:
- Station name
- Short descriptor
- Mood / atmosphere signal
- Active indicator when live
- Simple interaction affordance

#### Example States
- Default
- Hover
- Focus-visible
- Playing / active
- Loading
- Unavailable

### 12.6 Copy System
Use concise, low-hype language:
- Stations
- On Air
- Now Playing
- Start Listening
- Continue Session
- Switch Station
- Select your frequency

---

## 13. Functional Requirements

### 13.1 Playback
1. The system shall allow a user to start a station from the station directory.
2. The system shall support play, pause, mute, unmute, and volume adjustment.
3. The system shall display current playback state.
4. The system shall reconnect automatically on recoverable stream failure.
5. The system shall handle station switching without requiring full page reload.

### 13.2 Station Data
1. The system shall expose station metadata through a backend API.
2. The system shall provide station descriptor, artwork, stream URL reference, and status.
3. The system shall support editorial ordering.
4. The system may support deep links by station slug without requiring a dedicated search layer.

### 13.3 Track Metadata
1. The system shall display currently playing track metadata when available.
2. The system shall degrade gracefully when metadata is unavailable.
3. The system shall refresh metadata at configurable intervals.

### 13.4 Persistence
1. The system shall store recently played stations.
2. The system shall persist selected audio preferences locally.
3. The system should preserve last active station across sessions.
4. The system shall sync recent stations and key preferences for authenticated users.

### 13.5 Authentication
1. The system shall support Google Sign-In.
2. The system shall keep core playback available without mandatory sign-in.
3. The system shall validate authenticated requests server-side using JWT Bearer authentication.
4. The system shall represent signed-in and signed-out states clearly in the UI.

### 13.6 Settings
1. The system shall allow volume and mute preferences.
2. The system may allow a narrow playback-behavior preference surface where relevant.
3. The system should keep settings intentionally lightweight in MVP.

---

## 14. Non-Functional Requirements

### 14.1 Performance
- First meaningful render should be fast on modern desktop and mobile browsers.
- Station switching should feel near-immediate.
- Metadata polling should not noticeably degrade UI responsiveness.

### 14.2 Reliability
- Audio playback should recover from short network interruptions when possible.
- APIs should return stable contracts.
- Station availability monitoring should exist server-side.

### 14.3 Scalability
- Backend should support adding stations without API redesign.
- API contracts should be versionable.
- Metadata ingestion should be separable from core API serving.

### 14.4 Security
- Public stream URLs should not expose provider secrets.
- Admin endpoints must be authenticated.
- Standard ASP.NET Core security headers, rate limiting, and logging should be applied.
- Google-issued tokens must be validated correctly server-side.

### 14.5 Accessibility
- Keyboard navigable station browsing and player controls.
- Focus-visible states on all interactive elements.
- Appropriate contrast ratios.
- Screen-reader compatible labels for player status and controls.
- Avoid motion patterns that impair usability.

### 14.6 Observability
- Centralized logging
- Health checks
- API metrics
- Playback error telemetry
- Client-side analytics for key funnel events

---

## 15. Technical Architecture Overview

### 15.1 Frontend Architecture
#### Stack
- React
- TypeScript
- Vite or equivalent modern bundler
- React Router
- TanStack Query for server state
- Zustand or Redux Toolkit for player/app state
- Tailwind CSS or CSS modules for styling
- HTML5 Audio / HLS integration depending on stream format

#### Frontend Responsibilities
- Render station directory and player UI
- Handle route-based navigation
- Manage playback state in the client
- Poll / subscribe to now-playing metadata
- Persist recent stations and local preferences
- Support Google sign-in state
- Emit analytics events

#### Suggested Frontend Module Structure
- `app/` — application bootstrapping, providers, routing
- `features/stations/` — station list, cards, station pages
- `features/player/` — audio engine, controls, state model
- `features/recent/` — recent stations
- `features/account/` — auth state, profile, sync status
- `shared/ui/` — reusable primitives
- `shared/api/` — typed API clients
- `shared/types/` — common domain types
- `shared/utils/` — helpers

### 15.2 Backend Architecture
#### Stack
- ASP.NET Core
- Minimal API
- Background services for metadata refresh / station health
- Optional Redis cache
- PostgreSQL or SQL Server for persisted app data

#### Backend Responsibilities
- Expose station catalog
- Expose now-playing metadata
- Store station configuration and editorial metadata
- Provide recent/session/preference data for authenticated users
- Validate Google-authenticated requests
- Handle analytics ingestion or relay
- Monitor station stream health

#### Suggested Backend Components
- API layer via Minimal API endpoints
- Domain layer for station, playback metadata, and session concepts
- Infrastructure layer for database, external stream providers, caching, and monitoring
- Background worker(s) for track metadata polling and health checks

---

## 16. Domain Model

### 16.1 Core Entities

#### Station
- `Id`
- `Slug`
- `Name`
- `Descriptor`
- `Description`
- `Genre`
- `ArtworkUrl`
- `AccentColor`
- `StreamUrl`
- `IsActive`
- `SortOrder`
- `CreatedAt`
- `UpdatedAt`

#### CurrentTrack
- `StationId`
- `TrackId` (optional external reference)
- `Artist`
- `Title`
- `ArtworkUrl`
- `StartedAt`
- `DurationSeconds`
- `LastRefreshedAt`

#### UserSession
- `Id`
- `UserId` or anonymous device key
- `CurrentStationId`
- `StartedAt`
- `EndedAt`
- `LastInteractionAt`

#### RecentStation
- `Id`
- `UserId` or anonymous device key
- `StationId`
- `PlayedAt`

#### PlaybackPreference
- `UserId` or anonymous device key
- `Volume`
- `Muted`
- `AutoResumeEnabled`
- `UpdatedAt`

#### UserProfile
- `UserId`
- `GoogleSubject`
- `Email`
- `DisplayName`
- `AvatarUrl`
- `CreatedAt`
- `UpdatedAt`

---

## 17. API Design

The backend should expose a clean, predictable, versioned REST API through ASP.NET Core Minimal APIs.

### 17.1 Endpoint Overview

#### Public Endpoints
- `GET /api/v1/stations`
- `GET /api/v1/stations/{slug}`
- `GET /api/v1/stations/{slug}/now-playing`
- `GET /api/v1/now-playing`
- `GET /api/v1/health`
- `POST /api/v1/auth/google`

#### Authenticated Endpoints
- `GET /api/v1/me`
- `GET /api/v1/me/recent-stations`
- `POST /api/v1/me/recent-stations`
- `GET /api/v1/me/preferences`
- `PUT /api/v1/me/preferences`

#### Admin Endpoints
- `POST /api/v1/admin/stations`
- `PUT /api/v1/admin/stations/{id}`
- `POST /api/v1/admin/metadata/refresh`
- `GET /api/v1/admin/station-health`

### 17.2 Example Response Models

#### `GET /api/v1/stations`
```json
[
  {
    "id": "st_ambient",
    "slug": "ambient",
    "name": "Ambient",
    "descriptor": "Quiet concentration",
    "artworkUrl": "/images/stations/ambient.jpg",
    "accentColor": "#4DA3FF",
    "isActive": true,
    "sortOrder": 1,
    "isOnAir": false
  }
]
```

#### `GET /api/v1/stations/{slug}/now-playing`
```json
{
  "stationSlug": "ambient",
  "stationName": "Ambient",
  "isOnAir": true,
  "track": {
    "artist": "Simon Wilkinson",
    "title": "Esperdrome",
    "artworkUrl": null,
    "startedAt": "2026-04-01T09:15:00Z",
    "durationSeconds": 312
  },
  "lastRefreshedAt": "2026-04-01T09:16:12Z"
}
```

### 17.3 API Design Rules
- Version all endpoints.
- Use stable slugs for public routing.
- Keep response models explicit and strongly typed.
- Return graceful nulls for unavailable metadata.
- Do not expose infrastructure internals to clients.

---

## 18. Frontend State Design

### 18.1 State Categories

#### Server State
Managed by TanStack Query:
- Station list
- Station detail
- Now-playing metadata
- Recent stations (authenticated)
- Preferences
- User profile / auth state

#### Client State
Managed by Zustand or Redux Toolkit:
- Current station
- Playback state
- Volume / muted
- Expanded player visibility
- Local recent stations for all users
- UI preferences

### 18.2 Suggested Player State Shape
```ts
interface PlayerState {
  currentStationSlug: string | null;
  playbackStatus: 'idle' | 'loading' | 'playing' | 'paused' | 'reconnecting' | 'error';
  volume: number;
  muted: boolean;
  currentTrack: {
    artist: string | null;
    title: string | null;
    artworkUrl: string | null;
    startedAt: string | null;
    durationSeconds: number | null;
  } | null;
  errorMessage: string | null;
}
```

### 18.3 Audio Engine Considerations
- Encapsulate audio behavior in a dedicated service/hook.
- Decouple UI rendering from raw media events.
- Normalize HTML audio events into a consistent player store.
- Support future migration to HLS libraries if needed.

---

## 19. Backend Design Details

### 19.1 Minimal API Organization
Use route groups by bounded context:
- `/api/v1/stations`
- `/api/v1/playback`
- `/api/v1/me`
- `/api/v1/auth`
- `/api/v1/admin`

### 19.2 Services
- `IStationService`
- `INowPlayingService`
- `IRecentStationService`
- `IPreferenceService`
- `IUserProfileService`
- `IStationHealthService`
- `IMetadataPollingService`

### 19.3 Background Jobs
- Poll external now-playing feeds
- Validate stream availability
- Refresh station cache
- Optionally warm cache for top stations

### 19.4 Data Storage Strategy
#### Likely Persistence Split
- Relational DB for editorial station data and user-specific state
- In-memory cache / Redis for volatile now-playing snapshots
- Object storage / CDN for station artwork assets

---

## 20. Authentication Strategy

Authentication is in scope for MVP, but playback remains public.

### 20.1 Public Listening Mode
- Playback available without login
- Recent stations stored locally
- Preferences stored locally

### 20.2 Authenticated Layer
- Google Sign-In
- Sync recent stations across devices
- Sync selected preferences
- Foundation for future premium entitlements and personalization

### 20.3 UX Guidance
- Do not gate first playback behind sign-in.
- Surface sign-in as enhancement, not prerequisite.
- Avoid account prompts that interrupt active listening.

---

## 21. Analytics and Measurement

### 21.1 North Star Metric
Weekly active listeners who start at least one focus session.

### 21.2 Core Product Metrics
- First-play conversion rate
- Time to first playback
- Station start count by station
- Average listening duration
- Station switch frequency
- Return rate by day/week
- Session resume rate
- Playback error rate
- Metadata success rate
- Sign-in conversion for users who choose account sync

### 21.3 Event Taxonomy
Suggested client events:
- `app_opened`
- `station_viewed`
- `station_started`
- `station_switched`
- `playback_paused`
- `playback_resumed`
- `playback_error`
- `recent_station_clicked`
- `continue_session_clicked`
- `sign_in_started`
- `sign_in_completed`
- `sign_out_completed`

### 21.4 Analytics Principles
- Measure behavior without intruding on flow.
- Keep analytics payloads lean.
- Avoid tracking that would create privacy distrust for a focus product.

---

## 22. Content and Editorial System

The station catalog should be treated as an editorial layer, not just technical stream records.

### 22.1 Editorial Fields
- Name
- Descriptor
- Short description
- Visual mood
- Ordering priority
- Accent color
- Optional tags for future recommendations

### 22.2 Descriptor Examples
Examples include Ambient as “Quiet concentration,” Chillhop as “Relaxed momentum,” Minimal as “Clean mental space,” and Future Garage as “Nocturnal flow.”

### 22.3 Governance
- Station names should remain stable.
- Descriptor language should stay concise.
- Copy should avoid hype and cliché.
- Active stations should be monitored operationally.

---

## 23. Accessibility Requirements

1. All controls must be keyboard operable.
2. Player buttons must have clear aria-labels.
3. Current station and playback state must be announced meaningfully.
4. Contrast should meet WCAG AA at minimum.
5. Hover-only affordances must not hide core controls.
6. Motion reduction preferences should be respected.
7. Focus order must remain predictable across station cards and player controls.

---

## 24. Error Handling and Edge Cases

### 24.1 Playback Errors
- Stream unavailable
- Browser autoplay restrictions
- Network loss
- Unsupported format

#### UX Response
- Provide concise error copy.
- Offer retry.
- Preserve context.
- Avoid alarming visuals.

### 24.2 Metadata Errors
- Track info unavailable
- Stale metadata
- Partial fields missing

#### UX Response
- Show station info even when track info is missing.
- Avoid blank or broken layouts.
- Fallback to “Broadcasting now” or equivalent.

### 24.3 Authentication Edge Cases
- Token expired during playback
- Silent restore failed
- User signs out while listening

#### UX Response
- Preserve public playback.
- Downgrade account-linked features gracefully.
- Avoid destructive resets of local state.

### 24.4 Empty States
Examples:
- Select a station to begin.
- Nothing playing yet.
- Start a session to enter flow.

---

## 25. Security, Privacy, and Compliance

### 25.1 Security
- Protect admin surfaces with strong authentication.
- Apply request validation and rate limiting.
- Use HTTPS everywhere.
- Secure secrets and stream provider credentials.
- Validate Google-issued tokens server-side.

### 25.2 Privacy
- Keep data collection proportional.
- Provide transparent analytics and preference handling.
- Avoid invasive behavior profiling inconsistent with the product promise.

### 25.3 Compliance
- Music sourcing is curated royalty-free.
- MVP does not require a per-track licensing workflow or geo-rights enforcement layer.
- Consent handling should match the selected analytics stack.

---

## 26. QA Strategy

### 26.1 Frontend Testing
- Unit tests for state and utility logic
- Component tests for station cards, player controls, and routing-critical UI
- End-to-end tests for start playback, switch station, resume session, and sign-in flow

### 26.2 Backend Testing
- Unit tests for services
- Integration tests for Minimal API endpoints
- Contract tests for response models
- Background worker tests for metadata refresh behavior
- Auth validation tests for JWT handling

### 26.3 Manual QA Priorities
- Browser autoplay behavior
- Playback continuity across navigation
- Responsive layouts
- Keyboard accessibility
- Error states under bad network conditions
- Sign-in and sign-out behavior during active listening

---

## 27. Delivery Phases

### Phase 1 — Foundation
- Finalize domain model
- Build station directory and player shell
- Implement station and now-playing APIs
- Add local recents and preferences
- Ship responsive MVP foundation

### Phase 2 — Identity and Continuity
- Implement Google Sign-In
- Add synced recents and preferences
- Improve continue-session behavior
- Expand analytics coverage
- Improve accessibility

### Phase 3 — Retention Features
- Favorites
- Enhanced recommendations
- Premium packaging
- Account enhancements

---

## 28. MVP Acceptance Criteria

The MVP can be considered successful when:
1. A new user can open the app and start a station in under 10 seconds.
2. The station directory clearly presents all supported genres.
3. Playback works reliably across modern desktop and mobile browsers.
4. The player remains accessible while navigating.
5. Current track metadata appears when available and degrades gracefully when unavailable.
6. The app persists recent stations and basic preferences.
7. Google sign-in works for account-linked features without blocking public playback.
8. The product visually matches the intended brand expression of calm, precise, developer-native premium.

---

## 29. Product Risks and Mitigations

### 29.1 Risk: Stream Reliability Problems
Mitigation:
- Health checks
- Retry logic
- Station availability monitoring
- Fallback messaging

### 29.2 Risk: Metadata Quality Inconsistency
Mitigation:
- Graceful UI fallback
- Cache last valid metadata briefly
- Separate metadata freshness from playback viability

### 29.3 Risk: Product Feels Too Generic
Mitigation:
- Implement station descriptors and editorial framing
- Use brand-owned language consistently
- Maintain disciplined visual tone

### 29.4 Risk: UX Bloat Over Time
Mitigation:
- Keep station-first IA
- Require strong justification for new top-level navigation items
- Protect focus-first design principles in roadmap decisions

### 29.5 Risk: Auth Adds Friction
Mitigation:
- Keep sign-in optional for listening
- Restrict MVP auth scope to sync and account identity
- Avoid blocking or interstitial account flows

---

## 30. Design Recommendations Summary

1. Lead with the station directory, not account or discovery features.
2. Make the player globally persistent and visually subordinate to station selection.
3. Use descriptors and “On Air” states to reinforce the radio metaphor.
4. Preserve a dark, premium, technical interface with restrained glow.
5. Optimize for habit formation through recent stations and session continuation.
6. Build backend contracts around stable station and now-playing models.
7. Treat sign-in as an enhancement layer, not a playback gate.
8. Treat the app as a focus ritual product, not a streaming catalog clone.

---

## 31. Final Product Definition

Codeflow FM should be implemented as a focused, station-first listening product where the UI, API, and brand all support the same core promise: select a station and enter flow. The product succeeds when it removes friction, feels editorially trustworthy, and becomes part of the user’s daily work ritual.
