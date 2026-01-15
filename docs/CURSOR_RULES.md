# Hireflow Cursor Rules

This document contains coding rules and patterns for AI-assisted development in this codebase.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| Vite | 7.2.7 | Build tool |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | Latest | UI components (Radix primitives) |
| lucide-react | 0.462.0 | Icons (ONLY icon library) |
| React Router | 6.30.1 | Routing |
| Supabase | Latest | Backend (Postgres + Edge Functions) |
| react-hook-form | 7.61.1 | Forms |
| zod | 3.25.76 | Validation |
| sonner | 1.7.4 | Toast notifications |
| recharts | 2.15.4 | Charts |
| date-fns | 3.6.0 | Date handling |

---

## File Structure

```
src/
├── pages/              # Page components (PascalCase.tsx)
├── components/
│   ├── ui/             # shadcn/ui components (lowercase.tsx)
│   ├── admin/          # Admin-specific components
│   ├── landing/        # Landing page components
│   ├── reporting/      # Reporting feature components
│   └── pnl/            # P&L feature components
├── hooks/              # Custom React hooks (use-*.ts)
├── lib/                # Utility functions
└── integrations/
    └── supabase/       # Supabase client and types

supabase/
├── functions/          # Edge functions (kebab-case/)
│   └── function-name/
│       └── index.ts
└── migrations/         # SQL migrations
```

---

## Import Order

Always organize imports in this order:

```typescript
// 1. React hooks and router
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

// 2. Supabase client
import { supabase } from "@/integrations/supabase/client";

// 3. shadcn/ui components (grouped)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 4. Notifications
import { toast } from "sonner";

// 5. Icons
import { Users, FileText, Loader2 } from "lucide-react";

// 6. Local utilities and types
import { cn } from "@/lib/utils";

// 7. Layout and custom components
import AdminLayout from "@/components/AdminLayout";
```

---

## Component Structure

```typescript
const PageName = () => {
  const navigate = useNavigate();

  // State declarations
  const [data, setData] = useState<DataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  // Data loading effect
  useEffect(() => {
    loadData();
  }, []);

  // Async functions
  const loadData = async () => {
    try {
      setIsLoading(true);
      // ... fetch logic
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized values
  const filteredData = useMemo(() => {
    return data.filter(/* ... */);
  }, [data, filterValue]);

  // Event handlers
  const handleAction = async () => {
    // ...
  };

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="space-y-6">
          {/* Skeleton components */}
        </div>
      </AdminLayout>
    );
  }

  // Main render
  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
          <p className="text-sm text-muted-foreground mt-1">Description</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Cards */}
        </div>

        {/* Main Content */}
        {/* ... */}
      </div>
    </AdminLayout>
  );
};

export default PageName;
```

---

## Authentication Pattern

```typescript
useEffect(() => {
  checkAuth();
}, []);

const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    navigate("/login");
    return;
  }

  setUserEmail(session.user.email || "");

  // Check role if needed
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);

  const isAdmin = roles?.some(r => r.role === "admin");
  if (!isAdmin) {
    toast.error("Access denied");
    navigate("/");
    return;
  }

  await loadData();
};
```

---

## Edge Function Template (Deno)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // For admin operations, use service role client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) throw new Error('Admin access required');

    // Parse request body
    const { param1, param2 } = await req.json();

    // Business logic here...

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

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase | `AdminDashboard.tsx` |
| Components | PascalCase | `StatusBadge.tsx` |
| shadcn/ui | lowercase | `button.tsx` |
| Hooks | use-kebab-case | `use-mobile.tsx` |
| Utils | camelCase | `pnlCalculations.ts` |
| Edge functions | kebab-case | `get-client-users/` |
| Types/Interfaces | PascalCase | `interface LeadData {}` |

---

## Layouts

Use the correct layout for each user type:

```typescript
// Admin pages
<AdminLayout userEmail={userEmail}>

// Client pages
<ClientLayout userEmail={userEmail}>

// Rep pages
<RepLayout userEmail={userEmail}>
```

---

## DON'Ts

- DON'T use class components - only functional components with hooks
- DON'T use any icon library except lucide-react
- DON'T use CSS modules or styled-components - only Tailwind
- DON'T use axios or fetch directly in pages - use Supabase client
- DON'T store sensitive data in localStorage except auth tokens
- DON'T use `any` type without justification
- DON'T create new UI primitives - use existing shadcn/ui components
- DON'T use alert() or confirm() - use toast notifications or Dialog
- DON'T bypass RLS without service role key in edge functions
- DON'T use relative imports - always use `@/` alias
- DON'T add emojis to files unless explicitly requested

---

## External APIs

| API | Usage | Config |
|-----|-------|--------|
| Airtable | Lead/client/rep data | `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID` |
| Resend | Transactional emails | `RESEND_API_KEY`, from: `team@app.hireflow.uk` |
| Close.com | Call transcripts | `CLOSE_API_KEY` |
| Anthropic | AI features | `ANTHROPIC_API_KEY` |

---

## Reference Files

When building new features, reference these files:

- **Page pattern:** `src/pages/AdminDashboard.tsx`
- **Layout pattern:** `src/components/AdminLayout.tsx`
- **Edge function pattern:** `supabase/functions/get-client-users/index.ts`
- **Supabase client:** `src/integrations/supabase/client.ts`
- **Utility functions:** `src/lib/utils.ts`
- **Tailwind config:** `tailwind.config.ts`
- **CSS variables:** `src/index.css`
