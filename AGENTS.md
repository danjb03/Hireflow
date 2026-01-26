# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript application.
  - `src/pages/` holds route-level screens (examples: `AdminClientDetail.tsx`, `ClientLeads.tsx`).
  - `src/components/` contains shared UI building blocks; shadcn primitives live in `src/components/ui/`.
  - `src/integrations/supabase/` includes Supabase client setup and generated types.
  - `src/lib/` and `src/hooks/` keep utilities and custom hooks.
  - Layout wrappers sit at `src/AdminLayout.tsx`, `src/ClientLayout.tsx`, and `src/RepLayout.tsx`.
- `supabase/` houses edge functions (`supabase/functions/*`) and migrations.
- `public/` is for static assets; `docs/` contains architecture and API references.

## Build, Test, and Development Commands
- `npm run dev` runs the Vite dev server for local work.
- `npm run build` outputs a production bundle.
- `npm run build:dev` builds in development mode for debugging.
- `npm run preview` serves the production build locally.
- `npm run lint` checks the codebase with ESLint.

## Coding Style & Naming Conventions
- TypeScript + React with TailwindCSS only (no CSS modules or styled-components).
- Use the `@/` path alias, and keep import ordering consistent with `CLAUDE.md`.
- Naming: pages in PascalCase (`RepReports.tsx`), hooks in `use-kebab-case` (`use-mobile.tsx`), shadcn files in lowercase (`button.tsx`), edge functions in kebab-case (`update-lead-feedback/`).
- Use `lucide-react` for icons and `react-hook-form` + `zod` for forms.

## Testing Guidelines
- There is no test runner configured yet. Validate changes with `npm run lint`, run the app locally, and spot-check key flows.
- If you add tests, colocate them with the feature and document the command here.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative, sentence-case messages (e.g., “Update landing page CTA”).
- PRs should include a concise description, linked issues (if any), and screenshots for UI changes.

## Configuration & Secrets
- Client env vars use `VITE_` prefixes (see `README.md` and `VERCEL_ENV_SETUP.md`).
- Keep secrets in local env files or deployment settings; never commit credentials.
