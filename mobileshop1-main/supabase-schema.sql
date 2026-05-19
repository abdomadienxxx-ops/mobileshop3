-- ============================================================
-- PhoneVault Schema — Paste into Supabase SQL Editor
-- ============================================================

-- 1. TENANTS
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER ROLES (links auth.users to tenants)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'store_owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 3. CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- 4. SUPPLIERS
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  lead_time_days INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PRODUCTS / INVENTORY
-- Columns: Product Name, Brand, SKU, Price (retail), Cost (wholesale), Quantity (stock), IMEI (specs->serial_number)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- Product Name
  brand TEXT NOT NULL,                 -- Brand
  model TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL,                   -- SKU
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  wholesale_cost DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Cost
  retail_price DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Price
  stock_quantity INTEGER NOT NULL DEFAULT 0,          -- Quantity
  reorder_level INTEGER NOT NULL DEFAULT 0,
  specs JSONB NOT NULL DEFAULT '{}',                  -- IMEI stored as specs->>'serial_number'
  release_date DATE,
  discontinued BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT NOT NULL DEFAULT '',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. SALES
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL DEFAULT 'in-store',
  customer_type TEXT NOT NULL DEFAULT 'retail',
  serial_number TEXT,                 -- IMEI / Serial
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- 7. COMPETITOR PRICES
CREATE TABLE competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- 8. INVENTORY FORECASTS
CREATE TABLE inventory_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_demand INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  days_of_stock DECIMAL(8,1) NOT NULL,
  reorder_recommended BOOLEAN NOT NULL DEFAULT false,
  confidence DECIMAL(4,3) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. RELEASE CALENDAR
CREATE TABLE release_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  expected_release_date DATE,
  estimated_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rumored',
  notes TEXT NOT NULL DEFAULT '',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_calendar ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation ON categories FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON suppliers FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON products FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON sales FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON competitor_prices FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON inventory_forecasts FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY tenant_isolation ON release_calendar FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
