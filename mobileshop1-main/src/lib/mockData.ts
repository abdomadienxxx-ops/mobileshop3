import type { Product, Sale, Category, Supplier, CompetitorPrice, InventoryForecast, ReleaseCalendar as ReleaseCal, Tenant } from './types';

const DEMO_TENANT_ID = 'demo-tenant-0001';

export const mockTenants: Tenant[] = [
  { id: DEMO_TENANT_ID, name: 'PhoneVault Demo Shop', slug: 'phonevault-demo', plan: 'professional', active: true, created_at: '2024-01-01' },
  { id: 'demo-tenant-0002', name: 'Mobile World NYC', slug: 'mobile-world-nyc', plan: 'starter', active: true, created_at: '2024-03-15' },
  { id: 'demo-tenant-0003', name: 'TechStop London', slug: 'techstop-london', plan: 'professional', active: false, created_at: '2024-06-01' },
];

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones and flagship devices', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'cat-2', name: 'Phone Cases', slug: 'phone-cases', description: 'Protective cases and covers', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'cat-3', name: 'Screen Protectors', slug: 'screen-protectors', description: 'Glass and film screen protectors', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'cat-4', name: 'Chargers & Cables', slug: 'chargers-cables', description: 'Charging adapters and cables', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'cat-5', name: 'Audio', slug: 'audio', description: 'Earbuds, headphones, and speakers', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'cat-6', name: 'Wearables', slug: 'wearables', description: 'Smartwatches and fitness trackers', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
];

