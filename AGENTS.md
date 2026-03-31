# AGENTS.md

## Project overview
Codeflow FM is a station-first focus music web app for developers and deep workers. The product should optimize for immediate playback, low cognitive load, and a calm, minimal user experience.

## Source of truth
- Product requirements: `docs/PRD.md`
- Brand and UX guidance: `docs/BRAND.md`

If implementation details conflict, follow this order:
1. `docs/PRD.md`
2. `docs/BRAND.md`
3. This `AGENTS.md`

## Repository structure
- Backend: `src/webapi`
  - ASP.NET Core
  - Minimal API
  - EF Core
  - SQLite
- Frontend: `src/spaclient`
  - React
  - TypeScript
  - Vite
  - Vite tests
- Tests: `tests`
  - xUnit

## Working rules
- Make minimal, targeted changes.
- Do not add features outside the PRD.
- Do not introduce new dependencies unless necessary.
- Do not perform broad refactors unless required for the task.
- Preserve existing folder structure unless the task explicitly requires structural changes.
- Prefer clear, maintainable code over clever abstractions.
- Update tests when behavior changes.

## Backend rules
- Keep backend code under `src/webapi`.
- Keep API routes under `/api/v1`.
- Use ASP.NET Core Minimal API patterns consistently.
- Use EF Core for data access and migrations.
- Keep persistence compatible with SQLite.
- Use dependency injection for services.
- Keep endpoint handlers thin; move business logic into services where practical.
- Do not hardcode secrets or credentials.
- Keep public playback-related flows accessible without mandatory authentication unless the PRD says otherwise.

## Frontend rules
- Keep frontend code under `src/spaclient`.
- Use TypeScript throughout.
- Use React functional components and hooks.
- Keep business logic out of presentational components where practical.
- Use typed API clients for backend communication.
- Preserve a station-first UX.
- Preserve dark, minimal, calm visual presentation.
- Do not add search, playlists, favorites, social features, or focus timer unless explicitly requested by the PRD.

## Testing and validation
Run relevant checks after changes.

### Backend
- `dotnet build src/webapi`
- `dotnet test tests`

### Frontend
- `npm --prefix src/spaclient install`
- `npm --prefix src/spaclient run build`
- `npm --prefix src/spaclient test -- --run`

## Database and migrations
- Use EF Core migrations when the data model changes.
- Keep migration names descriptive.
- Do not delete or rewrite existing migrations unless explicitly required.
- Keep local development compatible with SQLite.

## Definition of done
A task is complete when:
- relevant code builds successfully,
- relevant tests pass,
- the implementation matches the PRD,
- no unrelated files are changed,
- no obvious type or test regressions are introduced.

## Security and configuration
- Never hardcode secrets.
- Use environment variables or local configuration files excluded from source control.
- Do not commit secrets, tokens, or private keys.
- Do not commit unnecessary generated artifacts or local database files unless explicitly required.
