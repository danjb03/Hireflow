# Hireflow Project Status

Current state of all features, what's working, what needs work, and what's planned.

**Last Updated:** January 2025

---

## Feature Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | Complete | Login, logout, password reset |
| Admin Dashboard | Complete | Stats, client overview |
| Client Onboarding | Complete | Airtable linking |
| Rep Onboarding | Complete | Airtable linking |
| Lead Submission | Complete | Rep and admin forms |
| Lead Management | Complete | Assign, status updates |
| Email Notifications | Complete | Per-user preferences |
| P&L Reporting | Complete | Deals, costs, calculations |
| Rep Reporting | Complete | Daily reports, admin review |
| Client Sentiment | Complete | Status tracking |
| Client Calendar | Partial | Basic implementation |
| Order Tracking | Partial | Needs enhancement |
| Weekly Digest Emails | Not Started | Planned |
| Bulk Lead Operations | Not Started | Planned |

---

## Complete Features

### Authentication System
- Login/signup with Supabase Auth
- Password reset flow
- Role-based routing (admin/client/rep)
- Session management
- Protected routes

### Admin Dashboard (`/admin`)
- Total client count
- Total lead count by status
- Client list with status indicators
- Lead stats per client
- Quick navigation to client details

### Client Management (`/admin/clients`)
- Full client table with search
- Lead stats per client
- Client status management (happy/unhappy/urgent/at_risk/on_track)
- Password reset capability
- Delete/deactivate clients

### Lead Management (`/admin/leads`)
- All leads view with filters
- Lead detail view with all fields
- Client assignment (dropdown)
- Status management (New/Approved/Rejected/Needs Work)
- AI recommendation display
- Callback slots prominent display
- Task checklist (7 items)

### Lead Submission
- **Rep form** (`/rep/submit-lead`): Full lead creation
- **Admin form** (`/admin/submit-lead`): Same capabilities
- Fields: Company, contact, job info, callbacks, notes
- Close.com link integration
- AI categorization trigger

### Email Notification System
- **Admin settings page** (`/admin/email-settings`)
- Per-user toggle for lead notifications
- Users grouped by client
- Stats: totals, enabled/disabled counts
- Sends to ALL users per client (not just one)
- Respects individual preferences
- Default: notifications enabled

### Email Templates
1. **Welcome Email (Client)** - Sent on invite
2. **Welcome Email (Rep)** - Sent on invite
3. **Lead Approved** - Sent when status changes to Approved
4. **New Lead Available** - Sent when lead assigned to client

### P&L Reporting (`/admin/pnl`)
- Deal management (CRUD)
- Auto-calculations:
  - Revenue net (inc VAT / 1.20)
  - Operating expense (20%)
  - Setter/rep commissions
  - Lead fulfillment cost (£20/lead)
- Business cost management
- Cost categories (software, data, marketing, personnel, office, other)
- Monthly/quarterly/yearly views

### Rep Performance Reporting (`/admin/reporting`)
- Daily report submission (public form)
- Screenshot upload with AI parsing
- Admin review/approval workflow
- Report editing with original value preservation
- Status tracking (pending/approved/rejected/edited)

### Client Sentiment (`/admin/sentiment`)
- Client status tracking
- Status options: happy, unhappy, urgent, at_risk, on_track
- Visual indicators
- Admin-managed

---

## Partially Built Features

### Client Calendar (`/client/calendar`)
- **Status:** Basic implementation
- **Working:** Displays callback appointments
- **Needs:**
  - Better date navigation
  - Integration with external calendars
  - Reminder system
  - Time zone handling

### Order Tracking
- **Status:** Functional but basic
- **Working:**
  - Orders table in database
  - Basic CRUD operations
  - Links to client profiles
- **Needs:**
  - Detailed order history view
  - Progress visualization
  - Delivery rate calculations
  - Order-specific reporting

---

## Not Started / Planned

### Weekly Digest Emails
- **Purpose:** Summary email sent weekly to clients
- **Requirements:**
  - Aggregate lead activity
  - Callback summary
  - Performance metrics
  - Configurable send day/time

### Advanced Reporting Filters
- **Purpose:** Better filtering on admin reports
- **Requirements:**
  - Date range filters
  - Multi-select status filters
  - Export capabilities
  - Custom date comparisons

