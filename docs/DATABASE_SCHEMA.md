# Hireflow Database Schema

This document describes all database tables, relationships, edge functions, and external APIs.

---

## Data Architecture

**Supabase (PostgreSQL):** User management, roles, orders, P&L, reporting
**Airtable:** Leads, clients, reps (source of truth for CRM data)

---

## Supabase Tables

### profiles
User profile data, linked to auth.users.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | References auth.users |
| email | TEXT | Yes | User's email |
| client_name | TEXT | No | Display name |
| airtable_client_id | TEXT | No | Links to Airtable Clients table |
| airtable_rep_id | TEXT | No | Links to Airtable Reps table |
| initial_password | TEXT | No | Temp password for first login |
| onboarding_completed | BOOLEAN | No | Default: false |
| leads_purchased | INTEGER | No | Default: 0 |
| onboarding_date | DATE | No | When client onboarded |
| target_delivery_date | DATE | No | When leads should be delivered |
| leads_per_day | NUMERIC(10,2) | No | Calculated delivery rate |
| leads_fulfilled | INTEGER | No | Default: 0 |
| client_status | TEXT | No | happy/unhappy/urgent/at_risk/on_track |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

**Indexes:** `airtable_client_id`, `airtable_rep_id`, `client_status`

---

### user_roles
Role-based access control.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| user_id | UUID (FK) | Yes | References auth.users |
| role | app_role | Yes | ENUM: 'admin', 'client', 'rep' |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Constraint:** UNIQUE(user_id, role)

---

### notification_preferences
Email notification settings per user.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| user_id | UUID (FK) | Yes | References auth.users, UNIQUE |
| lead_notifications_enabled | BOOLEAN | Yes | Default: true |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

---

### orders
Client lead purchase orders.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| client_id | UUID (FK) | Yes | References profiles |
| order_number | TEXT | Yes | Order identifier |
| leads_purchased | INTEGER | No | Default: 0 |
| leads_delivered | INTEGER | No | Default: 0 |
| start_date | DATE | No | Order start |
| target_delivery_date | DATE | No | Target completion |
| status | TEXT | No | Default: 'active' |
| notes | TEXT | No | Order notes |
| created_by | UUID (FK) | No | References auth.users |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

---

### deals
P&L deal records.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| company_name | TEXT | Yes | Client company |
| revenue_inc_vat | NUMERIC(12,2) | No | Revenue including 20% VAT |
| revenue_net | NUMERIC(12,2) | No | revenue_inc_vat / 1.20 |
| operating_expense | NUMERIC(12,2) | No | revenue_net * 0.20 |
| leads_sold | INTEGER | No | Default: 0 |
| lead_sale_price | NUMERIC(10,2) | No | Price per lead |
| setter_commission_percent | NUMERIC(5,2) | No | Default: 0 |
| sales_rep_commission_percent | NUMERIC(5,2) | No | Default: 0 |
| setter_cost | NUMERIC(12,2) | No | revenue_net * setter_% |
| sales_rep_cost | NUMERIC(12,2) | No | revenue_net * rep_% |
| lead_fulfillment_cost | NUMERIC(12,2) | No | leads_sold * £20 |
| close_date | DATE | Yes | When deal closed |
| notes | TEXT | No | Deal notes |
| created_by | UUID (FK) | No | References auth.users |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

---

### business_costs
Additional business expenses for P&L.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| name | TEXT | Yes | Cost name |
| description | TEXT | No | Description |
| amount | NUMERIC(12,2) | Yes | Cost amount |
| cost_type | TEXT | Yes | 'recurring' or 'one_time' |
| frequency | TEXT | No | 'monthly'/'quarterly'/'yearly' |
| category | TEXT | Yes | FK to cost_categories.name |
| effective_date | DATE | Yes | When cost starts |
| end_date | DATE | No | When recurring cost ends |
| is_active | BOOLEAN | No | Default: true |
| created_by | UUID (FK) | No | References auth.users |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

---

