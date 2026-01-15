-- ============================================================================
-- Restoe Multi-Tenant Restaurant SaaS Database Schema
-- ============================================================================
-- This schema implements Row Level Security (RLS) for multi-tenant access
-- All tables use UUID primary keys and are scoped by restaurant_id
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RESTAURANTS TABLE
-- ============================================================================
-- Core restaurant entity. Each restaurant is a tenant in the system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop slug column if it exists (migration for existing databases)
ALTER TABLE restaurants DROP COLUMN IF EXISTS slug;
DROP INDEX IF EXISTS idx_restaurants_slug;

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view restaurants they are members of
DROP POLICY IF EXISTS "restaurants_select_members" ON restaurants;
CREATE POLICY "restaurants_select_members"
    ON restaurants
    FOR SELECT
    USING (
        id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only owners can update restaurant settings
DROP POLICY IF EXISTS "restaurants_update_owners" ON restaurants;
CREATE POLICY "restaurants_update_owners"
    ON restaurants
    FOR UPDATE
    USING (
        id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
                AND role = 'owner'
        )
    );

-- Policy: Any authenticated user can insert new restaurants (for bootstrap)
DROP POLICY IF EXISTS "restaurants_insert_authenticated" ON restaurants;
CREATE POLICY "restaurants_insert_authenticated"
    ON restaurants
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- RESTAURANT_USERS TABLE
-- ============================================================================
-- Junction table linking users (auth.users) to restaurants with roles.
-- Roles: 'owner', 'member', 'staff'
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, user_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_restaurant_users_restaurant_id ON restaurant_users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_users_user_id ON restaurant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_users_role ON restaurant_users(role);

-- Enable RLS
ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;

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

-- Helper function to check ownership without RLS recursion
-- Uses SECURITY DEFINER to bypass RLS when checking ownership
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

-- Policy: Allow restaurant_users inserts
-- Split into two policies to avoid recursion:
-- 1. Bootstrap: Any authenticated user can add themselves as owner (for restaurant creation)
-- 2. Owner invites: Owners can add other users to their restaurants
DROP POLICY IF EXISTS "restaurant_users_insert_bootstrap" ON restaurant_users;
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

