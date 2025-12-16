# Style Guide

Coding conventions and patterns for the Hireflow codebase.

## File Organization

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AdminLeadDetail.tsx` |
| Hooks | camelCase with `use` prefix | `use-toast.ts` |
| Utilities | camelCase | `lazyRetry.ts` |
| Edge functions | kebab-case | `get-client-leads/` |
| Types/Interfaces | PascalCase | `interface LeadData {}` |

### Directory Structure

```
src/
├── components/
│   ├── ui/              # Shared UI (shadcn)
│   ├── admin/           # Admin-specific
│   └── [feature]/       # Feature-specific
├── pages/
│   ├── Admin*.tsx       # Admin pages
│   ├── Client*.tsx      # Client pages
│   └── *.tsx            # Public/shared pages
├── hooks/               # Custom hooks
├── lib/                 # Utilities
└── integrations/        # External services
```

## React Components

### Component Structure

```typescript
// 1. Imports (external → internal → types)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// 2. Types/Interfaces
interface ComponentProps {
  id: string;
  onUpdate?: () => void;
}

interface DataType {
  field: string;
}

// 3. Component
const ComponentName = ({ id, onUpdate }: ComponentProps) => {
  // 3a. Hooks (navigation, state, effects)
  const navigate = useNavigate();
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(true);

  // 3b. Effects
  useEffect(() => {
    loadData();
  }, [id]);

  // 3c. Handlers
  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('function-name', {
        body: { id }
      });
      if (error) throw error;
      setData(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    // action logic
    onUpdate?.();
  };

  // 3d. Early returns (loading, error states)
  if (loading) {
    return <div>Loading...</div>;
  }

  // 3e. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// 4. Export
export default ComponentName;
```

### Page Components

Admin pages should wrap content with `AdminLayout`:

```typescript
const AdminFeature = () => {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUser();
  }, []);

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Page content */}
      </div>
    </AdminLayout>
  );
};
```

Client pages use `ClientLayout` (handles onboarding redirect):

```typescript
const ClientFeature = () => {
  const [userEmail, setUserEmail] = useState("");
  // ... similar pattern

  return (
    <ClientLayout userEmail={userEmail}>
      {/* Page content */}
    </ClientLayout>
  );
};
```

## Data Fetching

### Standard Pattern

```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('function-name');
      if (error) throw error;
      setData(data.items || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### With useCallback (for refresh)

```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('function-name');
    if (error) throw error;
    setData(data.items || []);
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

## Forms

### React Hook Form + Zod

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name required"),
  count: z.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

const MyForm = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Submit logic
      toast({ title: "Success", description: "Saved!" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
};
```

## Edge Functions

### Standard Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Check admin role (if needed)
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // 3. Parse request
    const { param1, param2 } = await req.json();
    if (!param1) throw new Error('param1 is required');

    // 4. Business logic
    const airtableToken = Deno.env.get('AIRTABLE_API_TOKEN');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID');

    // ... Airtable API calls

    // 5. Return success
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Admin Service Client

For operations requiring elevated privileges:

```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Now can bypass RLS
const { data } = await supabaseAdmin.from('profiles').select('*');
```

## Styling

### Tailwind Classes

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === "primary" && "primary-variant"
)} />
```

### Common Patterns

```typescript
// Page container
<div className="space-y-6">

// Card layout
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Form grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Flex with gap
<div className="flex items-center gap-2">

// Loading state
{loading ? (
  <Loader2 className="h-4 w-4 animate-spin" />
) : (
  <span>Content</span>
)}
```

### Status Badge Colors

```typescript
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'New': 'bg-blue-100 text-blue-700',
    'Approved': 'bg-emerald-100 text-emerald-700',
    'Rejected': 'bg-red-100 text-red-700',
    'Needs Work': 'bg-amber-100 text-amber-700',
    'Not Qualified': 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

<Badge className={getStatusColor(status)}>{status}</Badge>
```

## TypeScript

### Type Definitions

Define interfaces at the top of files or in separate type files:

```typescript
interface Lead {
  id: string;
  companyName: string;
  status: 'New' | 'Approved' | 'Rejected' | 'Needs Work';
  contactName: string | null;
  // ... other fields
}

interface Client {
  id: string;
  email: string;
  client_name: string | null;
}
```

### Nullable Fields

Prefer `| null` over optional `?`:

```typescript
// Prefer this (explicit null)
interface Data {
  field: string | null;
}

// Over this (undefined)
interface Data {
  field?: string;
}
```

### Type Assertions

Avoid `any` when possible. Use type guards:

```typescript
// Type guard
const isLead = (obj: unknown): obj is Lead => {
  return typeof obj === 'object' && obj !== null && 'companyName' in obj;
};

// Usage
if (isLead(data)) {
  console.log(data.companyName);
}
```

## Error Handling

### Frontend

```typescript
try {
  const { data, error } = await supabase.functions.invoke('function');
  if (error) throw error;
  // Success handling
} catch (error: any) {
  console.error('Error:', error);
  toast({
    title: "Error",
    description: error.message || "Something went wrong",
    variant: "destructive"
  });
}
```

### Edge Functions

```typescript
try {
  // Logic
} catch (error) {
  console.error('Error:', error);
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Imports

### Order

1. React/framework imports
2. Third-party libraries
3. Internal components (`@/components/`)
4. Internal utilities (`@/lib/`, `@/hooks/`)
5. Types/interfaces

### Path Aliases

Use `@/` alias for src imports:

```typescript
// Good
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Avoid relative paths from deep nesting
import { Button } from "../../../components/ui/button";
```

## Comments

### When to Comment

- Complex business logic
- Non-obvious workarounds
- API response transformations
- Important decisions

### Style

```typescript
// Single line for brief explanations

/**
 * Multi-line for complex functions
 * @param leadId - Airtable record ID
 * @returns Updated lead object
 */

// TODO: Future enhancement
// FIXME: Known issue to address
```

## Testing

### Manual Testing Checklist

For new features:
- [ ] Admin can access
- [ ] Client cannot access (if admin-only)
- [ ] Loading states display
- [ ] Error handling works
- [ ] Toast notifications appear
- [ ] Data refreshes after mutations

### Console Logging

Use descriptive logs in edge functions:

```typescript
console.log('Processing lead:', { leadId, clientId });
console.error('Airtable API error:', errorBody);
```

## Git Commits

### Message Format

```
<type>: <description>

<optional body>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure
- `docs`: Documentation
- `style`: Formatting
- `chore`: Maintenance

Example:
```
feat: Add lead status filtering to admin page

- Add status dropdown filter
- Update get-all-leads-admin to accept status param
- Persist filter in URL query params
```
