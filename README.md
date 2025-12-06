# Hireflow - Lead Management Platform

A modern lead management platform for managing and distributing qualified leads to clients. Built with React, TypeScript, and powered by Lovable Cloud.

## Overview

Hireflow is a B2B lead generation platform that allows administrators to manage leads from Airtable and distribute them to clients. Clients can view, approve, reject, or request changes to their assigned leads through a dedicated dashboard.

## Features

### Admin Portal
- **Dashboard**: Overview of system stats, recent leads, and quick actions
- **Lead Management**: View all leads, assign to clients, update statuses
- **Client Management**: Invite new clients, manage existing client accounts
- **Lead Submission**: Submit new leads directly to Airtable

### Client Portal
- **Dashboard**: Overview of assigned leads and key metrics
- **Lead Inbox**: View and manage assigned leads
- **Lead Actions**: Approve, reject, or request changes on leads with feedback
- **Calendar**: Schedule and manage callbacks
- **Settings**: Account settings and preferences

### Lead Statuses
- **New** (Blue) - Fresh lead awaiting review
- **Approved** (Green) - Lead accepted by client
- **Rejected** (Red) - Lead declined by client
- **Needs Work** (Orange) - Lead requires additional information

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Backend**: Lovable Cloud (Supabase)
- **Database**: Airtable (leads), PostgreSQL (users/auth)
- **Authentication**: Supabase Auth

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components
│   ├── landing/        # Landing page sections
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase client & types
├── lib/                # Utility functions
├── pages/              # Page components
│   ├── Admin*.tsx      # Admin portal pages
│   ├── Client*.tsx     # Client portal pages
│   └── Index.tsx       # Landing page
└── assets/             # Images and static assets

supabase/
├── functions/          # Edge functions for API operations
│   ├── assign-lead-to-client/
│   ├── get-all-leads-admin/
│   ├── get-client-leads/
│   ├── get-lead-details/
│   ├── submit-lead/
│   ├── update-lead/
│   ├── update-lead-feedback/
│   ├── update-lead-status/
│   └── ...
└── config.toml         # Supabase configuration
```

## Architecture

### Data Flow
1. Leads are stored in Airtable's "Qualified Lead Table"
2. Edge functions handle all Airtable API communication
3. Each lead has a "Client" field for assignment filtering
4. Clients only see leads where their assigned name matches

### Authentication
- Users authenticate via Supabase Auth
- Profiles stored in PostgreSQL with role assignments
- Roles: `admin` or `client`
- RLS policies protect data access

### Key Airtable Fields
- `Client` - Single select dropdown for client assignment
- `Status` - Lead status (New, Approved, Rejected, Needs work)
- `Contact LinkedIn` - LinkedIn profile URL
- `Date Created` - When the lead was added
- `Address` - Lead location

## Environment Variables

The following environment variables are automatically configured:

```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase anon key
```

### Required Secrets (Edge Functions)

- `AIRTABLE_API_TOKEN` - Airtable API authentication
- `AIRTABLE_BASE_ID` - Airtable base identifier
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

This project is deployed via Lovable. Click the **Publish** button in the editor to deploy updates.

- Frontend changes require clicking "Update" in the publish dialog
- Backend changes (edge functions) deploy automatically

## Design System

The application uses a consistent design system across all portals:

- **UI Components**: shadcn/ui with custom theming
- **Colors**: HSL-based semantic tokens
- **Layout**: Sidebar navigation with collapsible menu
- **Icons**: Lucide React icons

## License

Private - All rights reserved.
