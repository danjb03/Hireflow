# API Reference

This document covers all Supabase Edge Functions and Airtable integration patterns.

## Edge Functions Overview

All functions:
- Require JWT authentication (Authorization: Bearer `<token>`)
- Return JSON responses
- Support CORS (preflight OPTIONS requests)
- Follow consistent error handling

**Base URL**: `https://[project-id].supabase.co/functions/v1/`

## Authentication

Every request must include:

```
Authorization: Bearer <supabase-jwt-token>
```

Get the token from Supabase client:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Calling Functions

### From Frontend (Recommended)

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: 'value1' }
});
```

### Direct HTTP

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/function-name`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ param1: 'value1' })
  }
);
```

---

## Lead Functions

### get-client-leads

Fetches leads for the authenticated user.

**Auth**: JWT (admin or client)

**Request**: No body required

**Response**:
```typescript
{
  leads: Array<{
    id: string;
    companyName: string;
    contactName: string | null;
    contactTitle: string | null;
    email: string;
    phone: string;
    contactLinkedIn: string | null;
    companyWebsite: string;
    companyLinkedIn: string | null;
    companyDescription: string | null;
    address: string | null;
    country: string | null;
    industry: string | null;
    industry2: string | null;
    employeeCount: string | null;
    companySize: string | null;
    founded: string | null;
    titlesOfRoles: string | null;
    status: string;
    assignedClient: string | null;
    aiSummary: string | null;
    feedback: string | null;
    availability: string | null;
    lastContactDate: string | null;
    nextAction: string | null;
    dateCreated: string;
  }>
}
```

**Behavior**:
- Admin: Returns all leads
- Client: Returns only leads where `Client` field matches their `client_name`

---

### get-all-leads-admin

Fetches all leads with filtering (admin only).

**Auth**: JWT + Admin role

**Request** (query params or body):
```typescript
{
  status?: string;      // 'New', 'Approved', 'Rejected', 'Needs work', 'Not Qualified'
  client?: string;      // Client name or 'unassigned'
  search?: string;      // Company name search
}
```

**Response**: Same as `get-client-leads`

**Filter Logic**:
- By default, excludes "Not Qualified" leads
- `status=Not Qualified` shows only archived leads
- `client=unassigned` shows leads with empty Client field
- `search` does case-insensitive company name match

---

### get-lead-details

Fetches a single lead by ID.

**Auth**: JWT + Admin role

**Request**:
```typescript
{ leadId: string }  // Airtable record ID
```

**Response**:
```typescript
{ lead: Lead }  // Full lead object
```

---

### submit-lead

Creates a new lead in Airtable.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  companyWebsite?: string;
  industry?: string;
  // ... other lead fields
}
```

**Response**:
```typescript
{
  success: true;
  lead: { id: string; /* created record */ }
}
```

---

### update-lead

Updates lead fields in Airtable.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  leadId: string;
  updates: {
    companyName?: string;
    contactName?: string;
    email?: string;
    // ... any lead field
  }
}
```

**Field Mapping**:
```
companyName      → 'Company Name'
contactName      → 'Contact Name'
contactTitle     → 'Contact Title'
email            → 'Email'
phone            → 'Phone'
linkedInProfile  → 'Contact LinkedIn'
companyWebsite   → 'Company Website'
companyLinkedIn  → 'Company LinkedIn'
industry         → 'Industry'
industry2        → 'Industry 2'
companySize      → 'Company Size'
employeeCount    → 'Employee Count'
founded          → 'Founded'
country          → 'Country'
address          → 'Address'
companyDescription → 'Company Description'
titlesOfRoles    → 'Titles of Roles'
aiSummary        → 'AI Summary'
feedback         → 'Feedback'
availability     → 'Availability'
lastContactDate  → 'Last Contact Date'
nextAction       → 'Next Action'
```

**Response**:
```typescript
{ success: true; lead: Lead }
```

---

### update-lead-status

Changes lead status.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  leadId: string;
  status: 'New' | 'Approved' | 'Rejected' | 'Needs work';
}
```

**Response**:
```typescript
{ success: true }
```

---

### update-lead-feedback

Stores client feedback on a lead.

**Auth**: JWT (admin or client)

**Request**:
```typescript
{
  leadId: string;
  feedback: string;
}
```

**Response**:
```typescript
{ success: true }
```

---

### delete-lead

Marks a lead as "Not Qualified" (soft delete).

**Auth**: JWT + Admin role

**Request**:
```typescript
{ leadId: string }
```

**Response**:
```typescript
{ success: true }
```

**Note**: Does not actually delete the record - sets Status to "Not Qualified" so it's filtered from main views.

---

### assign-lead-to-client

Assigns a lead to a client by updating the Client field in Airtable.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  leadId: string;    // Airtable record ID
  clientId: string;  // Supabase profile ID
}
```

**Behavior**:
1. Fetches client's profile from Supabase
2. Gets `airtable_client_id` and `client_name`
3. Updates lead's Client field:
   - If `airtable_client_id` exists: Uses Airtable linked record format `[rec_xxx]`
   - Otherwise: Uses `client_name` as text value

**Response**:
```typescript
{ success: true }
```

---

## Client Functions

### invite-client

Creates a new client account.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  email: string;
  clientName: string;
  leadsPurchased?: number;
  onboardingDate?: string;        // ISO date
  targetDeliveryDate?: string;    // ISO date
}
```

