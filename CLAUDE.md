# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Eagle Eye is a full-stack geospatial intelligence dashboard. The React frontend combines live and periodically fetched domain data on a Mapbox GL JS globe, while a Bun server proxies external APIs and streams AIS and flight data over WebSockets.

The primary frontend stack is React 19, TypeScript, Vite, Mapbox GL JS, Zustand, Tailwind CSS 4, Radix UI, Recharts, and satellite.js. The backend entrypoint is `server/index.ts` and requires Bun.

## Commands

- `bun install` - Install dependencies from `bun.lock`.
- `bun run dev` - Start the Bun backend on port 4000 and Vite development server.
- `bun run dev:frontend` - Start only Vite; `/api` requests are proxied to port 4000.
- `bun run build` - Type-check with `tsc -b` and create the Vite production build.
- `bun run test` - Run Vitest in watch mode.
- `bun run test:run` - Run the complete test suite once.
- `bun run lint` - Run ESLint across the repository.
- `bun run preview` - Preview the production build.

The same package scripts can be invoked with `npm run`, but the development server still launches the Bun backend.

## Frontend Architecture

`src/main.tsx` selects one of two dynamically imported entrypoints. Normal requests load `App`; development requests with `/?design-system` load the isolated component gallery so application data hooks do not initialize. The gallery is gated by `import.meta.env.DEV`.

`src/App.tsx` initializes the domain data hooks and renders a responsive three-row grid shell:

```text
wide screens
┌──────────────────────── TopBar ────────────────────────┐
│ Tracking panel │ active view / Mapbox │ Intelligence  │
└─────────────────────── BottomBar ──────────────────────┘

small screens
┌──────────────────────── TopBar ────────────────────────┐
│             active view / Mapbox globe                │
│       tracking and intelligence open as sheets        │
└─────────────────────── BottomBar ──────────────────────┘
```

- `TopBar` provides primary navigation, region presets, source health, alert/watchlist counts, panel drawer controls, theme switching, and UTC time.
- `LeftPanel` controls tracking layers and domain filters. It is persistent from the `lg` breakpoint and opens in a left sheet below it.
- `RightPanel` displays intelligence activity. It is persistent from the `xl` breakpoint and opens in a right sheet below it.
- `BottomBar` provides the six-hour operational timeline, keyboard/pointer scrubbing, replay controls, and session status.
- `MapboxGlobeView` owns the Mapbox map, sources, layers, controls, entity interactions, visual modes, and map tools.

The current views are `Globe`, `Objects`, `Graph`, `Signals`, and `Reports`. `activeView` in `useAppStore` selects the center content.

## Data And State

Domain state is split across Zustand stores in `src/stores/`. `app-store.ts` owns global navigation, theme, timeline, and fly-to state; `selection-store.ts` owns selected map entities. Satellite, vessel, flight, weather, news, conflict, cyber, OSINT, ports, RF, economic, camera, infrastructure, alert, geofence, and watchlist concerns have dedicated stores.

Initialization hooks in `src/hooks/` connect stores to API clients, polling, WebSockets, orbital propagation, persistence, alert evaluation, and anomaly detection. Keep subscriptions narrow by selecting only the Zustand state a component needs.

The Bun server in `server/index.ts` consolidates external API access, credentials, HTTP proxy endpoints, and WebSocket relays. Frontend code should call local `/api` and `/ws` endpoints rather than expose server credentials.

## Design System

The full shared UI catalog is exported by `src/components/ui/index.ts`. It includes:

- Application shell, navbar, sidebar, breadcrumb, pagination, tabs, accordion, and timeline primitives
- Buttons, fields, labels, inputs, textarea, select, checkbox, radio group, switch, and slider controls
- Cards, badges, alerts, stats, progress, system status, skeleton, spinner, empty state, framed media, data lists, tables, and chart wrappers
- Dialog, sheet, dropdown menu, popover, command palette, tooltip, and toaster overlays

Use these primitives before creating application-specific equivalents. App-specific composites such as alert editors, source badges, pipeline errors, and OSINT modals also live under `src/components/ui/` but are not part of the shared barrel.

Design tokens and utilities are defined in `src/styles/technical-neo.css` and loaded by `src/index.css`:

- `signal` is the default dark theme.
- `schematic` is the light theme.
- The active theme is stored in `localStorage` under `eagle-eye-theme` and applied as `data-theme` on `<html>`.
- Inter is the sans-serif interface font; IBM Plex Mono is used for data and operational labels.
- Domain colors must use the semantic `--domain-*` tokens so Mapbox, charts, and UI remain consistent across themes.

The development gallery at `/?design-system` exercises representative catalog states and both themes without starting application data hooks.

## Testing

Vitest runs in jsdom with Testing Library and `@testing-library/jest-dom`; configuration is in `vite.config.ts` and setup is in `src/test-setup.ts`. Tests live beside their area in `__tests__` directories and use `*.test.ts` or `*.test.tsx` names.

Add focused interaction tests for shared UI behavior and pure unit tests for stores and library code. No browser end-to-end framework is currently configured.

## Conventions

- `@/` maps to `src/` in Vite and TypeScript.
- Use TypeScript strict mode and avoid unchecked state duplication between components and stores.
- Use semantic design-system tokens instead of hard-coded theme colors.
- Keep Mapbox lifecycle and layer cleanup paired to avoid duplicate sources, listeners, or controls during React Strict Mode.
- Preserve keyboard access and accessible names for custom controls.
- Environment variables prefixed with `VITE_` are client-visible; all API secrets belong to the Bun server.
