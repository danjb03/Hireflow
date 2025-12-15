-- =============================================
-- ORDER/CAMPAIGN TRACKING SYSTEM
-- Creates orders table and updates leads table
-- =============================================

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

-- Indexes for performance
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_client_status ON public.orders(client_id, status);
CREATE INDEX idx_orders_target_date ON public.orders(target_delivery_date) WHERE target_delivery_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
      WHERE EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND c.client_name = p.client_name
      )
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add order_id to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add indexes for order queries
CREATE INDEX IF NOT EXISTS idx_leads_order_id ON public.leads(order_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_order ON public.leads(client_id, order_id);

-- Add comment
COMMENT ON COLUMN public.leads.order_id IS 'The order/campaign this lead belongs to';
COMMENT ON COLUMN public.orders.order_number IS 'Unique identifier for the order (e.g., "Order 1", "ORD-2025-001")';
COMMENT ON COLUMN public.orders.leads_remaining IS 'Computed column: leads_purchased - leads_delivered';

-- Function to automatically update leads_delivered when leads are assigned to order
CREATE OR REPLACE FUNCTION public.update_order_leads_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger to update order delivery count
CREATE TRIGGER update_order_delivery_count
  AFTER INSERT OR UPDATE OF order_id, status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_leads_delivered();

-- Create view for order summary (useful for dashboards)
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

