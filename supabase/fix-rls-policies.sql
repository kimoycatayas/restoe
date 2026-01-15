-- ============================================================================
-- Fix RLS Policies for restaurant_users Table
-- ============================================================================
-- This script fixes the infinite recursion issue in restaurant_users policies
-- Run this after the main schema.sql to apply the fixes
-- ============================================================================

-- ============================================================================
-- Helper Function: Check Restaurant Ownership (Bypasses RLS)
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS when checking ownership
-- Prevents infinite recursion in policy evaluation
-- ============================================================================

CREATE OR REPLACE FUNCTION is_restaurant_owner(check_restaurant_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM restaurant_users
        WHERE restaurant_id = check_restaurant_id
        AND user_id = check_user_id
        AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Fix SELECT Policies for restaurant_users
-- ============================================================================
-- Problem: The original policy had a circular dependency
-- Fix: Split into two policies - one for own memberships, one for restaurant members

-- Drop old policy if exists
DROP POLICY IF EXISTS "restaurant_users_select_members" ON restaurant_users;

-- Policy: Users can view their own memberships
-- This allows users to check if they have any restaurant memberships
DROP POLICY IF EXISTS "restaurant_users_select_own" ON restaurant_users;
CREATE POLICY "restaurant_users_select_own"
    ON restaurant_users
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can view members of restaurants they belong to
-- This allows viewing other members once you have a membership
DROP POLICY IF EXISTS "restaurant_users_select_restaurant_members" ON restaurant_users;
CREATE POLICY "restaurant_users_select_restaurant_members"
    ON restaurant_users
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Fix INSERT Policies for restaurant_users
-- ============================================================================
-- Problem: The original INSERT policy had circular dependency causing infinite recursion
-- Fix: Split into two policies and use SECURITY DEFINER function for ownership check

-- Drop old policies if they exist
DROP POLICY IF EXISTS "restaurant_users_insert_first_owner_or_owner_invite" ON restaurant_users;
DROP POLICY IF EXISTS "restaurant_users_insert_bootstrap" ON restaurant_users;
DROP POLICY IF EXISTS "restaurant_users_insert_owner_invite" ON restaurant_users;

-- Policy 1: Bootstrap - Allow authenticated users to add themselves as owner
-- This enables the restaurant creation workflow
CREATE POLICY "restaurant_users_insert_bootstrap"
    ON restaurant_users
    FOR INSERT
    WITH CHECK (
        -- Allow authenticated users to add themselves as owner
        -- This enables the restaurant creation workflow
        user_id = auth.uid()
        AND role = 'owner'
        AND auth.uid() IS NOT NULL
    );

-- Policy 2: Owner Invites - Allow owners to invite other users
-- Uses the SECURITY DEFINER function to avoid RLS recursion
CREATE POLICY "restaurant_users_insert_owner_invite"
    ON restaurant_users
    FOR INSERT
    WITH CHECK (
        -- Owners can invite other users (not themselves, as that's handled by bootstrap policy)
        -- Use the SECURITY DEFINER function to avoid RLS recursion
        user_id != auth.uid()
        AND is_restaurant_owner(restaurant_id, auth.uid())
    );