-- Policy: Allow owners to invite other users
DROP POLICY IF EXISTS "restaurant_users_insert_owner_invite" ON restaurant_users;
CREATE POLICY "restaurant_users_insert_owner_invite"
    ON restaurant_users
    FOR INSERT
    WITH CHECK (
        -- Owners can invite other users (not themselves, as that's handled by bootstrap policy)
        -- Use the SECURITY DEFINER function to avoid RLS recursion
        user_id != auth.uid()
        AND is_restaurant_owner(restaurant_id, auth.uid())
    );

-- Policy: Only owners can update restaurant user roles
-- Use the SECURITY DEFINER function to avoid RLS recursion
DROP POLICY IF EXISTS "restaurant_users_update_owners" ON restaurant_users;
CREATE POLICY "restaurant_users_update_owners"
    ON restaurant_users
    FOR UPDATE
    USING (
        is_restaurant_owner(restaurant_id, auth.uid())
    )
    WITH CHECK (
        -- Ensure the restaurant_id cannot be changed
        is_restaurant_owner(restaurant_id, auth.uid())
    );

-- Policy: Only owners can delete restaurant users
-- Use the SECURITY DEFINER function to avoid RLS recursion
DROP POLICY IF EXISTS "restaurant_users_delete_owners" ON restaurant_users;
CREATE POLICY "restaurant_users_delete_owners"
    ON restaurant_users
    FOR DELETE
    USING (
        is_restaurant_owner(restaurant_id, auth.uid())
    );

-- ============================================================================
-- MENU_CATEGORIES TABLE
-- ============================================================================
-- Categories for organizing menu items (e.g., "Appetizers", "Main Courses")
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_display_order ON menu_categories(restaurant_id, display_order);

-- Enable RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view categories of their restaurants
DROP POLICY IF EXISTS "menu_categories_select_members" ON menu_categories;
CREATE POLICY "menu_categories_select_members"
    ON menu_categories
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can insert categories
DROP POLICY IF EXISTS "menu_categories_insert_members" ON menu_categories;
CREATE POLICY "menu_categories_insert_members"
    ON menu_categories
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can update categories
DROP POLICY IF EXISTS "menu_categories_update_members" ON menu_categories;
CREATE POLICY "menu_categories_update_members"
    ON menu_categories
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Ensure restaurant_id cannot be changed
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can delete categories
DROP POLICY IF EXISTS "menu_categories_delete_members" ON menu_categories;
CREATE POLICY "menu_categories_delete_members"
    ON menu_categories
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- MENU_ITEMS TABLE
-- ============================================================================
-- Individual menu items (dishes, drinks, etc.) belonging to categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(restaurant_id, display_order);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view menu items of their restaurants
DROP POLICY IF EXISTS "menu_items_select_members" ON menu_items;
CREATE POLICY "menu_items_select_members"
    ON menu_items
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can insert menu items
DROP POLICY IF EXISTS "menu_items_insert_members" ON menu_items;
CREATE POLICY "menu_items_insert_members"
    ON menu_items
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can update menu items
DROP POLICY IF EXISTS "menu_items_update_members" ON menu_items;
CREATE POLICY "menu_items_update_members"
    ON menu_items
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Ensure restaurant_id cannot be changed
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can delete menu items
DROP POLICY IF EXISTS "menu_items_delete_members" ON menu_items;
CREATE POLICY "menu_items_delete_members"
    ON menu_items
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TABLES TABLE
-- ============================================================================
-- Physical tables in the restaurant (e.g., "Table 1", "Table 2", "VIP Booth")
-- ============================================================================

CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'out_of_service')),
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(restaurant_id, status);

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view tables of their restaurants
DROP POLICY IF EXISTS "tables_select_members" ON tables;
CREATE POLICY "tables_select_members"
    ON tables
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can insert tables
DROP POLICY IF EXISTS "tables_insert_members" ON tables;
CREATE POLICY "tables_insert_members"
    ON tables
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can update tables
DROP POLICY IF EXISTS "tables_update_members" ON tables;
CREATE POLICY "tables_update_members"
    ON tables
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Ensure restaurant_id cannot be changed
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can delete tables
DROP POLICY IF EXISTS "tables_delete_members" ON tables;
CREATE POLICY "tables_delete_members"
    ON tables
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
-- Customer orders linked to tables and restaurants
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at DESC);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view orders of their restaurants
DROP POLICY IF EXISTS "orders_select_members" ON orders;
CREATE POLICY "orders_select_members"
    ON orders
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can insert orders
DROP POLICY IF EXISTS "orders_insert_members" ON orders;
CREATE POLICY "orders_insert_members"
    ON orders
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can update orders
DROP POLICY IF EXISTS "orders_update_members" ON orders;
CREATE POLICY "orders_update_members"
    ON orders
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Ensure restaurant_id cannot be changed
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can delete orders
DROP POLICY IF EXISTS "orders_delete_members" ON orders;
CREATE POLICY "orders_delete_members"
    ON orders
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT restaurant_id
            FROM restaurant_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- ORDER_ITEMS TABLE
-- ============================================================================
-- Individual items within an order. Scoped via orders table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view order items via orders they can access
DROP POLICY IF EXISTS "order_items_select_members" ON order_items;
CREATE POLICY "order_items_select_members"
    ON order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT id
            FROM orders
            WHERE restaurant_id IN (
                SELECT restaurant_id
                FROM restaurant_users
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Members can insert order items via orders they can access
DROP POLICY IF EXISTS "order_items_insert_members" ON order_items;
CREATE POLICY "order_items_insert_members"
    ON order_items
    FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id
            FROM orders
            WHERE restaurant_id IN (
                SELECT restaurant_id
                FROM restaurant_users
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Members can update order items via orders they can access
DROP POLICY IF EXISTS "order_items_update_members" ON order_items;
CREATE POLICY "order_items_update_members"
    ON order_items
    FOR UPDATE
    USING (
        order_id IN (
            SELECT id
            FROM orders
            WHERE restaurant_id IN (
                SELECT restaurant_id
                FROM restaurant_users
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        -- Ensure order_id cannot be changed to an order from another restaurant
        order_id IN (
            SELECT id
            FROM orders
            WHERE restaurant_id IN (
                SELECT restaurant_id
                FROM restaurant_users
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Members can delete order items via orders they can access
DROP POLICY IF EXISTS "order_items_delete_members" ON order_items;
CREATE POLICY "order_items_delete_members"
    ON order_items
    FOR DELETE
    USING (
        order_id IN (
            SELECT id
            FROM orders
            WHERE restaurant_id IN (
                SELECT restaurant_id
                FROM restaurant_users
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Automatically update updated_at timestamp on row updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_users_updated_at ON restaurant_users;
CREATE TRIGGER update_restaurant_users_updated_at
    BEFORE UPDATE ON restaurant_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER update_menu_categories_updated_at
    BEFORE UPDATE ON menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
