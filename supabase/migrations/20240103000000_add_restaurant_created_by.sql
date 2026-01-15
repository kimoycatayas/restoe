-- ============================================================================
-- PART 0: Add created_by column to restaurants table
-- ============================================================================
-- This allows non-recursive owner checks via restaurants.created_by
-- ============================================================================

-- Add created_by column if it doesn't exist
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_created_by ON restaurants(created_by);

-- Update existing restaurants to set created_by from restaurant_users
-- This backfills data for existing restaurants
UPDATE restaurants r
SET created_by = (
    SELECT ru.user_id
    FROM restaurant_users ru
    WHERE ru.restaurant_id = r.id
    AND ru.role = 'owner'
    LIMIT 1
)
WHERE r.created_by IS NULL;

-- Add trigger to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_restaurant_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_restaurant_created_by ON restaurants;
CREATE TRIGGER trigger_set_restaurant_created_by
    BEFORE INSERT ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION set_restaurant_created_by();