**Behavior**:
1. Creates Supabase auth user with temp password
2. Creates profile record with provided fields
3. Assigns 'client' role
4. Returns temp password for admin to share

**Response**:
```typescript
{
  success: true;
  userId: string;
  tempPassword: string;
}
```

---

### register-client

Completes client onboarding.

**Auth**: JWT (client)

**Request**:
```typescript
{
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  companyWebsite: string;
  companyName: string;
  location: string;
  marketsServed: string;
  industriesServed: string;
  subIndustries: string;
  roleTypes: string;
  staffingModel: string;
  lastRolesPlaced: string;
  lastCompaniesWorkedWith: string;
  currentCandidates: string;
  uniqueSellingPoints: string;
  nicheSuccesses: string;
  outreachMethods: string;
}
```

**Behavior**:
1. Creates record in Airtable Clients table
2. Updates profile with `airtable_client_id`
3. Sets `onboarding_completed = true`
4. Sets `client_name` for lead filtering

**Response**:
```typescript
{
  success: true;
  airtableClientId: string;
}
```

---

### reset-client-password

Resets a client's password.

**Auth**: JWT + Admin role

**Request**:
```typescript
{
  userId: string;
  newPassword: string;
}
```

**Response**:
```typescript
{ success: true }
```

---

### get-airtable-clients

Fetches all clients from Airtable.

**Auth**: JWT + Admin role

**Response**:
```typescript
{
  clients: Array<{
    id: string;       // Airtable record ID
    name: string;     // Client Name field
    email: string | null;
  }>
}
```

---

### get-airtable-client-data

Fetches detailed client record from Airtable.

**Auth**: JWT + Admin role

**Request**:
```typescript
{ airtableClientId: string }
```

**Response**:
```typescript
{
  fields: {
    'Client Name': string;
    'Contact Person': string;
    'Email': string;
    // ... all Airtable client fields
  }
}
```

---

### get-airtable-client-options

Gets available Client field options from Airtable.

**Auth**: JWT + Admin role

**Response**:
```typescript
{
  options: string[]  // List of client names
}
```

---

## System Functions

### get-system-stats

Fetches dashboard statistics.

**Auth**: JWT + Admin role

**Response**:
```typescript
{
  totalClients: number;
  totalLeads: number;
  statusBreakdown: {
    new: number;
    approved: number;
    rejected: number;
    needsWork: number;
  }
}
```

---

### delete-user

Deletes a user account.

**Auth**: JWT

**Request**:
```typescript
{ userId: string }
```

**Response**:
```typescript
{ success: true }
```

---

## External Integration

### clay-update-lead

Updates lead data from Clay CRM integration.

**Auth**: JWT + Admin role

**Request**: Clay-specific payload

**Response**:
```typescript
{ success: true }
```

---

## Error Handling

All functions return errors in this format:

```typescript
{
  error: string;           // Human-readable message
  details?: string;        // Stack trace (in development)
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad request (missing params, validation error)
- `401`: Unauthorized (missing/invalid JWT)
- `403`: Forbidden (insufficient role)
- `500`: Server error (Airtable API error, etc.)

---

## Airtable API Patterns

### Filter Formula Syntax

```typescript
// Single condition
`{Status} = 'Approved'`

// Multiple conditions (AND)
`AND({Status} != 'Not Qualified', {Client} = 'ClientName')`

// Empty field check
`OR({Client} = '', {Client} = BLANK())`

// Case-insensitive search
`SEARCH(LOWER('searchterm'), LOWER({Company Name})) > 0`
```

### Pagination

Airtable returns max 100 records per request. Functions handle pagination:

```typescript
let allRecords = [];
let offset = undefined;

do {
  const url = `${baseUrl}?${offset ? `offset=${offset}` : ''}`;
  const response = await fetch(url, { headers });
  const data = await response.json();

  allRecords = [...allRecords, ...data.records];
  offset = data.offset;  // undefined when no more pages
} while (offset);
```

### Record Update

```typescript
await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fields: { 'Field Name': 'value' }
  })
});
```

---

## Frontend Usage Examples

### Fetching Leads

```typescript
// In React component
const [leads, setLeads] = useState([]);

useEffect(() => {
  const fetchLeads = async () => {
    const { data, error } = await supabase.functions.invoke('get-client-leads');
    if (error) {
      toast.error('Failed to load leads');
      return;
    }
    setLeads(data.leads);
  };
  fetchLeads();
}, []);
```

### Updating Lead Status

```typescript
const updateStatus = async (leadId: string, status: string) => {
  const { error } = await supabase.functions.invoke('update-lead-status', {
    body: { leadId, status }
  });

  if (error) {
    toast.error('Failed to update status');
    return;
  }

  toast.success('Status updated');
  // Refresh lead data
};
```

### Assigning Lead to Client

```typescript
const assignLead = async (leadId: string, clientId: string) => {
  const { error } = await supabase.functions.invoke('assign-lead-to-client', {
    body: { leadId, clientId }
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success('Lead assigned');
};
```
