# Order/Campaign Tracking System - Architecture Proposal

## Overview
This document outlines the architecture for implementing order/campaign tracking to manage client lead delivery across multiple orders/campaigns.

## Current State Analysis
- **Clients**: Stored in `public.clients` table, linked to `public.profiles`
- **Leads**: Stored in `public.leads` table with `client_id` linking to clients
- **Current Limitation**: Lead tracking is at client level (`leads_purchased`, `leads_fulfilled` in profiles), not order level
- **Need**: Multi-order tracking per client with order-specific lead allocation

---

## Database Schema Changes

### 1. Create `orders` Table

```sql
-- Create order status enum
CREATE TYPE public.order_status AS ENUM (
  'Draft',
  'Active',
  'Paused',
  'Completed',
  'Cancelled'
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order Identification
  order_number TEXT NOT NULL UNIQUE, -- e.g., "Order 1", "Order 2", "ORD-2025-001"
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Order Details
  name TEXT, -- Optional: "Q1 Campaign", "Hiring Blitz", etc.
  description TEXT,
  
  -- Lead Allocation
  leads_purchased INTEGER NOT NULL DEFAULT 0,
  leads_delivered INTEGER NOT NULL DEFAULT 0,
  leads_remaining INTEGER GENERATED ALWAYS AS (leads_purchased - leads_delivered) STORED,
  
  -- Delivery Metrics
  target_delivery_date DATE,
  start_date DATE,
  completion_date DATE,
  
  -- Status & Priority
  status public.order_status DEFAULT 'Draft',
  priority INTEGER DEFAULT 0, -- Higher = more urgent
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (leads_purchased >= 0),
  CHECK (leads_delivered >= 0),
  CHECK (leads_delivered <= leads_purchased)
);

-- Indexes
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_client_status ON public.orders(client_id, status);
CREATE INDEX idx_orders_target_date ON public.orders(target_delivery_date) WHERE target_delivery_date IS NOT NULL;

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Admins can manage all orders
CREATE POLICY "Admins can manage all orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Clients can view their own orders
CREATE POLICY "Clients can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      INNER JOIN public.profiles p ON c.profile_id = p.id OR c.client_name = p.client_name
      WHERE p.id = auth.uid()
    )
  );

-- Update trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 2. Update `leads` Table

```sql
-- Add order_id to leads table
ALTER TABLE public.leads
ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add index for order queries
CREATE INDEX idx_leads_order_id ON public.leads(order_id);
CREATE INDEX idx_leads_client_order ON public.leads(client_id, order_id);

-- Add comment
COMMENT ON COLUMN public.leads.order_id IS 'The order/campaign this lead belongs to';
```

### 3. Create Function to Update Order Delivery Count

```sql
-- Function to automatically update leads_delivered when leads are assigned to order
CREATE OR REPLACE FUNCTION public.update_order_leads_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a lead is assigned to an order (order_id changes from NULL to a value)
  IF NEW.order_id IS NOT NULL AND (OLD.order_id IS NULL OR OLD.order_id != NEW.order_id) THEN
    -- Only count leads with status 'Approved' or 'Lead' as delivered
    IF NEW.status IN ('Approved', 'Lead') THEN
      UPDATE public.orders
      SET leads_delivered = (
        SELECT COUNT(*)
        FROM public.leads
        WHERE order_id = NEW.order_id
        AND status IN ('Approved', 'Lead')
      )
      WHERE id = NEW.order_id;
    END IF;
  END IF;
  
  -- When a lead is removed from an order
  IF OLD.order_id IS NOT NULL AND NEW.order_id IS NULL THEN
    UPDATE public.orders
    SET leads_delivered = (
      SELECT COUNT(*)
      FROM public.leads
      WHERE order_id = OLD.order_id
      AND status IN ('Approved', 'Lead')
    )
    WHERE id = OLD.order_id;
  END IF;
  
  -- When lead status changes (e.g., from 'New' to 'Approved')
  IF OLD.status != NEW.status AND NEW.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET leads_delivered = (
      SELECT COUNT(*)
      FROM public.leads
      WHERE order_id = NEW.order_id
      AND status IN ('Approved', 'Lead')
    )
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_order_delivery_count
  AFTER INSERT OR UPDATE OF order_id, status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_leads_delivered();
