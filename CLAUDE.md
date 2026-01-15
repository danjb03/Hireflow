# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hireflow is a B2B lead management platform for distributing qualified leads to recruitment clients. Built with React/TypeScript frontend and Supabase backend with Airtable as the primary data store for leads and clients.

## Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

### Data Flow
- **Airtable**: Source of truth for leads and clients (Qualified Lead Table, Clients table)
- **Supabase PostgreSQL**: Auth, user profiles, roles
- **Edge Functions (Deno)**: All business logic, JWT verification, Airtable API calls

### Portals
- **Admin** (`/admin/*`): Manage all leads, clients, invite users
- **Client** (`/client/*`): View assigned leads, approve/reject with feedback
- **Rep** (`/rep/*`): Sales rep features

### Authentication
1. Supabase Auth issues JWT (1hr expiry)
2. Every edge function verifies JWT via `supabase.auth.getUser(token)`
3. Admin operations check `user_roles` table via `is_admin()` RPC
4. Clients see only leads where Airtable `Client` field matches their `client_name`

### Key Database Tables
- `profiles`: Links to auth.users, stores `client_name` and `airtable_client_id` for lead filtering
- `user_roles`: Role assignments (`admin`, `client`, `rep`)

## Code Patterns

### Import Order
```typescript
// 1. React/router hooks
// 2. Supabase client
// 3. shadcn/ui components (grouped)
// 4. Notifications (sonner)
// 5. Icons (lucide-react only)
// 6. Local utils and types
// 7. Layout and custom components
```

### Page Auth Check
```typescript
useEffect(() => { checkAuth(); }, []);

const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) { navigate("/login"); return; }
  // Check role if admin page...
};
```

### Edge Function Template
```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseClient.auth.getUser(token);

  // For admin ops, use service role client to bypass RLS
  const supabaseAdmin = createClient(url, serviceRoleKey);
  // Check admin role, then business logic...
});
```

### Layouts
- `AdminLayout` - All `/admin/*` pages, pass `userEmail` prop
- `ClientLayout` - All `/client/*` pages, auto-redirects to `/onboarding` if incomplete
- `RepLayout` - All `/rep/*` pages

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase | `AdminDashboard.tsx` |
| shadcn/ui | lowercase | `button.tsx` |
| Hooks | use-kebab-case | `use-mobile.tsx` |
| Edge functions | kebab-case | `get-client-leads/` |

## External Services

- **Airtable**: Lead/client data via REST API, 100-record pagination
- **Resend**: Transactional emails (from: team@app.hireflow.uk)
- **Close.com**: Call transcripts for AI lead categorization

## Constraints

- Only use `lucide-react` for icons
- Only use Tailwind for styling (no CSS modules/styled-components)
- Always use `@/` import alias
- Use `supabase.functions.invoke()` for API calls (not raw fetch)
- Edge functions require service role key to bypass RLS for admin operations
