# Deploy Order Tracking System

## ⚠️ CRITICAL: Two Steps Required

The order tracking system requires **both** the database migration AND the edge functions to be deployed.

---

## Step 1: Deploy Database Migration

### Option A: Using Supabase CLI
```bash
supabase db push
```

### Option B: Manual SQL Execution
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20250105000000_create_orders_table.sql`
4. Copy and paste the entire contents
5. Click **Run**

**This creates:**
- `orders` table
- `order_status` enum type
- Adds `order_id` column to `leads` table
- Creates automatic trigger to update delivery counts
- Creates `order_summary` view

---

## Step 2: Deploy Edge Functions

### Option A: Deploy All Functions
```bash
supabase functions deploy
```

### Option B: Deploy Individual Functions
```bash
supabase functions deploy get-orders
supabase functions deploy get-order-details
supabase functions deploy create-order
supabase functions deploy update-order
```

### Option C: Using Supabase Dashboard
1. Go to **Edge Functions** in your Supabase Dashboard
2. For each function, click **Deploy** or **Create Function**
3. Copy the contents from:
   - `supabase/functions/get-orders/index.ts`
   - `supabase/functions/get-order-details/index.ts`
   - `supabase/functions/create-order/index.ts`
   - `supabase/functions/update-order/index.ts`

---

## Step 3: Verify Deployment

### Check Database
Run this in SQL Editor:
```sql
SELECT * FROM orders LIMIT 1;
```
Should return empty result (no error = table exists)

### Check Functions
In Supabase Dashboard → Edge Functions, you should see:
- ✅ get-orders
- ✅ get-order-details
- ✅ create-order
- ✅ update-order

---

## Troubleshooting

### Error: "Failed to send a request to the Edge Function"
**Cause**: Functions not deployed
**Fix**: Deploy functions (Step 2 above)

### Error: "relation 'orders' does not exist"
**Cause**: Migration not run
**Fix**: Run database migration (Step 1 above)

### Error: "function does not exist"
**Cause**: Function not deployed or wrong name
**Fix**: Check function name matches exactly, redeploy

---

## Quick Test

After deployment, try:
1. Go to `/admin/orders` (should load, even if empty)
2. Click "Create Order" (should open form)
3. Fill out form and create an order
4. View the order detail page

If any step fails, check the browser console for specific error messages.

