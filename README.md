# Codeflow FM

Codeflow FM is a station-first focus music MVP for developers and deep workers. The ASP.NET Core backend serves the React SPA from `/`, exposes the API under `/api/v1`, persists state in SQLite, and keeps public listening available without sign-in.

## Stack

- Backend: ASP.NET Core Minimal API, EF Core, SQLite
- Frontend: React, TypeScript, Vite, TanStack Query
- Tests: xUnit, Vitest, Testing Library

## Local Run

1. Install frontend dependencies:

```bash
npm --prefix src/spaclient install
```

2. Build the SPA:

```bash
npm --prefix src/spaclient run build
```

3. Run the backend host:

```bash
dotnet run --project src/webapi
```

4. Open the backend root URL shown in the console, usually `https://localhost:7xxx` or `http://localhost:5xxx`.

The backend copies `src/spaclient/dist` into `src/webapi/wwwroot` on build and includes it on publish.

## Configuration

Frontend example values live in [src/spaclient/.env.example](/Users/mental/Projects/CodeflowFM/src/spaclient/.env.example).

Common backend settings:

- `ConnectionStrings__DefaultConnection`
- `Authentication__Google__ValidAudiences__0`
- `Authentication__Google__ValidAudiences__1`
- `Metadata__ProviderAvailable`

Frontend settings:

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

Google sign-in stays optional. If `VITE_GOOGLE_CLIENT_ID` is omitted, public listening still works and account-linked sync stays hidden.

## Verification

```bash
npm --prefix src/spaclient run lint
npm --prefix src/spaclient run build
npm --prefix src/spaclient test -- --run
dotnet build src/webapi
dotnet test tests
dotnet publish src/webapi
```

## Notes

- Station metadata and seeded editorial ordering live in [src/webapi/station-catalog.json](/Users/mental/Projects/CodeflowFM/src/webapi/station-catalog.json).
- Local placeholder stream assets are served from `/media/stations/*` and can be replaced with real stream URLs through station catalog configuration.
- The published app is a single host: backend API plus static SPA.
