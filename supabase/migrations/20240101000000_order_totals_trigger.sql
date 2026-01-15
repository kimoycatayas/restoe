-- ============================================================================
-- ORDER TOTALS TRIGGER
-- ============================================================================
-- Automatically recalculates order.total_amount when order_items change
-- This ensures totals are always correct and consistent
-- ============================================================================

-- Function to recalculate order total from order_items
CREATE OR REPLACE FUNCTION public.recalc_order_total(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_total
    FROM public.order_items
    WHERE order_id = p_order_id;

    UPDATE public.orders
    SET total_amount = v_total
    WHERE id = p_order_id;
END;
$$;

ALTER FUNCTION public.recalc_order_total(UUID) OWNER TO postgres;


-- Trigger function that calls recalc_order_total
CREATE OR REPLACE FUNCTION public.trigger_recalc_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Handle INSERT and UPDATE: use NEW.order_id
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.recalc_order_total(NEW.order_id);
        RETURN NEW;
    END IF;

    -- Handle DELETE: use OLD.order_id
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalc_order_total(OLD.order_id);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_order_items_recalc_total ON public.order_items;

-- Create trigger on order_items table
CREATE TRIGGER trigger_order_items_recalc_total
    AFTER INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recalc_order_total();

-- ============================================================================
-- OPTIONAL: Also ensure subtotal is correct on INSERT/UPDATE
-- ============================================================================
-- This ensures subtotal = quantity * unit_price even if app doesn't set it
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_order_item_subtotal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate subtotal if it's not set or if quantity/unit_price changed
    IF NEW.subtotal IS NULL OR 
       NEW.subtotal != (NEW.quantity * NEW.unit_price) THEN
        NEW.subtotal := NEW.quantity * NEW.unit_price;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_ensure_order_item_subtotal ON public.order_items;

-- Create trigger to ensure subtotal is correct
CREATE TRIGGER trigger_ensure_order_item_subtotal
    BEFORE INSERT OR UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_order_item_subtotal();
