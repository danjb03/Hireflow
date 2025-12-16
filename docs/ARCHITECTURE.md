# Architecture Overview

This document describes the system architecture of Hireflow, optimized for AI assistants (Claude, Cursor) to understand the codebase.

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │    Admin Portal     │    │   Client Portal     │        │
│  │  /admin/*           │    │  /client/*          │        │
│  ├─────────────────────┤    ├─────────────────────┤        │
│  │ - Dashboard         │    │ - Dashboard         │        │
│  │ - All Leads         │    │ - Leads             │        │
│  │ - Lead Detail       │    │ - Lead Detail       │        │
│  │ - Clients           │    │ - Calendar          │        │
│  │ - Invite Client     │    │ - Settings          │        │
│  └─────────────────────┘    └─────────────────────┘        │
│                                                             │
│  TanStack Query: 5min stale, 10min cache                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                      JWT Bearer Token
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────────┐   ┌─────────────┐
│ Supabase    │   │ Edge Functions  │   │ PostgreSQL  │
│ Auth        │   │ (Deno)          │   │ (Supabase)  │
│             │   │                 │   │             │
│ - Login     │   │ 14 functions    │   │ - profiles  │
│ - Signup    │   │ - JWT verify    │   │ - user_roles│
│ - Password  │   │ - Role check    │   │             │
└─────────────┘   └────────┬────────┘   └─────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Airtable API  │
                  │                 │
                  │ Tables:         │
                  │ - Qualified     │
                  │   Lead Table    │
                  │ - Clients       │
                  └─────────────────┘
```

## Data Flow

### Lead Retrieval (Client)

```
1. Client navigates to /client/leads
2. ClientLeads.tsx mounts, calls supabase.functions.invoke("get-client-leads")
3. Edge function verifies JWT → extracts user ID
4. Function queries profiles table → gets client_name
5. Function calls Airtable API with filter: {Client} = 'client_name'
6. Airtable returns matching leads
7. Function transforms data → returns to frontend
8. TanStack Query caches response for 5 minutes
9. UI renders lead cards
```

### Lead Retrieval (Admin)

```
1. Admin navigates to /admin/leads
2. AdminAllLeads.tsx fetches via get-all-leads-admin
3. Edge function verifies JWT + checks is_admin()
4. Function builds Airtable filter from query params (status, client, search)
5. Fetches leads with pagination (100 per request)
6. Resolves Client field values (record IDs → names)
7. Returns full lead list to frontend
```

### Lead Assignment

```
1. Admin selects client in AdminLeadDetail dropdown
2. Calls assign-lead-to-client with { leadId, clientId }
3. Edge function:
   a. Verifies admin role
   b. Gets client's profile (client_name, airtable_client_id)
   c. Updates Airtable lead record's Client field
4. Lead now appears in client's filtered view
```

## Authentication

### JWT Flow

```
User Login
    │
    ▼
┌──────────────────────┐
│  supabase.auth       │
│  .signInWithPassword │
└──────────┬───────────┘
           │
           ▼
   JWT Token Generated
   (1 hour expiry)
           │
           ▼
┌──────────────────────┐
│   localStorage       │
│   sb-[project]-auth  │
└──────────┬───────────┘
           │
           ▼
  Every API Request:
  Authorization: Bearer <jwt>
           │
           ▼
┌──────────────────────┐
│   Edge Function      │
│   supabaseClient     │
│   .auth.getUser()    │
└──────────────────────┘
```

### Role Verification

All admin functions include:

```typescript
const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
if (!isAdmin) throw new Error('Admin access required');
```

The `is_admin()` function checks the `user_roles` table.

## Database Schema

### Supabase Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  client_name TEXT,                    -- For Airtable filtering
  airtable_client_id TEXT,             -- Links to Airtable Clients record
  initial_password TEXT,               -- Temp password at signup
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_date DATE,
  target_delivery_date DATE,
  leads_purchased INTEGER DEFAULT 0,
  leads_fulfilled INTEGER DEFAULT 0,
  leads_per_day NUMERIC,
  client_status TEXT,                  -- happy, unhappy, urgent, at_risk, on_track
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,              -- 'admin' or 'client'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

### Row-Level Security (RLS)

**profiles**:
- Users can SELECT/UPDATE their own row
- Admins can SELECT/UPDATE all rows

**user_roles**:
- Users can SELECT their own roles
- Only admins can INSERT/UPDATE/DELETE

## Airtable Schema

### Qualified Lead Table

| Field | Type | Notes |
|-------|------|-------|
| Company Name | Text | Primary identifier |
| Contact Name | Text | |
| Contact Title | Text | |
| Email | Email | |
| Phone | Phone | |
| Contact LinkedIn | URL | |
| Company Website | URL | |
| Company LinkedIn | URL | |
| Company Description | Long text | |
| Address | Text/Array | Location data |
| Country | Text | |
| Industry | Single select | |
| Employee Count | Number | |
| Company Size | Single select | |
| Job Title | Text | Role being hired |
| Job Description | Long text | |
| Job URL | URL | |
| Job Type | Single select | |
| Job Level | Single select | |
| Status | Single select | New, Approved, Rejected, Needs work, Not Qualified |
| Client | Linked record OR Text | Assignment |
| AI Summary | Long text | |
| Feedback | Long text | Client feedback |
| Availability | Text | Callback scheduling |
| Last Contact Date | Date | |
| Next Action | Text | |
| Date Created | Date | |

### Clients Table

| Field | Type |
|-------|------|
| Client Name | Text |
| Contact Person | Text |
| Email | Email |
| Phone | Phone |
| Company Website | URL |
| Company Name | Text |
| Location | Text |
| Markets they serve (locations) | Long text |
| Industries they serve | Text |
| Sub-industries/specializations | Text |
| Types of roles they hire for | Text |
| Contingent or temporary staffing? | Single select |
| Last 5 roles placed | Long text |
| Last 5 companies worked with | Long text |
| 5 current candidates | Long text |
| Their USPs in their own words | Long text |
| Niches they've done well in | Long text |
| Typical outreach/acquisition methods | Long text |
| Status | Single select |

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── QueryClientProvider (TanStack Query)
├── TooltipProvider
├── Toaster (sonner)
└── BrowserRouter
    └── Routes
        ├── Public Routes
        │   ├── / → Index (landing)
        │   ├── /login → Login
        │   └── /reset-password → ResetPassword
        │
        ├── Client Routes (ClientLayout wrapper)
        │   ├── /onboarding → ClientOnboarding
        │   ├── /client/dashboard → ClientDashboard
        │   ├── /client/leads → ClientLeads
        │   ├── /client/leads/:id → ClientLeadDetail
        │   ├── /client/calendar → ClientCalendar
        │   └── /client/settings → ClientSettings
        │
        └── Admin Routes (AdminLayout wrapper)
            ├── /admin → AdminDashboard
            ├── /admin/leads → AdminAllLeads
            ├── /admin/leads/:id → AdminLeadDetail
            ├── /admin/clients → AdminClients
            └── /admin/invite → AdminInvite
```

### Layout Components

**AdminLayout** (`src/components/AdminLayout.tsx`)
- Sidebar with navigation
- Menu: Dashboard, All Leads, Clients, Invite Client
- User dropdown in footer
- Props: `children`, `userEmail`

**ClientLayout** (`src/components/ClientLayout.tsx`)
- Checks `onboarding_completed` on mount
- Redirects to `/onboarding` if incomplete
- Menu: Dashboard, Leads, Calendar, Settings
- Props: `children`, `userEmail`

### State Management

- **Server state**: TanStack Query (caching, background refetch)
- **Local state**: React useState/useReducer
- **Forms**: React Hook Form + Zod validation
- **Auth state**: Supabase session in localStorage

### Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Routes, providers, lazy loading |
| `src/integrations/supabase/client.ts` | Supabase client initialization |
| `src/components/AdminLayout.tsx` | Admin page wrapper |
| `src/components/ClientLayout.tsx` | Client page wrapper (with onboarding check) |
| `supabase/config.toml` | Edge function JWT settings |
| `supabase/functions/*/index.ts` | Individual edge functions |

## Security Model

1. **Authentication**: Supabase Auth (JWT)
2. **Authorization**: Role-based (admin/client)
3. **Data Access**:
   - Admins: All data
   - Clients: Own leads only (Airtable filter by client_name)
4. **RLS**: PostgreSQL row-level security on profiles/roles
5. **Edge Functions**: JWT verification on every request

## Performance Considerations

- **Lazy loading**: All pages code-split via React.lazy
- **Query caching**: 5-minute stale time reduces API calls
- **Airtable pagination**: Functions handle 100-record pages automatically
- **Indexes**: Created on frequently-queried columns (client_name, airtable_client_id)
