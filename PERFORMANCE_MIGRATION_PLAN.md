# Performance-Focused Airtable to Supabase Migration Plan

## Current Status

### ❌ **All 14 Edge Functions Still Using Airtable**
- No Supabase queries found in any edge functions
- All functions make HTTP requests to Airtable API (slow, rate-limited)

### ❌ **Database Tables Don't Exist**
- `leads` table: **NOT FOUND** in migrations
- `clients` table: **NOT FOUND** in migrations
- Need to create both tables with proper schema

### ✅ **RLS Policies Pattern Exists**
- Profiles, user_roles, and feedback tables have RLS policies
- Can use same pattern for leads and clients tables

---

## Performance Goals

### Current Airtable Performance Issues
- **Slow API calls**: Each request takes 500ms-2s
- **Rate limiting**: 5 requests/second limit
- **Pagination required**: Max 100 records per request
- **No indexes**: Can't optimize queries
- **Formula-based filtering**: Slow and limited

### Expected Supabase Performance Improvements
- **Fast queries**: 10-50ms for most queries
- **No rate limits**: Can query as fast as needed
- **No pagination limits**: Can fetch all records at once
- **Proper indexes**: Optimized for common queries
- **SQL filtering**: Much faster than Airtable formulas
- **Expected 10-50x speed improvement** for most operations

---

## Phase 1: Database Setup (CRITICAL - Do First)

### Step 1.1: Create `clients` Table

```sql
-- Migration: 20250104000000_create_clients_table.sql

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Basic Information
  client_name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_website TEXT,
  company_name TEXT,
  location TEXT,
  
  -- Business Information
  markets_served TEXT,
  industries_served TEXT,
  sub_industries TEXT,
  role_types TEXT,
  staffing_model TEXT,
  
  -- Campaign Information
  last_5_roles_placed TEXT,
  last_5_companies_worked_with TEXT,
  current_candidates TEXT,
  unique_selling_points TEXT,
  niches_done_well TEXT,
  outreach_methods TEXT,
  
  -- Status
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX idx_clients_client_name ON public.clients(client_name);
CREATE INDEX idx_clients_status ON public.clients(status);

-- RLS Policies for clients table
-- Admins can do everything
CREATE POLICY "Admins can view all clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Clients can view their own client record
CREATE POLICY "Clients can view their own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_name = clients.client_name
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 1.2: Create `leads` Table

```sql
-- Migration: 20250104000001_create_leads_table.sql

