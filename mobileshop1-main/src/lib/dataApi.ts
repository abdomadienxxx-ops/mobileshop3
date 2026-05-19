import { supabase } from './supabase';
import type { Category, Product, Sale, Supplier, CompetitorPrice, InventoryForecast, ReleaseCalendar, Tenant } from './types';

export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').eq('tenant_id', tenantId).order('name');
  return data || [];
}

export async function createCategory(
  tenantId: string,
  payload: { name: string; slug: string; description: string }
): Promise<{ error: { code?: string; message: string } | null }> {
  const { error } = await supabase.from('categories').insert({ ...payload, tenant_id: tenantId });
  return { error: error ? { code: error.code, message: error.message } : null };
}

export async function patchCategory(
  id: string,
  payload: { name: string; slug: string; description: string }
): Promise<{ error: { code?: string; message: string } | null }> {
  const { error } = await supabase.from('categories').update(payload).eq('id', id);
  return { error: error ? { code: error.code, message: error.message } : null };
}

export async function removeCategory(id: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error: error ? { message: error.message } : null };
}

export async function fetchProductsWithRelations(tenantId: string): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*), suppliers(*)')
    .eq('tenant_id', tenantId)
    .order('brand');
  return data || [];
}

export async function fetchProducts(tenantId: string, orderBy = 'name'): Promise<Product[]> {
  const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order(orderBy);
  return data || [];
}

export async function createProduct(
  tenantId: string,
  payload: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('products').insert({ ...payload, tenant_id: tenantId });
  return { error: error ? { message: error.message } : null };
}

export async function updateProductStock(
  productId: string,
  stock_quantity: number
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('products').update({ stock_quantity }).eq('id', productId);
  return { error: error ? { message: error.message } : null };
}

export async function updateProduct(
  productId: string,
  payload: Partial<Pick<Product, 'name' | 'brand' | 'wholesale_cost' | 'retail_price' | 'reorder_level'>>
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('products').update(payload).eq('id', productId);
  return { error: error ? { message: error.message } : null };
}

export async function removeProduct(productId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  return { error: error ? { message: error.message } : null };
}

export async function resolveCategoryId(tenantId: string, categoryName: string): Promise<string | null> {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', categoryName)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: categoryName, slug: slug || `cat-${Date.now()}`, description: '', tenant_id: tenantId })
    .select('id')
    .single();
  if (error) throw error;
  return data?.id || null;
}

export async function fetchSales(tenantId: string, limit = 200): Promise<Sale[]> {
  const { data } = await supabase
    .from('sales')
    .select('*, products(name, brand, model, wholesale_cost)')
    .eq('tenant_id', tenantId)
    .order('sale_date', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function logSale(
  tenantId: string,
  sale: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    sale_date: string;
    channel: string;
    customer_type: string;
    serial_number?: string;
  },
  newStock: number
): Promise<{ error: { message: string } | null }> {
  const { error: saleError } = await supabase.from('sales').insert({ ...sale, tenant_id: tenantId });
  if (saleError) return { error: { message: saleError.message } };
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newStock })
    .eq('id', sale.product_id);
  return { error: updateError ? { message: updateError.message } : null };
}

export async function fetchSuppliers(tenantId: string): Promise<Supplier[]> {
  const { data } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('rating', { ascending: false });
  return data || [];
}

export async function fetchCompetitorPrices(tenantId: string): Promise<CompetitorPrice[]> {
  const { data } = await supabase
    .from('competitor_prices')
    .select('*, products(name, brand, model, retail_price, sku)')
    .eq('tenant_id', tenantId)
    .order('recorded_at', { ascending: false });
  return data || [];
}

export async function fetchForecasts(tenantId: string): Promise<InventoryForecast[]> {
  const { data } = await supabase
    .from('inventory_forecasts')
    .select('*, products(name, brand, model, sku, retail_price, wholesale_cost, stock_quantity, reorder_level)')
    .eq('tenant_id', tenantId)
    .order('days_of_stock');
  return data || [];
}

export async function fetchReleases(tenantId: string): Promise<ReleaseCalendar[]> {
  const { data } = await supabase
    .from('release_calendar')
    .select('*, categories(name)')
    .eq('tenant_id', tenantId)
    .order('expected_release_date');
  return data || [];
}

export async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
  return data || [];
}