### Bulk Lead Operations
- **Purpose:** Manage multiple leads at once
- **Requirements:**
  - Multi-select in lead list
  - Bulk status change
  - Bulk assignment
  - Bulk delete

### Client Self-Service Order Management
- **Purpose:** Let clients manage their own orders
- **Requirements:**
  - Order history view
  - Request additional leads
  - Payment integration
  - Invoice generation

---

## Edge Functions (55 Total)

### Fully Operational
| Function | Purpose |
|----------|---------|
| `invite-client` | Create client + send welcome email |
| `invite-rep` | Create rep + send welcome email |
| `invite-admin` | Create admin account |
| `complete-onboarding` | Link user to Airtable |
| `reset-client-password` | Admin password reset |
| `delete-user` | Remove user account |
| `get-client-users` | Get clients with users |
| `get-client-leads` | Get leads for user |
| `get-all-leads-admin` | Admin: all leads |
| `get-rep-leads` | Rep's submitted leads |
| `get-lead-details` | Single lead detail |
| `submit-lead` | Create lead in Airtable |
| `update-lead` | Update lead fields |
| `update-lead-status` | Change status + email |
| `assign-lead-to-client` | Assign + email |
| `update-lead-feedback` | Client feedback |
| `delete-lead` | Remove lead |
| `categorize-lead-ai` | AI analysis |
| `improve-notes-ai` | AI note enhancement |
| `get-airtable-clients` | All Airtable clients |
| `get-airtable-client-options` | Lightweight list |
| `get-airtable-client-data` | Client details |
| `get-airtable-reps` | All reps |
| `update-airtable-client` | Update client |
| `get-pnl-report` | P&L data |
| `get-deals` | All deals |
| `create-deal` | New deal |
| `update-deal` | Modify deal |
| `delete-deal` | Remove deal |
| `get-business-costs` | All costs |
| `create-business-cost` | New cost |
| `update-business-cost` | Modify cost |
| `delete-business-cost` | Remove cost |
| `submit-daily-report` | Rep report |
| `get-my-reports` | Rep's reports |
| `get-rep-reports` | Admin: all reports |
| `review-report` | Admin review |
| `parse-screenshot` | AI OCR |
| `get-system-stats` | Dashboard stats |
| `get-orders` | Order data |
| `create-order` | New order |
| `update-notification-preference` | Email prefs |

---

## Database Tables

| Table | Status | Records |
|-------|--------|---------|
| profiles | Active | Linked to auth.users |
| user_roles | Active | admin/client/rep |
| notification_preferences | Active | Per-user email settings |
| orders | Active | Client orders |
| deals | Active | P&L deals |
| business_costs | Active | P&L costs |
| cost_categories | Active | Seeded lookup |
| daily_reports | Active | Rep reports |
| rep_client_allocations | Active | Rep assignments |

---

## Known Issues

### Minor Issues
1. **Client calendar** needs time zone handling
2. **Order progress** visualization could be improved
3. **Mobile responsiveness** on some admin tables needs work

### Technical Debt
1. Some pages have long useEffect chains - could use custom hooks
2. Type definitions could be more comprehensive
3. Some edge functions have similar patterns that could be abstracted

---

## Recent Changes

### January 2025
- Added email notification preferences system
- Added admin email settings page (`/admin/email-settings`)
- Updated email sending to notify ALL users per client
- Added notification preference checking before sending
- Created comprehensive documentation (this file)

### Previous
- Branded email templates
- Clean email header styling
- Verified domain setup (app.hireflow.uk)
- Invite flow improvements
- Pipeline display changes

---

## Environment

- **Production URL:** https://app.hireflow.uk
- **Email From:** team@app.hireflow.uk
- **Default Admin:** daniel@tnwmarketing.com
- **Supabase Project:** Production instance
- **Airtable Base:** Production CRM data

---

## Quick Reference

### To add a new admin page:
1. Create `src/pages/AdminNewPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav item in `src/components/AdminLayout.tsx`

### To add a new edge function:
1. Create `supabase/functions/function-name/index.ts`
2. Deploy: `supabase functions deploy function-name`

### To update database:
1. Create migration in `supabase/migrations/`
2. Push: `supabase db push` or run SQL in dashboard
