# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server (accessible on local network via `host: true`)
- `npm run build` — TypeScript compile (`tsc -b`) + Vite production build
- `npm run lint` — Run ESLint on all `*.ts` / `*.tsx` files
- `npm run preview` — Preview the production build locally

No test framework is configured.

## Path Aliases

`@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## Architecture Overview

**Domain:** Catalan sports event management system. Core entities:
- **Penya** — A participating team/group.
- **Prova** — A competition/challenge event. Has typed variants: `Participació`, `Temps`, `Punts`, `Rondes`, `MultiProva`.

**Stack:** React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Firebase 11

### src/ Structure

```
src/
├── components/
│   ├── admin/       # Admin-only UI components
│   ├── public/      # Public-facing components
│   ├── shared/      # Components/contexts reused by both
│   │   └── Contexts/  # YearContext, ProvaContext (Zustand store)
│   ├── Theme/       # ThemeProvider + ModeToggle
│   └── ui/          # Radix UI-based primitives (button, dialog, etc.)
├── firebase/        # Firebase app init; exports `db`, `auth`, `storage`
├── interfaces/      # All TypeScript types and class definitions
├── pages/
│   ├── admin/       # Admin pages (dashboard, penyes, proves, createProva)
│   └── public/      # Public pages (main, penya, prova)
├── routes/          # AdminRoutes guard + AuthContext
├── services/
│   ├── authService.tsx
│   ├── storageService.ts
│   └── database/
│       ├── Admin/   # adminDbServices.ts, adminProvesDbServices.ts
│       └── publicDbService.ts
└── utils/           # url.ts, bracketCreator.ts
```

### Routing

React Router v7. Routes are declared in `src/App.tsx`. Admin routes (`/admin/*`) are protected by the `AdminRoutes` component in `src/routes/`.

### State Management

- **AuthContext** (`src/routes/admin/AuthContext.tsx`) — Firebase auth state. Hook: `useAuth()`.
- **YearContext** (`src/components/shared/Contexts/YearContext.tsx`) — Selected year, persisted to `sessionStorage`. Hook: `useYear()`.
- **ThemeProvider** (`src/components/Theme/theme-provider.tsx`) — Dark/light/system theme, persisted to `localStorage`. Hook: `useTheme()`.
- **useProvaStore** (Zustand, `src/components/shared/Contexts/ProvaContext.tsx`) — Global currently-selected Prova. Methods: `setProva()`, `clearProva()`.

### Firebase / Firestore Schema

```
Circuit/{year}/
  Penyes/{penyaId}
  Proves/{provaId}/
    Participants/{penyaId}
```

Firebase is initialised in `src/firebase/firebase.ts` using `VITE_FIREBASE_*` env vars.

### Key Conventions

- **Admin vs Public split:** Components and pages are mirrored between `admin/` and `public/` directories. Shared logic lives in `shared/`.
- **Prova types are polymorphic:** The `provaTypes` constant drives rendering logic. Each type has dedicated input components (e.g., `TimeInput`, `PointsInput`, `ParticipatesInput`).
- **Styling:** Tailwind utility classes + `cn()` helper from `src/lib/utils.ts` (clsx + tailwind-merge). Custom gradient defined in `tailwindcss.config.js`.
- **Forms:** react-hook-form + Zod for validation.
- **Animations:** Framer Motion for transitions.
- **Icons:** Lucide React.
