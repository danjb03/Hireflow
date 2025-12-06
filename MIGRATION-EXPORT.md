# Hireflow Migration Export

## ✅ Step 1: Database Schema
Already exported in `supabase-standalone-migration.sql`

---

## ✅ Step 2: Data Export

### Profiles Table
```sql
INSERT INTO public.profiles (id, email, client_name, initial_password, created_at, updated_at) VALUES
('fe5d16a0-3101-40f2-afea-0b312fd7e039', 'daniel@tnwmarketing.com', NULL, NULL, '2025-11-23 10:54:13.432825+00', '2025-11-23 10:54:13.432825+00'),
('58a6c196-0c95-406a-a9a9-f993f1709a72', 'daniel@tnwenergy.com', NULL, NULL, '2025-11-23 11:59:27.77181+00', '2025-11-23 12:30:23.375121+00'),
('ac8ae53a-7455-44c2-be99-4945ab28584b', 'danbell536@gmail.com', 'test 1', '0.arbtkz0jtvA1!', '2025-11-26 10:48:54.851369+00', '2025-11-26 10:54:15.279103+00');
```

### User Roles Table
```sql
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('df4fe6a4-c0d4-4a41-b1fb-0cce0eac2305', 'fe5d16a0-3101-40f2-afea-0b312fd7e039', 'admin', '2025-11-23 10:58:04.553432+00'),
('998e1c1d-26f2-4228-9764-1c6da307941f', '58a6c196-0c95-406a-a9a9-f993f1709a72', 'client', '2025-11-23 11:59:28.454875+00'),
('8c697158-dcec-4a2e-aa4e-fd9454dbc14e', 'ac8ae53a-7455-44c2-be99-4945ab28584b', 'client', '2025-11-26 10:48:55.368694+00');
```

> ⚠️ **Note**: You'll need to recreate users in Supabase Auth first (same emails), then the profile data will be linked via the `id` column which references `auth.users(id)`.

---

## ✅ Step 3: Edge Functions

Copy the entire `supabase/functions/` folder to your new project:

| Function | Purpose |
|----------|---------|
| `assign-lead-to-client` | Assign leads to clients in Airtable |
| `delete-lead` | Delete leads from Airtable |
| `delete-user` | Delete users from Supabase Auth |
| `get-airtable-client-options` | Fetch client dropdown options from Airtable |
| `get-all-leads-admin` | Fetch all leads for admin dashboard |
| `get-client-leads` | Fetch leads for specific client |
| `get-lead-details` | Fetch single lead details |
| `get-system-stats` | Fetch dashboard statistics |
| `invite-client` | Create new client user |
| `reset-client-password` | Reset client password |
| `submit-lead` | Submit new lead to Airtable |
| `update-lead` | Update lead in Airtable |
| `update-lead-feedback` | Update lead feedback |
| `update-lead-status` | Update lead status |

---

## ✅ Step 4: Secrets Required

Add these in your new Supabase project at **Dashboard → Settings → Edge Functions → Secrets**:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `AIRTABLE_API_TOKEN` | Your Airtable API token | ✅ Yes |
| `AIRTABLE_BASE_ID` | Your Airtable base ID | ✅ Yes |
| `NOTION_API_KEY` | Notion API key (if using Notion) | ❌ Optional |
| `MAIN_NOTION_DATABASE_ID` | Notion database ID | ❌ Optional |

> **Note**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in all edge functions.

---

## 📋 Migration Checklist

### In New Supabase Project:

1. [ ] Run `supabase-standalone-migration.sql` in SQL Editor
2. [ ] Create users in Auth (Authentication → Users → Add User)
   - `daniel@tnwmarketing.com` (admin)
   - `daniel@tnwenergy.com` (client)
   - `danbell536@gmail.com` (client)
3. [ ] Run the data INSERT statements (profiles will auto-create on signup via trigger)
4. [ ] Add secrets in Edge Functions settings
5. [ ] Copy `supabase/functions/` to your local project
6. [ ] Deploy functions: `supabase functions deploy --project-ref YOUR_PROJECT_REF`

### In Your App:

1. [ ] Update `.env` with new Supabase URL and anon key:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_new_anon_key
   VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
   ```

2. [ ] Update `supabase/config.toml`:
   ```toml
   project_id = "YOUR_PROJECT_REF"
   ```

---

## 🔐 Auth Configuration

In your new Supabase project, go to **Authentication → Providers → Email** and:
- [ ] Enable "Confirm email" (or disable for easier testing)
- [ ] Set Site URL to your app's URL