### cost_categories
Lookup table for cost types.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| name | TEXT | Yes | Category name, UNIQUE |
| description | TEXT | No | Category description |
| icon | TEXT | No | Icon identifier |
| color | TEXT | No | Color code |
| sort_order | INTEGER | No | Display order |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Seeded values:** software, data, marketing, personnel, office, other

---

### daily_reports
Rep daily performance reports.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| rep_id | TEXT | Yes | Airtable rep ID or UUID |
| rep_name | TEXT | No | Rep display name |
| report_date | DATE | Yes | Report date |
| time_on_dialer_minutes | INTEGER | Yes | Time on dialer |
| calls_made | INTEGER | Yes | Number of calls |
| bookings_made | INTEGER | No | Default: 0 |
| pipeline_value | NUMERIC(12,2) | No | Default: 0 |
| ai_extracted_time_minutes | INTEGER | No | AI-parsed time |
| ai_extracted_calls | INTEGER | No | AI-parsed calls |
| ai_confidence_score | NUMERIC(3,2) | No | AI confidence |
| screenshot_url | TEXT | No | Screenshot storage URL |
| notes | TEXT | No | Report notes |
| status | report_status | No | pending/approved/rejected/edited |
| reviewed_by | UUID (FK) | No | Admin who reviewed |
| reviewed_at | TIMESTAMPTZ | No | Review timestamp |
| review_notes | TEXT | No | Admin notes |
| original_calls_made | INTEGER | No | Pre-edit value |
| original_time_minutes | INTEGER | No | Pre-edit value |
| original_bookings | INTEGER | No | Pre-edit value |
| original_pipeline | NUMERIC(12,2) | No | Pre-edit value |
| submitted_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-updated |

**Constraint:** UNIQUE(rep_id, report_date)

---

### rep_client_allocations
Maps reps to their allocated clients.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | Yes | Auto-generated |
| rep_id | UUID (FK) | Yes | References profiles |
| client_airtable_id | TEXT | Yes | Airtable Client record ID |
| client_name | TEXT | No | Client display name |
| allocated_by | UUID (FK) | No | Admin who allocated |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Constraint:** UNIQUE(rep_id, client_airtable_id)

---

## Database Functions

```sql
-- Check if user is admin
is_admin(_user_id UUID) RETURNS BOOLEAN

-- Check if user has specific role
has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN

-- Auto-update timestamps
update_updated_at_column() RETURNS TRIGGER

-- Create profile on user signup
handle_new_user() RETURNS TRIGGER
```

---

## Row Level Security (RLS)

All tables have RLS enabled with these patterns:

**profiles:**
- Users can view/update own profile
- Admins can view/update all

**user_roles:**
- Users can view own roles
- Admins can manage all

**orders:**
- Admins can manage all
- Clients can view their own

**deals, business_costs:**
- Admin-only access

**daily_reports:**
- Public insert (for rep form)
- Admins can view/edit all

**notification_preferences:**
- Users can manage own
- Admins can manage all

---

## Edge Functions (55 total)

### Authentication & Users
| Function | Access | Description |
|----------|--------|-------------|
| `invite-client` | Admin | Create client account, send welcome email |
| `invite-rep` | Admin | Create rep account, send welcome email |
| `invite-admin` | Admin | Create admin account |
| `complete-onboarding` | Auth | Link user to Airtable client |
| `reset-client-password` | Admin | Reset user password |
| `delete-user` | Admin | Delete user account |
| `get-client-users` | Admin | Get users for a client |

### Lead Management
| Function | Access | Description |
|----------|--------|-------------|
| `get-client-leads` | Auth | Get leads for user (filtered by role) |
| `get-all-leads-admin` | Admin | Get all leads |
| `get-rep-leads` | Rep | Get rep's submitted leads |
| `get-lead-details` | Auth | Get single lead detail |
| `submit-lead` | Auth | Create lead in Airtable |
| `update-lead` | Admin | Update lead fields |
| `update-lead-status` | Admin | Change lead status, send email |
| `assign-lead-to-client` | Admin | Assign lead to client, send email |
| `update-lead-feedback` | Client | Submit lead feedback |
| `delete-lead` | Admin | Delete lead |
| `categorize-lead-ai` | System | AI analyze lead from Close.com |
| `improve-notes-ai` | System | AI enhance rep notes |

