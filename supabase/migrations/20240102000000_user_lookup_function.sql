-- Function to look up user by email (for staff invites)
-- Uses SECURITY DEFINER to bypass RLS when checking auth.users
CREATE OR REPLACE FUNCTION lookup_user_by_email(search_email TEXT)
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email
    FROM auth.users au
    WHERE au.email = search_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get user emails by user_ids (for staff listing)
-- Uses SECURITY DEFINER to bypass RLS when checking auth.users
CREATE OR REPLACE FUNCTION get_user_emails_by_ids(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id AS user_id,
        au.email
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
