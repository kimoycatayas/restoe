-- ============================================================================
-- PART 2: RPC function to accept restaurant invitation (SECURITY DEFINER)
-- ============================================================================
-- This function bypasses RLS to create restaurant_users membership
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_restaurant_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation public.restaurant_invitations%ROWTYPE;
    v_user_email TEXT;
    v_restaurant_id UUID;
BEGIN
    -- Find invitation by token where pending and not expired
    SELECT * INTO v_invitation
    FROM public.restaurant_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    LIMIT 1;

    -- Check if invitation exists
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Require auth.uid() not null
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate invited email matches the logged in user's email
    -- Use request.jwt.claims -> email in Supabase
    v_user_email := current_setting('request.jwt.claims', true)::json ->> 'email';
    
    IF v_user_email IS NULL OR LOWER(v_user_email) != LOWER(v_invitation.email) THEN
        RAISE EXCEPTION 'Invitation email does not match authenticated user email';
    END IF;

    v_restaurant_id := v_invitation.restaurant_id;

    -- Insert into restaurant_users
    -- ON CONFLICT DO NOTHING to handle race conditions
    INSERT INTO public.restaurant_users (
        restaurant_id,
        user_id,
        role
    )
    VALUES (
        v_restaurant_id,
        auth.uid(),
        v_invitation.role
    )
    ON CONFLICT (restaurant_id, user_id) DO NOTHING;

    -- Update invitation status
    UPDATE public.restaurant_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_invitation.id;

    -- Return restaurant_id
    RETURN v_restaurant_id;
END;
$$;

-- Set function owner to postgres for security
ALTER FUNCTION public.accept_restaurant_invitation(TEXT) OWNER TO postgres;