### Airtable Integration
| Function | Access | Description |
|----------|--------|-------------|
| `get-airtable-clients` | Admin | Get all Airtable clients |
| `get-airtable-client-options` | Admin | Lightweight client list |
| `get-airtable-client-data` | Admin | Get client details |
| `get-airtable-reps` | Public | Get all reps (for forms) |
| `update-airtable-client` | Admin | Update client in Airtable |

### P&L
| Function | Access | Description |
|----------|--------|-------------|
| `get-pnl-report` | Admin | Generate P&L report |
| `get-deals` | Admin | Get all deals |
| `create-deal` | Admin | Create deal with auto-calculations |
| `update-deal` | Admin | Update deal |
| `delete-deal` | Admin | Delete deal |
| `get-business-costs` | Admin | Get all costs |
| `create-business-cost` | Admin | Create cost |
| `update-business-cost` | Admin | Update cost |
| `delete-business-cost` | Admin | Delete cost |

### Reporting
| Function | Access | Description |
|----------|--------|-------------|
| `submit-daily-report` | Public | Submit rep daily report |
| `get-my-reports` | Rep | Get own reports |
| `get-rep-reports` | Admin | Get all reports |
| `review-report` | Admin | Review/edit report |
| `parse-screenshot` | System | AI parse dialer screenshot |

### Other
| Function | Access | Description |
|----------|--------|-------------|
| `get-system-stats` | Admin | Dashboard stats |
| `get-orders` | Auth | Get orders |
| `create-order` | Admin | Create order |
| `update-notification-preference` | Auth | Update email prefs |

---

## External APIs

### Airtable (api.airtable.com)

**Config:** `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`

**Tables:**
- **Qualified Lead Table** - All leads
- **Clients** - Client companies
- **Reps** - Sales reps

**Key fields in leads:**
- Company Name, Status, Clients (linked), Rep (linked)
- Contact Name, Email, Phone, Contact LinkedIn
- Company Website, Job Title, Job Description
- Internal Notes, Client Notes
- Callback 1/2/3, Date Created
- AI Suggested Status, AI Reasoning, AI Confidence

### Resend (api.resend.com)

**Config:** `RESEND_API_KEY`
**From:** `Hireflow <team@app.hireflow.uk>`

**Email templates:**
1. Welcome Email (Client) - `invite-client`
2. Welcome Email (Rep) - `invite-rep`
3. Lead Approved - `update-lead-status`
4. New Lead Available - `assign-lead-to-client`

### Close.com (api.close.com)

**Config:** `CLOSE_API_KEY` (Basic auth)

**Usage:** `categorize-lead-ai`
- Fetch call transcripts: `GET /api/v1/activity/call/?lead_id={id}`
- Extract transcript from `call.transcript.text`

### Anthropic Claude (api.anthropic.com)

**Config:** `ANTHROPIC_API_KEY`
**Model:** `claude-3-haiku-20240307`

**Usage:**
- Lead categorization (Approved/Needs Work/Rejected)
- Note improvement for client presentation
- Screenshot parsing (OCR)

---

## Common Query Patterns

### Check user role
```typescript
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);
const isAdmin = roles?.some(r => r.role === 'admin');
```

### Get profile with Airtable link
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('airtable_client_id, client_name')
  .eq('id', userId)
  .single();
```

### Airtable filter for client leads
```
filterByFormula=AND(
  FIND('{clientName}', ARRAYJOIN({Clients})),
  LOWER({Status}) = 'approved'
)
```

### Notification check before email
```typescript
const { data: prefs } = await supabaseAdmin
  .from('notification_preferences')
  .select('user_id, lead_notifications_enabled')
  .in('user_id', userIds);

// Default to true if no preference record
const enabled = prefsMap.get(userId) ?? true;
```