```

### 4. Create View for Order Summary

```sql
-- View for order statistics
CREATE OR REPLACE VIEW public.order_summary AS
SELECT 
  o.id,
  o.order_number,
  o.client_id,
  c.client_name,
  o.name,
  o.status,
  o.leads_purchased,
  o.leads_delivered,
  o.leads_remaining,
  o.target_delivery_date,
  o.start_date,
  o.completion_date,
  CASE 
    WHEN o.leads_purchased > 0 
    THEN ROUND((o.leads_delivered::NUMERIC / o.leads_purchased::NUMERIC) * 100, 1)
    ELSE 0
  END AS completion_percentage,
  CASE
    WHEN o.target_delivery_date IS NOT NULL
    THEN o.target_delivery_date - CURRENT_DATE
    ELSE NULL
  END AS days_remaining
FROM public.orders o
INNER JOIN public.clients c ON o.client_id = c.id;
```

---

## UI Components

### Admin Components

#### 1. **AdminOrders.tsx** - Order Management Page
- **Location**: `src/pages/AdminOrders.tsx`
- **Route**: `/admin/orders`
- **Features**:
  - List all orders with filters (status, client, date range)
  - Create new orders
  - Edit existing orders
  - View order details and progress
  - Quick actions: Pause, Resume, Complete, Cancel

#### 2. **AdminOrderDetail.tsx** - Order Detail View
- **Location**: `src/pages/AdminOrderDetail.tsx`
- **Route**: `/admin/orders/:id`
- **Features**:
  - Order information and metrics
  - List of leads assigned to this order
  - Progress visualization (progress bar, charts)
  - Lead assignment interface
  - Delivery timeline

#### 3. **AdminCreateOrder.tsx** - Order Creation Form
- **Location**: `src/pages/AdminCreateOrder.tsx`
- **Route**: `/admin/orders/new`
- **Features**:
  - Client selection
  - Order number generation (auto or manual)
  - Lead quantity input
  - Target delivery date
  - Order name/description

#### 4. **OrderAssignmentDialog.tsx** - Lead Assignment Component
- **Location**: `src/components/OrderAssignmentDialog.tsx`
- **Usage**: Used in AdminLeadDetail and AdminAllLeads
- **Features**:
  - Select order when assigning lead to client
  - Show order capacity (e.g., "45/100 leads")
  - Validation (can't exceed purchased amount)

### Client Components

#### 5. **ClientOrders.tsx** - Client Order View
- **Location**: `src/pages/ClientOrders.tsx`
- **Route**: `/client/orders`
- **Features**:
  - List of client's orders
  - Order status and progress
  - Quick stats per order
  - Link to order details

#### 6. **ClientOrderDetail.tsx** - Client Order Detail
- **Location**: `src/pages/ClientOrderDetail.tsx`
- **Route**: `/client/orders/:id`
- **Features**:
  - Order progress visualization
  - List of leads for this order
  - Delivery timeline
  - Status updates

### Shared Components

#### 7. **OrderProgressCard.tsx** - Reusable Progress Component
- **Location**: `src/components/OrderProgressCard.tsx`
- **Usage**: Used in dashboards and order lists
- **Features**:
  - Progress bar
  - Lead count (delivered/purchased)
  - Status badge
  - Days remaining

#### 8. **OrderSelect.tsx** - Order Dropdown Component
- **Location**: `src/components/OrderSelect.tsx`
- **Usage**: In lead assignment forms
- **Features**:
  - Filter orders by client
  - Show order capacity
  - Disable full orders

---

## API/Edge Functions

### 1. **get-orders** - Fetch Orders
- **Location**: `supabase/functions/get-orders/index.ts`
- **Purpose**: Get orders with filters (client, status, date range)
- **Returns**: List of orders with summary data

### 2. **get-order-details** - Get Single Order
- **Location**: `supabase/functions/get-order-details/index.ts`
- **Purpose**: Get detailed order information including leads
- **Returns**: Order details + assigned leads

### 3. **create-order** - Create New Order
- **Location**: `supabase/functions/create-order/index.ts`
- **Purpose**: Create a new order for a client
- **Validates**: Client exists, order number unique, valid dates

### 4. **update-order** - Update Order
- **Location**: `supabase/functions/update-order/index.ts`
- **Purpose**: Update order details (status, dates, quantities)
- **Validates**: Can't reduce leads_purchased below leads_delivered

### 5. **assign-lead-to-order** - Assign Lead to Order
- **Location**: `supabase/functions/assign-lead-to-order/index.ts`
- **Purpose**: Assign a lead to a specific order
- **Validates**: Order has capacity, lead belongs to same client
- **Note**: Can be combined with existing `assign-lead-to-client` function

### 6. **get-order-stats** - Order Statistics
- **Location**: `supabase/functions/get-order-stats/index.ts`
- **Purpose**: Get aggregated statistics for admin dashboard
- **Returns**: Total orders, active orders, overdue orders, etc.

---

## Lead Assignment Flow

### Current Flow (to be enhanced):
1. Admin assigns lead to client → `assign-lead-to-client` function
2. Lead gets `client_id` set

### New Flow:
1. Admin assigns lead to client → `assign-lead-to-client` function
2. **NEW**: Admin selects order from dropdown (shows available orders for that client)
3. Lead gets `client_id` AND `order_id` set
4. Trigger automatically updates `orders.leads_delivered`
5. Order status may auto-update (e.g., "Completed" when 100% delivered)

### Assignment UI Enhancement:
- In `AdminLeadDetail.tsx` and `AdminAllLeads.tsx`:
  - When assigning to client, show order selector
  - Display order capacity: "Order 1 (45/100 leads)"
  - Allow "Assign without order" option
  - Show warning if order is full

---

## Dashboard Updates

### Admin Dashboard
- **New Section**: "Active Orders" card
  - Total active orders
  - Orders needing attention (low capacity, overdue)
  - Quick link to orders page

### Client Dashboard
- **New Section**: "My Orders" card
  - Active orders count
  - Total leads delivered across all orders
  - Quick link to orders page

---

## Migration Strategy

### Phase 1: Database Setup
1. Create `orders` table
2. Add `order_id` to `leads` table
3. Create triggers and functions
4. Create views

### Phase 2: Backend Functions
1. Create edge functions for order CRUD
2. Update `assign-lead-to-client` to include order assignment
3. Create order statistics function

### Phase 3: Admin UI
1. Create AdminOrders page
2. Create AdminOrderDetail page
3. Create AdminCreateOrder page
4. Update AdminLeadDetail to include order selection
5. Update AdminAllLeads to show order filter

### Phase 4: Client UI
1. Create ClientOrders page
2. Create ClientOrderDetail page
3. Update ClientDashboard with order stats

### Phase 5: Data Migration (if needed)
1. Create default orders for existing clients based on `leads_purchased`
2. Assign existing leads to orders (if possible to determine)

---

## Example Data Structure

### Order Example:
```json
{
  "id": "uuid-here",
  "order_number": "Order 1",
  "client_id": "client-uuid",
  "name": "Q1 2025 Hiring Campaign",
  "leads_purchased": 100,
  "leads_delivered": 45,
  "leads_remaining": 55,
  "status": "Active",
  "target_delivery_date": "2025-03-31",
  "start_date": "2025-01-01"
}
```

### Lead with Order:
```json
{
  "id": "lead-uuid",
  "company_name": "Acme Corp",
  "client_id": "client-uuid",
  "order_id": "order-uuid",  // NEW
  "status": "Approved"
}
```

---

## Benefits

1. **Granular Tracking**: Track multiple campaigns per client
2. **Better Reporting**: See which orders are performing well
3. **Capacity Management**: Know exactly how many leads each order needs
4. **Client Transparency**: Clients see progress per order
5. **Historical Data**: Track order completion rates over time
6. **Flexibility**: Support multiple concurrent orders per client

---

## Open Questions / Decisions Needed

1. **Order Numbering**: Auto-generate (ORD-2025-001) or manual (Order 1, Order 2)?
2. **Lead Counting**: Count all leads assigned, or only "Approved"/"Lead" status?
3. **Order Status**: Auto-complete when 100% delivered, or manual?
4. **Existing Data**: How to handle clients with existing `leads_purchased`? Create default order?
5. **Order Limits**: Can orders exceed `leads_purchased`? (Recommend: No, with validation)
6. **Lead Reassignment**: Can leads be moved between orders? (Recommend: Yes, with admin permission)

---

## Next Steps

1. Review and approve architecture
2. Create database migration files
3. Implement edge functions
4. Build UI components
5. Test with sample data
6. Deploy to production

