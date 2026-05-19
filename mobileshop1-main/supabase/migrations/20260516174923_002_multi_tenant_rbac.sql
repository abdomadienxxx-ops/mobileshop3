/*
  # Multi-Tenant SaaS Architecture with RBAC

  1. New Tables
    - `tenants` - Organization/shop accounts
    - `user_roles` - Links auth users to tenants with roles (super_admin, store_owner)

  2. Modified Tables
    - All data tables get `tenant_id` column with FK to tenants

  3. Security
    - Strict RLS policies: super_admin sees all, store_owner sees only their tenant
    - Helper functions in public schema for role/tenant lookups
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text DEFAULT 'starter',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'store_owner' CHECK (role IN ('super_admin', 'store_owner')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to all existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'tenant_id') THEN
    ALTER TABLE categories ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'tenant_id') THEN
    ALTER TABLE suppliers ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenant_id') THEN
    ALTER TABLE products ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'tenant_id') THEN
    ALTER TABLE sales ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitor_prices' AND column_name = 'tenant_id') THEN
    ALTER TABLE competitor_prices ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_price_lists' AND column_name = 'tenant_id') THEN
    ALTER TABLE supplier_price_lists ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_forecasts' AND column_name = 'tenant_id') THEN
    ALTER TABLE inventory_forecasts ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'release_calendar' AND column_name = 'tenant_id') THEN
    ALTER TABLE release_calendar ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_tenant ON competitor_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_lists_tenant ON supplier_price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_tenant ON inventory_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_release_calendar_tenant ON release_calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);

-- Helper functions in public schema
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
RETURNS text AS $$
  SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_tenant_id(check_user_id uuid)
RETURNS uuid AS $$
  SELECT tenant_id FROM user_roles WHERE user_id = check_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage competitor_prices" ON competitor_prices;
DROP POLICY IF EXISTS "Authenticated users can manage supplier_price_lists" ON supplier_price_lists;
DROP POLICY IF EXISTS "Authenticated users can manage inventory_forecasts" ON inventory_forecasts;
DROP POLICY IF EXISTS "Authenticated users can manage release_calendar" ON release_calendar;

-- Tenants policies
CREATE POLICY "Super admins see all tenants" ON tenants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Users see own tenant" ON tenants FOR SELECT TO authenticated
  USING (id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Super admins manage tenants" ON tenants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- User roles policies
CREATE POLICY "Users see own roles" ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Super admins manage roles" ON user_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

-- Data table policies: super_admin sees all, store_owner sees own tenant only
-- Categories
CREATE POLICY "tenant_read_categories" ON categories FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_categories" ON categories FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_categories" ON categories FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_categories" ON categories FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Suppliers
CREATE POLICY "tenant_read_suppliers" ON suppliers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_suppliers" ON suppliers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_suppliers" ON suppliers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_suppliers" ON suppliers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Products
CREATE POLICY "tenant_read_products" ON products FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_products" ON products FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_products" ON products FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_products" ON products FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Sales
CREATE POLICY "tenant_read_sales" ON sales FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_sales" ON sales FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_sales" ON sales FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_sales" ON sales FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Competitor Prices
CREATE POLICY "tenant_read_competitor_prices" ON competitor_prices FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_competitor_prices" ON competitor_prices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_competitor_prices" ON competitor_prices FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_competitor_prices" ON competitor_prices FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Supplier Price Lists
CREATE POLICY "tenant_read_supplier_price_lists" ON supplier_price_lists FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_supplier_price_lists" ON supplier_price_lists FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_supplier_price_lists" ON supplier_price_lists FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_supplier_price_lists" ON supplier_price_lists FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Inventory Forecasts
CREATE POLICY "tenant_read_inventory_forecasts" ON inventory_forecasts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_inventory_forecasts" ON inventory_forecasts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_inventory_forecasts" ON inventory_forecasts FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_inventory_forecasts" ON inventory_forecasts FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');

-- Release Calendar
CREATE POLICY "tenant_read_release_calendar" ON release_calendar FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_insert_release_calendar" ON release_calendar FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_update_release_calendar" ON release_calendar FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "tenant_delete_release_calendar" ON release_calendar FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR get_user_role(auth.uid()) = 'super_admin');
