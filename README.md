# Hireflow - Lead Management Platform

A B2B lead management platform for distributing qualified leads to recruitment clients. Built with React, TypeScript, Supabase, and Airtable.

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design, data flow, authentication
- [API Reference](docs/API.md) - Edge functions, Airtable integration
- [Style Guide](docs/STYLE_GUIDE.md) - Coding conventions and patterns

## Overview

Hireflow connects lead generation with recruitment agencies. Administrators manage leads sourced from Airtable and distribute them to clients. Clients review, approve, or reject leads through their dedicated portal.

### Data Architecture

| System | Purpose | Data |
|--------|---------|------|
| **Airtable** | Source of truth | Leads, Clients |
| **Supabase** | Auth & user management | Users, Profiles, Roles |

## Features

### Admin Portal (`/admin/*`)
- **Dashboard** - System stats, recent activity
- **All Leads** - View, filter, assign leads to clients
- **Lead Detail** - Full lead info, status updates, client assignment
- **Clients** - Manage client accounts, view onboarding data
- **Invite Client** - Create new client accounts

### Client Portal (`/client/*`)
- **Dashboard** - Lead overview, metrics
- **Leads** - View assigned leads, filter by status
- **Lead Detail** - Review lead, approve/reject with feedback
- **Calendar** - Callback scheduling
- **Settings** - Account preferences

### Lead Statuses
| Status | Description |
|--------|-------------|
| New | Fresh lead awaiting review |
| Approved | Client accepted the lead |
| Rejected | Client declined the lead |
| Needs Work | Lead requires changes |
| Not Qualified | Archived (hidden from main views) |

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- React Router v6
- TanStack Query (caching)
- React Hook Form + Zod

### Backend
- Supabase (PostgreSQL + Auth)
- Deno Edge Functions
- Airtable API

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin nav components
│   ├── landing/         # Landing page sections
│   └── ui/              # shadcn/ui components (40+)
├── hooks/               # Custom hooks (toast, mobile)
├── integrations/
│   └── supabase/        # Client init & types
├── lib/                 # Utilities (lazyRetry, clientOnboarding)
├── pages/
│   ├── Admin*.tsx       # Admin pages (5)
│   ├── Client*.tsx      # Client pages (6)
│   └── *.tsx            # Auth, landing, legacy
├── AdminLayout.tsx      # Admin page wrapper
├── ClientLayout.tsx     # Client page wrapper
└── App.tsx              # Routes & providers

supabase/
├── functions/           # 14 Edge functions
│   ├── get-client-leads/
│   ├── get-all-leads-admin/
│   ├── assign-lead-to-client/
│   ├── submit-lead/
│   ├── update-lead*/
│   ├── delete-lead/
│   ├── invite-client/
│   ├── register-client/
│   ├── get-airtable-*/
│   └── ...
├── migrations/          # DB schema
└── config.toml          # Function config
```

## Environment Variables

### Client-side (Vite)
```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
```

### Server-side (Edge Functions)
```env
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
AIRTABLE_API_TOKEN=[pat_xxx]
AIRTABLE_BASE_ID=[appXXX]
```

## Key Concepts

### Authentication Flow
1. Admin invites client → Creates Supabase user + profile
2. Client logs in → Redirected to onboarding (first time)
3. Client completes onboarding → Creates Airtable client record, links to profile
4. Client accesses portal → JWT auth, filtered by `client_name`

### Lead Assignment
Leads are assigned by updating the `Client` field in Airtable:
- Uses Airtable record ID if `airtable_client_id` exists in profile
- Falls back to `client_name` string match

### User Roles
| Role | Access |
|------|--------|
| `admin` | All leads, all clients, invite users, system stats |
| `client` | Own leads only (filtered by client_name) |

## Development

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Build
npm run build

# Preview build
npm run preview
```

## Deployment

- **Frontend**: Vercel (or Lovable publish)
- **Edge Functions**: Auto-deploy with Supabase
- **Database**: Supabase hosted PostgreSQL

## Additional Resources

- See `/docs` for detailed documentation
- Airtable base contains "Qualified Lead Table" and "Clients" tables
- All edge functions require JWT authentication