export const mockSuppliers: Supplier[] = [
  { id: 'sup-1', name: 'Shenzhen Mobile Tech', country: 'China', contact_email: 'orders@szmobiletech.cn', lead_time_days: 14, rating: 4.2, tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'sup-2', name: 'Samsung Direct Wholesale', country: 'South Korea', contact_email: 'wholesale@samsung.com', lead_time_days: 7, rating: 4.8, tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'sup-3', name: 'Apple Authorized Distributor', country: 'USA', contact_email: 'dist@apple.com', lead_time_days: 5, rating: 4.9, tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
  { id: 'sup-4', name: 'Global Accessories Ltd', country: 'China', contact_email: 'sales@globalacc.cn', lead_time_days: 10, rating: 3.9, tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01' },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'iPhone 16 Pro Max', brand: 'Apple', model: 'A3291', sku: 'APL-16PM-256', category_id: 'cat-1', supplier_id: 'sup-3', wholesale_cost: 1099, retail_price: 1399, stock_quantity: 24, reorder_level: 5, specs: { storage: '256GB', display: '6.9 inch Super Retina XDR', chip: 'A18 Pro', camera: '48MP Triple', battery: '4685mAh', '5G': true }, release_date: '2024-09-20', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p2', name: 'iPhone 16 Pro', brand: 'Apple', model: 'A3292', sku: 'APL-16P-256', category_id: 'cat-1', supplier_id: 'sup-3', wholesale_cost: 899, retail_price: 1199, stock_quantity: 18, reorder_level: 5, specs: { storage: '256GB', display: '6.3 inch Super Retina XDR', chip: 'A18 Pro', camera: '48MP Triple', battery: '3582mAh', '5G': true }, release_date: '2024-09-20', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p3', name: 'iPhone 16', brand: 'Apple', model: 'A3293', sku: 'APL-16-128', category_id: 'cat-1', supplier_id: 'sup-3', wholesale_cost: 649, retail_price: 849, stock_quantity: 32, reorder_level: 8, specs: { storage: '128GB', display: '6.1 inch Super Retina', chip: 'A18', camera: '48MP Dual', battery: '3561mAh', '5G': true }, release_date: '2024-09-20', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p4', name: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', model: 'SM-S938B', sku: 'SAM-S25U-256', category_id: 'cat-1', supplier_id: 'sup-2', wholesale_cost: 1049, retail_price: 1349, stock_quantity: 20, reorder_level: 5, specs: { storage: '256GB', display: '6.9 inch Dynamic AMOLED 2X', chip: 'Snapdragon 8 Elite', camera: '200MP Quad', battery: '5000mAh', '5G': true, s_pen: true }, release_date: '2025-01-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p5', name: 'Samsung Galaxy S25+', brand: 'Samsung', model: 'SM-S936B', sku: 'SAM-S25P-256', category_id: 'cat-1', supplier_id: 'sup-2', wholesale_cost: 799, retail_price: 1049, stock_quantity: 15, reorder_level: 5, specs: { storage: '256GB', display: '6.7 inch Dynamic AMOLED 2X', chip: 'Snapdragon 8 Elite', camera: '50MP Triple', battery: '4900mAh', '5G': true }, release_date: '2025-01-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p6', name: 'Samsung Galaxy S25', brand: 'Samsung', model: 'SM-S931B', sku: 'SAM-S25-128', category_id: 'cat-1', supplier_id: 'sup-2', wholesale_cost: 599, retail_price: 799, stock_quantity: 28, reorder_level: 8, specs: { storage: '128GB', display: '6.2 inch Dynamic AMOLED 2X', chip: 'Snapdragon 8 Elite', camera: '50MP Triple', battery: '4000mAh', '5G': true }, release_date: '2025-01-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p7', name: 'Google Pixel 9 Pro', brand: 'Google', model: 'GP9P', sku: 'GOO-P9P-128', category_id: 'cat-1', supplier_id: 'sup-4', wholesale_cost: 699, retail_price: 899, stock_quantity: 12, reorder_level: 4, specs: { storage: '128GB', display: '6.3 inch LTPO OLED', chip: 'Tensor G4', camera: '50MP Triple', battery: '4700mAh', '5G': true }, release_date: '2024-08-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p8', name: 'OnePlus 13', brand: 'OnePlus', model: 'CPH2681', sku: 'OP-13-256', category_id: 'cat-1', supplier_id: 'sup-1', wholesale_cost: 549, retail_price: 749, stock_quantity: 10, reorder_level: 4, specs: { storage: '256GB', display: '6.82 inch LTPO AMOLED', chip: 'Snapdragon 8 Elite', camera: '50MP Triple', battery: '6000mAh', '5G': true }, release_date: '2025-01-07', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p9', name: 'AirPods Pro 2', brand: 'Apple', model: 'A3048', sku: 'APL-APP2-USB', category_id: 'cat-5', supplier_id: 'sup-3', wholesale_cost: 179, retail_price: 249, stock_quantity: 35, reorder_level: 10, specs: { type: 'In-ear TWS', chip: 'H2', anc: 'Active Noise Cancellation', battery: '6h (30h with case)' }, release_date: '2023-09-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p10', name: 'Apple Watch Ultra 2', brand: 'Apple', model: 'A2967', sku: 'APL-AWU2-49', category_id: 'cat-6', supplier_id: 'sup-3', wholesale_cost: 599, retail_price: 799, stock_quantity: 8, reorder_level: 3, specs: { display: '49mm Always-On Retina', chip: 'S9 SiP', water_resistance: '100m' }, release_date: '2023-09-22', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p11', name: 'iPhone 16 Pro Max Case', brand: 'Apple', model: 'MQTY3', sku: 'APL-16PM-SC-BK', category_id: 'cat-2', supplier_id: 'sup-3', wholesale_cost: 29, retail_price: 49, stock_quantity: 60, reorder_level: 15, specs: { material: 'Silicone', compatibility: 'iPhone 16 Pro Max', mag_safe: true }, release_date: '2024-09-20', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p12', name: 'Tempered Glass - iPhone 16 Pro Max', brand: 'Spigen', model: 'GLAS.tR', sku: 'SPG-16PM-GL', category_id: 'cat-3', supplier_id: 'sup-4', wholesale_cost: 8, retail_price: 19, stock_quantity: 120, reorder_level: 30, specs: { type: 'Tempered Glass', compatibility: 'iPhone 16 Pro Max', hardness: '9H' }, release_date: '2024-09-20', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p13', name: 'USB-C to Lightning Cable 2m', brand: 'Apple', model: 'MX2K2', sku: 'APL-USBC-LT-2M', category_id: 'cat-4', supplier_id: 'sup-3', wholesale_cost: 14, retail_price: 29, stock_quantity: 80, reorder_level: 20, specs: { type: 'USB-C to Lightning', length: '2m', mfi_certified: true }, release_date: '2023-01-01', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'p14', name: '45W USB-C Power Adapter', brand: 'Samsung', model: 'EP-T4530', sku: 'SAM-45W-USB', category_id: 'cat-4', supplier_id: 'sup-2', wholesale_cost: 19, retail_price: 39, stock_quantity: 55, reorder_level: 15, specs: { wattage: '45W', type: 'USB-C PD', fast_charge: true }, release_date: '2024-01-01', discontinued: false, image_url: '', tenant_id: DEMO_TENANT_ID, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

export const mockSales: Sale[] = Array.from({ length: 40 }, (_, i) => {
  const product = mockProducts[i % mockProducts.length];
  const qty = [1, 1, 1, 2, 2, 3][Math.floor(Math.random() * 6)];
  return {
    id: `sale-${i}`,
    product_id: product.id,
    quantity: qty,
    unit_price: product.retail_price,
    total_amount: product.retail_price * qty,
    sale_date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
    channel: ['in-store', 'in-store', 'in-store', 'online', 'online', 'phone'][Math.floor(Math.random() * 6)],
    customer_type: ['retail', 'retail', 'retail', 'wholesale', 'corporate'][Math.floor(Math.random() * 5)],
    tenant_id: DEMO_TENANT_ID,
    products: product,
  };
});

export const mockCompetitorPrices: CompetitorPrice[] = [
  { id: 'cp1', product_id: 'p1', competitor_name: 'Best Buy', price: 1399, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[0] },
  { id: 'cp2', product_id: 'p1', competitor_name: 'Amazon', price: 1379, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[0] },
  { id: 'cp3', product_id: 'p1', competitor_name: 'Walmart', price: 1399, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[0] },
  { id: 'cp4', product_id: 'p4', competitor_name: 'Best Buy', price: 1349, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[3] },
  { id: 'cp5', product_id: 'p4', competitor_name: 'Amazon', price: 1299, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[3] },
  { id: 'cp6', product_id: 'p4', competitor_name: 'Walmart', price: 1349, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[3] },
  { id: 'cp7', product_id: 'p2', competitor_name: 'Best Buy', price: 1199, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[1] },
  { id: 'cp8', product_id: 'p2', competitor_name: 'Amazon', price: 1179, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[1] },
  { id: 'cp9', product_id: 'p3', competitor_name: 'Best Buy', price: 849, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[2] },
  { id: 'cp10', product_id: 'p3', competitor_name: 'Amazon', price: 829, in_stock: true, recorded_at: '2025-05-15', tenant_id: DEMO_TENANT_ID, products: mockProducts[2] },
];

export const mockForecasts: InventoryForecast[] = mockProducts.map((p, i) => ({
  id: `fc-${i}`,
  product_id: p.id,
  forecast_date: '2025-05-16',
  predicted_demand: [5, 8, 10, 12, 15, 20, 25, 30][i % 8],
  current_stock: p.stock_quantity,
  days_of_stock: Math.round(p.stock_quantity / Math.max(1, [5, 8, 10, 12, 15, 20, 25, 30][i % 8]) * 30),
  reorder_recommended: p.stock_quantity <= p.reorder_level * 1.5,
  confidence: 0.7 + Math.random() * 0.25,
  tenant_id: DEMO_TENANT_ID,
  created_at: '2025-05-16',
  products: p,
}));

export const mockReleases: ReleaseCal[] = [
  { id: 'rc1', brand: 'Apple', model: 'iPhone 17 Pro Max', expected_release_date: '2025-09-19', estimated_price: 1499, category_id: 'cat-1', status: 'rumored', notes: 'Expected A19 Pro chip, redesigned camera module, possible under-display Face ID', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc2', brand: 'Apple', model: 'iPhone 17 Air', expected_release_date: '2025-09-19', estimated_price: 999, category_id: 'cat-1', status: 'rumored', notes: 'Ultra-thin design, single camera, A19 chip', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc3', brand: 'Apple', model: 'iPhone 18', expected_release_date: '2026-09-18', estimated_price: 899, category_id: 'cat-1', status: 'rumored', notes: 'Next-gen A20 chip, major design overhaul expected', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc4', brand: 'Samsung', model: 'Galaxy Z Fold 7', expected_release_date: '2025-07-25', estimated_price: 1899, category_id: 'cat-1', status: 'confirmed', notes: 'Tri-fold design rumored, Snapdragon 8 Elite Gen 2', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc5', brand: 'Samsung', model: 'Galaxy S26 Ultra', expected_release_date: '2026-01-15', estimated_price: 1399, category_id: 'cat-1', status: 'rumored', notes: 'Expected early 2026, 200MP camera upgrade', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc6', brand: 'Google', model: 'Pixel 10 Pro', expected_release_date: '2025-08-13', estimated_price: 999, category_id: 'cat-1', status: 'rumored', notes: 'Tensor G5 chip, new design language', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[0] },
  { id: 'rc7', brand: 'Apple', model: 'Apple Watch Ultra 3', expected_release_date: '2025-09-19', estimated_price: 849, category_id: 'cat-6', status: 'rumored', notes: 'Blood pressure monitoring, satellite messaging', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[5] },
  { id: 'rc8', brand: 'Apple', model: 'AirPods Pro 3', expected_release_date: '2025-09-19', estimated_price: 279, category_id: 'cat-5', status: 'rumored', notes: 'H3 chip, heart rate monitoring, improved ANC', tenant_id: DEMO_TENANT_ID, created_at: '2025-05-16', categories: mockCategories[4] },
];
