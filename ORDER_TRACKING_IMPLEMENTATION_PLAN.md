# Order Tracking Implementation Plan

## Quick Start Summary

This system allows clients to have multiple orders/campaigns, each with its own lead allocation and tracking.

## Architecture Overview

### Database Changes
✅ **Migration Created**: `supabase/migrations/20250105000000_create_orders_table.sql`

**New Table**: `orders` table with:
- `order_number` (unique identifier)
- `client_id` (links to client)
- `leads_purchased` / `leads_delivered` / `leads_remaining`
- `status` (Draft, Active, Paused, Completed, Cancelled)
- `target_delivery_date`, `start_date`, `completion_date`

**Updated Table**: `leads` table:
- Added `order_id` column (nullable, links to order)

**Auto-Updates**: Trigger automatically updates `leads_delivered` when leads are assigned/status changes

### Key Features
1. **Multi-Order Support**: Clients can have multiple active orders
2. **Automatic Tracking**: Lead assignment automatically updates order counts
3. **Progress Tracking**: Real-time delivery progress per order
4. **Client Visibility**: Clients see their order status and progress

---

## Implementation Checklist

### Phase 1: Database Setup ✅
- [x] Create migration file
- [ ] Run migration: `supabase db push` or apply SQL in Supabase dashboard
- [ ] Verify tables created correctly
- [ ] Test RLS policies

### Phase 2: Edge Functions (Backend)
- [ ] `get-orders` - List orders with filters
- [ ] `get-order-details` - Get single order with leads
- [ ] `create-order` - Create new order
- [ ] `update-order` - Update order details
- [ ] `assign-lead-to-order` - Assign lead to order (or enhance existing `assign-lead-to-client`)
- [ ] `get-order-stats` - Dashboard statistics

### Phase 3: Admin UI Components
- [ ] `AdminOrders.tsx` - Order list page (`/admin/orders`)
- [ ] `AdminOrderDetail.tsx` - Order detail page (`/admin/orders/:id`)
- [ ] `AdminCreateOrder.tsx` - Create order form (`/admin/orders/new`)
- [ ] Update `AdminLeadDetail.tsx` - Add order selector when assigning lead
- [ ] Update `AdminAllLeads.tsx` - Add order filter
- [ ] Update `AdminDashboard.tsx` - Add "Active Orders" card

### Phase 4: Client UI Components
- [ ] `ClientOrders.tsx` - Client order list (`/client/orders`)
- [ ] `ClientOrderDetail.tsx` - Client order detail (`/client/orders/:id`)
- [ ] Update `ClientDashboard.tsx` - Add "My Orders" card
- [ ] Update `ClientLeads.tsx` - Add order filter

### Phase 5: Shared Components
- [ ] `OrderProgressCard.tsx` - Reusable progress component
- [ ] `OrderSelect.tsx` - Order dropdown for lead assignment
- [ ] `OrderStatusBadge.tsx` - Status badge component

### Phase 6: Routes & Navigation
- [ ] Add routes to `App.tsx`
- [ ] Add navigation links in `AdminLayout.tsx`
- [ ] Add navigation links in `ClientLayout.tsx`

---

## File Structure

```
src/
├── pages/
│   ├── admin/
│   │   ├── AdminOrders.tsx          (NEW)
│   │   ├── AdminOrderDetail.tsx     (NEW)
│   │   ├── AdminCreateOrder.tsx     (NEW)
│   │   ├── AdminLeadDetail.tsx      (UPDATE - add order selector)
│   │   ├── AdminAllLeads.tsx        (UPDATE - add order filter)
│   │   └── AdminDashboard.tsx       (UPDATE - add orders card)
│   └── client/
│       ├── ClientOrders.tsx         (NEW)
│       ├── ClientOrderDetail.tsx    (NEW)
│       ├── ClientDashboard.tsx      (UPDATE - add orders card)
│       └── ClientLeads.tsx          (UPDATE - add order filter)
├── components/
│   ├── OrderProgressCard.tsx        (NEW)
│   ├── OrderSelect.tsx              (NEW)
│   └── OrderStatusBadge.tsx         (NEW)

supabase/
├── functions/
│   ├── get-orders/
│   │   └── index.ts                 (NEW)
│   ├── get-order-details/
│   │   └── index.ts                 (NEW)
│   ├── create-order/
│   │   └── index.ts                 (NEW)
│   ├── update-order/
│   │   └── index.ts                 (NEW)
│   ├── assign-lead-to-order/
│   │   └── index.ts                 (NEW or UPDATE existing)
│   └── get-order-stats/
│       └── index.ts             (NEW)
└── migrations/
    └── 20250105000000_create_orders_table.sql  (NEW - ✅ Created)
```

---

## Next Steps (Priority Order)

1. **Run Migration** (5 min)
   ```bash
   supabase db push
   ```
   Or apply SQL in Supabase dashboard

2. **Create First Edge Function** - `get-orders` (30 min)
   - Start with basic list functionality
   - Add filters later

3. **Create AdminOrders Page** (1 hour)
   - Basic list view
   - Link to create order
   - Show order status and progress

4. **Create Order Assignment in Lead Detail** (45 min)
   - Add order selector when assigning lead
   - Update `assign-lead-to-client` function

5. **Create Client Orders View** (45 min)
   - Show client's orders
   - Display progress

---

## Example Usage Flow

### Admin Creates Order:
1. Go to `/admin/orders`
2. Click "Create Order"
3. Select client, enter order number, set leads_purchased
4. Set target delivery date
5. Save → Order created with status "Draft"

### Admin Activates Order:
1. View order detail
2. Change status to "Active"
3. Order is now active and ready for lead assignment

### Admin Assigns Lead to Order:
1. View lead detail (`/admin/leads/:id`)
2. Click "Assign to Client"
3. Select client → Order dropdown appears
4. Select order (e.g., "Order 1 (0/100 leads)")
5. Assign → Lead gets `client_id` and `order_id`
6. Order's `leads_delivered` auto-updates

### Client Views Orders:
1. Go to `/client/orders`
2. See list of their orders
3. Click order → See detail with progress
4. View leads assigned to that order

---

## Data Migration (Optional)

If you have existing clients with `leads_purchased` in profiles:
- Create a default "Order 1" for each client
- Set `leads_purchased` from profile
- Assign existing leads to this order (if possible)

---

## Testing Checklist

- [ ] Create order for client
- [ ] Assign lead to order
- [ ] Verify `leads_delivered` updates automatically
- [ ] Change lead status (New → Approved) → verify count updates
- [ ] Remove lead from order → verify count decreases
- [ ] Client can view their orders
- [ ] Admin can see all orders
- [ ] RLS policies work (clients can't see other clients' orders)
- [ ] Order completion percentage calculates correctly
- [ ] Can't assign more leads than purchased

---

## Questions to Resolve

1. **Order Numbering**: Auto-generate or manual?
   - Recommendation: Auto-generate "ORD-{YEAR}-{NUMBER}" but allow override

2. **Lead Counting**: Count all assigned leads or only "Approved"/"Lead"?
   - Recommendation: Only "Approved" and "Lead" (as implemented in trigger)

3. **Order Status Auto-Update**: Auto-complete when 100% delivered?
   - Recommendation: Manual for now, add auto-complete as option later

4. **Existing Data**: How to handle existing `leads_purchased`?
   - Recommendation: Create migration script to create default orders

---

## Ready to Start?

1. Review `ORDER_TRACKING_ARCHITECTURE.md` for detailed specs
2. Run the migration: `supabase db push`
3. Start with `get-orders` edge function
4. Build AdminOrders page
5. Iterate and test

