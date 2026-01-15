# Hireflow User Flows

This document describes how users move through the application, what each user type can do, and the current state of each feature.

---

## User Types

### 1. Admin
- **Role:** `admin` in `user_roles` table
- **Default admin:** daniel@tnwmarketing.com
- **Layout:** `AdminLayout`
- **Access:** Full system control

**Permissions:**
- View/manage all clients
- View/manage all leads
- Assign leads to clients
- Invite new clients and reps
- View P&L and financial reports
- View rep performance reports
- Manage email notification settings
- Delete users and leads

### 2. Client
- **Role:** Default (no explicit role, or `client` role)
- **Data:** `profiles.airtable_client_id` links to Airtable
- **Layout:** `ClientLayout`
- **Requirement:** Must complete onboarding before accessing dashboard

**Permissions:**
- View leads assigned to them (Approved status only)
- View order/delivery progress
- Provide feedback on leads
- View callback calendar
- Update account settings

### 3. Rep (Sales Representative)
- **Role:** `rep` in `user_roles` table
- **Data:** `profiles.airtable_rep_id` links to Airtable Reps table
- **Layout:** `RepLayout`

**Permissions:**
- Submit new leads
- View their own submitted leads
- View their daily reports
- Submit daily performance reports
- Update account settings

---

## Routes

### Public Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | Index.tsx | Landing page |
| `/login` | Login.tsx | Sign in/up (auto-detects) |
| `/reset-password` | ResetPassword.tsx | Password reset flow |
| `/rep-report` | RepReport.tsx | Public rep report form |

### Admin Routes (`/admin/*`)
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminDashboard.tsx | Overview stats, client list |
| `/admin/clients` | AdminClients.tsx | Manage all clients |
| `/admin/clients/:id` | AdminClientDetail.tsx | Single client detail |
| `/admin/leads` | AdminAllLeads.tsx | All leads in system |
| `/admin/leads/:id` | AdminLeadDetail.tsx | Lead detail + actions |
| `/admin/invite` | AdminInvite.tsx | Invite new client users |
| `/admin/invite-rep` | AdminInviteRep.tsx | Invite new rep users |
| `/admin/submit-lead` | AdminSubmitLead.tsx | Admin lead submission |
| `/admin/pnl` | AdminPnL.tsx | Profit & Loss reporting |
| `/admin/reporting` | AdminReporting.tsx | Rep performance reports |
| `/admin/sentiment` | AdminSentiment.tsx | Client sentiment analysis |
| `/admin/email-settings` | AdminEmailSettings.tsx | Email notification settings |

### Client Routes (`/client/*`)
| Route | Page | Description |
|-------|------|-------------|
| `/onboarding` | ClientOnboarding.tsx | First-time setup |
| `/client/dashboard` | ClientDashboard.tsx | Portal home |
| `/client/leads` | ClientLeads.tsx | Assigned leads list |
| `/client/leads/:id` | ClientLeadDetail.tsx | Lead detail (read-only) |
| `/client/calendar` | ClientCalendar.tsx | Callback appointments |
| `/client/settings` | ClientSettings.tsx | Account settings |

### Rep Routes (`/rep/*`)
| Route | Page | Description |
|-------|------|-------------|
| `/rep/dashboard` | RepDashboard.tsx | Portal home |
| `/rep/leads` | RepLeads.tsx | Submitted leads list |
| `/rep/leads/:id` | RepLeadDetail.tsx | Lead detail |
| `/rep/submit-lead` | RepSubmitLead.tsx | Create new lead |
| `/rep/reports` | RepReports.tsx | Performance reports |
| `/rep/settings` | RepSettings.tsx | Account settings |

---

## Core User Flows

### Flow 1: Client Onboarding

**Admin initiates:**
1. Admin goes to `/admin/invite`
2. Selects Airtable client from dropdown
3. Enters user's email address
4. Clicks "Send Invite"
5. System creates auth account + profile
6. System sends welcome email with temp password

**Client completes:**
1. Client receives email with credentials
2. Client logs in at `/login`
3. System detects `onboarding_completed = false`
4. Redirects to `/onboarding`
5. Client fills out Airtable onboarding form
6. Clicks "Complete Onboarding"
7. System links profile to Airtable client
8. Sets `onboarding_completed = true`
9. Redirects to `/client/dashboard`

