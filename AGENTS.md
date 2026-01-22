# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript app.
  - `src/pages/` hosts route-level pages (`Admin*.tsx`, `Client*.tsx`).
  - `src/components/` includes shared UI, with shadcn primitives in `src/components/ui/`.
  - `src/integrations/supabase/` holds the Supabase client and types.
  - `src/lib/` and `src/hooks/` contain utilities and custom hooks.
  - Layout wrappers live at `src/AdminLayout.tsx`, `src/ClientLayout.tsx`, `src/RepLayout.tsx`.
- `supabase/` contains edge functions (`supabase/functions/*`) and database migrations.
- `public/` stores static assets; `docs/` holds architecture and API references.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server.
- `npm run build` creates a production build.
- `npm run build:dev` builds with development mode settings.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint across the repo.

## Coding Style & Naming Conventions
- Use TypeScript + React with TailwindCSS (no CSS modules or styled-components).
- Import via the `@/` alias and keep imports ordered per `CLAUDE.md`.
- Naming: pages in PascalCase (`AdminDashboard.tsx`), hooks in `use-kebab-case` (`use-mobile.tsx`), shadcn/ui files in lowercase (`button.tsx`), edge functions in kebab-case (`get-client-leads/`).
- Icons: `lucide-react` only. Forms: `react-hook-form` + `zod`.

## Testing Guidelines
- No automated test framework is configured yet. Validate changes with `npm run lint`, run the app locally, and spot-check relevant flows.
- If you add tests, keep them close to the feature area and document the runner in this file.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, sentence case (e.g., “Add client lead filters”).
- PRs should include a concise description, linked issues (if any), and UI screenshots for visual changes.

## Configuration & Secrets
- Client env vars use `VITE_` prefixes (see `README.md`). Server-side edge functions require Supabase and Airtable keys.
- Store secrets in local env files or deployment settings; do not commit credentials.