-- Create status enum
CREATE TYPE public.lead_status AS ENUM (
  'New',
  'Lead',
  'Approved',
  'Rejected',
  'Needs Work',
  'Not Qualified'
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company Information
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_linkedin TEXT,
  company_description TEXT,
  industry TEXT,
  company_size TEXT,
  employee_count INTEGER,
  country TEXT,
  address TEXT,
  
  -- Contact Information
  contact_name TEXT,
  contact_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  contact_linkedin TEXT,
  
  -- Job Information
  job_title TEXT,
  job_description TEXT,
  job_url TEXT,
  job_type TEXT,
  job_level TEXT,
  
  -- Status & Assignment
  status public.lead_status DEFAULT 'New',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Additional Fields
  ai_summary TEXT,
  availability TEXT,
  last_contact_date DATE,
  next_action TEXT,
  feedback TEXT,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Indexes for performance (CRITICAL for speed)
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_client_id ON public.leads(client_id);
CREATE INDEX idx_leads_company_name ON public.leads(company_name);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_date_created ON public.leads(date_created DESC);
CREATE INDEX idx_leads_status_client ON public.leads(status, client_id); -- Composite for common queries

-- Full-text search index for company name (for search functionality)
CREATE INDEX idx_leads_company_name_trgm ON public.leads USING gin(company_name gin_trgm_ops);
-- Note: Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RLS Policies for leads table
-- Admins can do everything
CREATE POLICY "Admins can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert leads"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Clients can only view leads assigned to them
CREATE POLICY "Clients can view their assigned leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      INNER JOIN public.profiles p ON c.profile_id = p.id OR c.client_name = p.client_name
      WHERE p.id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 1.3: Enable Required Extensions

```sql
-- Migration: 20250104000002_enable_extensions.sql

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## Phase 2: Migrate Edge Functions (Priority Order)

### Strategy: Use Service Role Key for Edge Functions
**All edge functions should use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS**, since:
- Edge functions already handle authentication
- RLS policies are for direct client access
- Edge functions need full access for admin operations
- This is the standard Supabase pattern

### Function Migration Order (By Impact & Complexity)

#### **Tier 1: Core Read Operations** (Highest Impact, Easiest)
These are the most frequently called and will show immediate performance gains.

1. **`get-lead-details`** ⚡ **EASIEST - START HERE**
   - **Current**: Single Airtable API call (~500ms-1s)
   - **New**: Single Supabase query (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Very Low
   - **Impact**: High (used on every lead detail page)

2. **`get-client-leads`** ⚡ **HIGH PRIORITY**
   - **Current**: Airtable API with formula filtering (~1-2s)
   - **New**: Supabase query with WHERE clause (~20-50ms)
   - **Speed Improvement**: 20-40x faster
   - **Complexity**: Low
   - **Impact**: Very High (client portal depends on this)

3. **`get-all-leads-admin`** ⚡ **HIGH PRIORITY**
   - **Current**: Airtable API with complex filtering, multiple client lookups (~2-5s)
   - **New**: Single Supabase query with JOIN (~50-100ms)
   - **Speed Improvement**: 20-50x faster
   - **Complexity**: Medium (needs filtering logic conversion)
   - **Impact**: Very High (admin dashboard)

4. **`get-system-stats`** ⚡ **HIGH PRIORITY**
   - **Current**: Fetches ALL leads from Airtable, counts in JS (~2-5s)
   - **New**: SQL COUNT with GROUP BY (~20-50ms)
   - **Speed Improvement**: 40-100x faster
   - **Complexity**: Low
   - **Impact**: High (dashboard loads faster)

#### **Tier 2: Write Operations** (Medium Priority)
These are less frequent but still important.

5. **`update-lead-status`** ⚡
   - **Current**: Airtable PATCH (~500ms-1s)
   - **New**: Supabase UPDATE (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Very Low

6. **`update-lead-feedback`** ⚡
   - **Current**: Airtable PATCH (~500ms-1s)
   - **New**: Supabase UPDATE (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Very Low

7. **`submit-lead`** ⚡
   - **Current**: Airtable POST (~500ms-1s)
   - **New**: Supabase INSERT (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Low

8. **`update-lead`** ⚡
   - **Current**: Airtable PATCH (~500ms-1s)
   - **New**: Supabase UPDATE (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Low (field mapping exists)

9. **`delete-lead`** ⚡
   - **Current**: Airtable PATCH to update status (~500ms-1s)
   - **New**: Supabase UPDATE status (~10-20ms)
   - **Speed Improvement**: 25-50x faster
   - **Complexity**: Very Low

10. **`assign-lead-to-client`** ⚡
    - **Current**: Airtable PATCH, complex client ID lookup (~1-2s)
    - **New**: Supabase UPDATE with client_id FK (~10-20ms)
    - **Speed Improvement**: 50-100x faster
    - **Complexity**: Low (simpler with FK)

#### **Tier 3: Client Management** (Lower Priority)
These are less frequently called.

11. **`register-client`** ⚡
    - **Current**: Airtable POST, then Supabase profile update (~1-2s)
    - **New**: Supabase INSERT into clients, link to profile (~20-30ms)
    - **Speed Improvement**: 33-67x faster
    - **Complexity**: Medium

12. **`get-airtable-clients` → `get-clients`** ⚡
    - **Current**: Airtable API with pagination (~1-2s)
    - **New**: Supabase SELECT (~20-50ms)
    - **Speed Improvement**: 20-50x faster
    - **Complexity**: Low
    - **Action**: Rename function after migration

13. **`get-airtable-client-data` → `get-client-data`** ⚡
    - **Current**: Airtable API single record (~500ms-1s)
    - **New**: Supabase SELECT (~10-20ms)
    - **Speed Improvement**: 25-50x faster
    - **Complexity**: Low
    - **Action**: Rename function after migration

14. **`get-airtable-client-options`** ❌
    - **Action**: DELETE - No longer needed
    - **Reason**: Use `get-clients` instead

---

## Phase 3: Data Migration Strategy

### Option A: Fresh Start (Recommended if data is manageable)
- Start using Supabase for new leads immediately
- Keep Airtable as read-only backup
- Gradually migrate historical data if needed

### Option B: Full Migration
- Export all leads from Airtable
- Transform data (map field names, convert IDs)
- Import into Supabase
- Verify data integrity
- Switch all functions to Supabase

### Migration Script Pattern
```typescript
// Example: Migrate leads from Airtable to Supabase
// Run this once to populate Supabase with existing data

const airtableLeads = await fetchAllFromAirtable();
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

for (const lead of airtableLeads) {
  // Map Airtable fields to Supabase columns
  const supabaseLead = {
    company_name: lead.fields['Company Name'],
    email: lead.fields['Email'],
    status: mapStatus(lead.fields['Status']),
    client_id: await resolveClientId(lead.fields['Client']),
    // ... map all fields
  };
  
  await supabaseAdmin.from('leads').insert(supabaseLead);
}
```

---

## Phase 4: Testing Strategy

### For Each Function Migration:
1. **Unit Test**: Test function with sample data
2. **Integration Test**: Test with real Supabase data
3. **Performance Test**: Compare response times (should be 10-50x faster)
4. **Frontend Test**: Verify UI still works correctly
5. **Edge Case Test**: Test with null values, missing data, etc.

### Performance Benchmarks
- **Before**: Document current Airtable response times
- **After**: Measure Supabase response times
- **Target**: 90%+ reduction in response time

---

## Phase 5: Deployment Strategy

### Recommended Approach: Gradual Rollout
1. **Week 1**: Deploy database tables + Tier 1 functions (read operations)
2. **Week 2**: Deploy Tier 2 functions (write operations)
3. **Week 3**: Deploy Tier 3 functions (client management)
4. **Week 4**: Remove Airtable dependencies, cleanup

### Rollback Plan
- Keep Airtable functions as backup
- Use feature flags to switch between Airtable/Supabase
- Monitor error rates and performance
- Rollback if issues occur

---

## Key Conversion Patterns

### Airtable Formula → SQL WHERE

| Airtable | SQL |
|----------|-----|
| `{Status} = 'Approved'` | `WHERE status = 'Approved'` |
| `{Status} != 'Not Qualified'` | `WHERE status != 'Not Qualified'` |
| `{Client} = 'Client Name'` | `WHERE client_id = (SELECT id FROM clients WHERE client_name = 'Client Name')` |
| `OR({Client} = '', {Client} = BLANK())` | `WHERE client_id IS NULL` |
| `SEARCH(LOWER('term'), LOWER({Company Name})) > 0` | `WHERE company_name ILIKE '%term%'` |
| `AND(...)` | Multiple `AND` conditions |

### Field Name Mapping

| Airtable Field | Supabase Column |
|---------------|----------------|
| `Company Name` | `company_name` |
| `Status` | `status` |
| `Client` | `client_id` (FK) |
| `Contact Name` | `contact_name` |
| `Email` | `email` |
| `Phone` | `phone` |
| `Contact LinkedIn` | `contact_linkedin` |
| `Company Website` | `company_website` |
| `Company LinkedIn` | `company_linkedin` |
| `Company Description` | `company_description` |
| `Address` | `address` |
| `Country` | `country` |
| `Industry` | `industry` |
| `Company Size` | `company_size` |
| `Employee Count` | `employee_count` |
| `Job Title` | `job_title` |
| `Job Description` | `job_description` |
| `Job URL` | `job_url` |
| `Job Type` | `job_type` |
| `Job Level` | `job_level` |
| `AI Summary` | `ai_summary` |
| `Availability` | `availability` |
| `Last Contact Date` | `last_contact_date` |
| `Next Action` | `next_action` |
| `Feedback` | `feedback` |
| `Date Created` | `date_created` |

---

## RLS Policy Summary

### For Edge Functions
- **Use `SUPABASE_SERVICE_ROLE_KEY`** - Bypasses RLS
- Edge functions handle auth themselves
- RLS is for direct client access protection

### For Direct Client Access (if needed)
- Admins: Full access via `is_admin()` function
- Clients: Can only see their own leads via `client_id` FK
- Properly secured with RLS policies

---

## Performance Optimization Tips

1. **Use Indexes**: Already included in migration
2. **Use SELECT with specific columns**: Don't use `SELECT *`
3. **Use LIMIT when possible**: For pagination
4. **Use JOINs efficiently**: For client name resolution
5. **Batch operations**: For bulk inserts/updates
6. **Use connection pooling**: Supabase handles this automatically
7. **Monitor query performance**: Use Supabase dashboard

---

## Estimated Timeline

- **Phase 1 (Database Setup)**: 2-3 hours
- **Phase 2 (Function Migration)**: 12-16 hours
  - Tier 1: 4-6 hours
  - Tier 2: 4-6 hours
  - Tier 3: 2-4 hours
- **Phase 3 (Data Migration)**: 1-2 hours (if needed)
- **Phase 4 (Testing)**: 4-6 hours
- **Phase 5 (Deployment)**: 2-3 hours

**Total**: 21-30 hours

---

## Success Metrics

- ✅ All functions migrated to Supabase
- ✅ 90%+ reduction in response times
- ✅ No Airtable dependencies remaining
- ✅ All tests passing
- ✅ Frontend working correctly
- ✅ RLS policies properly configured

---

## Next Steps

1. **Create database migrations** (Phase 1)
2. **Start with `get-lead-details`** (Easiest, high impact)
3. **Test and verify performance improvements**
4. **Continue with Tier 1 functions**
5. **Gradually migrate remaining functions**