**Edge functions:** `invite-client`, `complete-onboarding`

### Flow 2: Rep Onboarding

1. Admin goes to `/admin/invite-rep`
2. Selects rep from Airtable dropdown
3. Clicks "Send Invite"
4. System creates auth account + profile with `airtable_rep_id`
5. Assigns `rep` role in `user_roles`
6. Sends welcome email
7. Rep can immediately log in and submit leads

**Edge function:** `invite-rep`

### Flow 3: Lead Submission (Rep)

1. Rep logs in, goes to `/rep/submit-lead`
2. Fills out form:
   - Company info (name, website, LinkedIn)
   - Contact info (name, email, phone, LinkedIn)
   - Job info (title, description)
   - Callback slots (up to 3 datetime options)
   - Close.com link (optional)
   - Call notes (required, detailed)
3. Submits form
4. System creates lead in Airtable with status "New"
5. If Close link provided, triggers AI categorization
6. Success screen with options to submit another or view leads

**Edge functions:** `submit-lead`, `categorize-lead-ai`

### Flow 4: Lead Management (Admin)

1. Admin views lead at `/admin/leads/:id`
2. Lead shows:
   - Callback slots (prominent)
   - Company/contact details
   - Rep notes
   - AI recommendation (if available)
3. Admin actions:
   - **Assign to Client:** Select client → Click Assign
   - **Update Status:** Change to Approved/Rejected/Needs Work
   - **Apply AI Suggestion:** One-click accept AI recommendation
4. When status → "Approved", system sends email to client users

**Edge functions:** `get-lead-details`, `assign-lead-to-client`, `update-lead-status`

### Flow 5: Client Views Lead

1. Client logs in, sees dashboard at `/client/dashboard`
2. Dashboard shows:
   - Total leads count
   - Active leads
   - Upcoming callbacks
   - Order progress (leads purchased vs delivered)
3. Clicks lead to view `/client/leads/:id`
4. Sees:
   - Company and contact info
   - Job details
   - Client notes (AI-polished, not raw rep notes)
   - Callback appointment slots
5. Can provide feedback on lead

**Edge functions:** `get-client-leads`, `update-lead-feedback`

### Flow 6: Authentication

1. User goes to `/login`
2. Enters email and password
3. System authenticates with Supabase Auth
4. Queries `user_roles` for role
5. Redirects based on role:
   - Admin → `/admin`
   - Rep → `/rep/dashboard`
   - Client → `/client/dashboard`
6. If client and `onboarding_completed = false` → `/onboarding`

---

## Page Details

### AdminDashboard.tsx
- Stats: Total clients, total leads, lead statuses
- Client list with status indicators
- Lead stats per client
- Quick actions: View client, manage leads

### AdminClients.tsx
- Full client table with search
- Lead stats per client (total, approved, rejected, etc.)
- Client status management
- Password reset
- Delete/deactivate clients

### AdminLeadDetail.tsx
- Comprehensive lead view
- Client assignment dropdown
- Status management
- Task checklist (7 items)
- AI recommendation display
- Callback slots prominent

### ClientDashboard.tsx
- Welcome message
- Lead stats (total, active, callbacks)
- Recent leads (last 5)
- Order progress bars

### RepSubmitLead.tsx
- Multi-section form
- Callback datetime pickers (3 slots)
- Close.com link input
- Required call notes
- Success confirmation

---

## Current State

### Complete and Working
- User authentication (login, logout, password reset)
- Admin dashboard with client overview
- Client onboarding flow
- Rep onboarding flow
- Lead submission (rep and admin)
- Lead detail viewing (all user types)
- Lead assignment to clients
- Lead status management
- Email notifications on lead approval
- Email notification settings (per user)
- P&L reporting
- Rep performance reporting
- AI lead categorization via Close.com
- Client sentiment tracking

### Partially Built
- Client calendar (basic, needs enhancement)
- Order tracking (functional, needs more detail)

### Not Started / Planned
- Weekly digest emails
- Advanced reporting filters
- Bulk lead operations
- Client self-service order management
