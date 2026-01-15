-- ============================================================================
-- PART 1: Create restaurant_invitations table with RLS
-- ============================================================================
-- Stores email invitations for staff members
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_restaurant_id ON public.restaurant_invitations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_email ON public.restaurant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_token ON public.restaurant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_status ON public.restaurant_invitations(status);

-- Enable RLS
ALTER TABLE public.restaurant_invitations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owners can insert invitations for their restaurant
-- Uses restaurants.created_by to avoid RLS recursion
DROP POLICY IF EXISTS "restaurant_invitations_insert_owners" ON public.restaurant_invitations;
CREATE POLICY "restaurant_invitations_insert_owners"
    ON public.restaurant_invitations
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE created_by = auth.uid()
        )
    );

-- Policy 2: Owners can select invitations for their restaurant
DROP POLICY IF EXISTS "restaurant_invitations_select_owners" ON public.restaurant_invitations;
CREATE POLICY "restaurant_invitations_select_owners"
    ON public.restaurant_invitations
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE created_by = auth.uid()
        )
    );

-- Policy 3: Public/Authenticated can select invitation by token ONLY if:
-- status = 'pending' AND expires_at > now()
-- Needed to render signup page with locked email
DROP POLICY IF EXISTS "restaurant_invitations_select_by_token" ON public.restaurant_invitations;
CREATE POLICY "restaurant_invitations_select_by_token"
    ON public.restaurant_invitations
    FOR SELECT
    USING (
        status = 'pending'
        AND expires_at > NOW()
    );

-- Policy 4: Owners can revoke invitation (update status to revoked)
DROP POLICY IF EXISTS "restaurant_invitations_update_owners" ON public.restaurant_invitations;
CREATE POLICY "restaurant_invitations_update_owners"
    ON public.restaurant_invitations
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE created_by = auth.uid()
        )
    );
