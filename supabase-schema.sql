-- ==============================================================================
-- BisnisKu AI - Supabase PostgreSQL Database Schema
-- Tagline: "Jualan jalan, bisnis makin jelas."
-- Copilot Bisnis UMKM Kuliner & F&B Indonesia
-- ==============================================================================

-- 1. BUSINESSES (Profil Bisnis / Toko UMKM)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  business_type TEXT DEFAULT 'F&B / Kuliner',
  address TEXT,
  receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda!',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRODUCTS (Katalog Menu & Bahan F&B)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Minuman',
  cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'porsi',
  min_stock INT NOT NULL DEFAULT 5,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_products_biz_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 3. SALES (Riwayat Penjualan Kasir / POS)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'qris', 'other')),
  customer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_biz_date ON public.sales(business_id, created_at);

-- 4. SALE_ITEMS (Item Detail Transaksi)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- 5. EXPENSES (Biaya Operasional & Bahan)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON public.expenses(business_id, created_at);

-- Grant privileges to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own business" ON public.businesses
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can manage own products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = products.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = products.business_id AND businesses.owner_id = auth.uid()));

CREATE POLICY "Users can manage own sales" ON public.sales
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = sales.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = sales.business_id AND businesses.owner_id = auth.uid()));

CREATE POLICY "Users can manage own sale_items" ON public.sale_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales
    JOIN public.businesses ON businesses.id = sales.business_id
    WHERE sales.id = sale_items.sale_id AND businesses.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales
    JOIN public.businesses ON businesses.id = sales.business_id
    WHERE sales.id = sale_items.sale_id AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = expenses.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = expenses.business_id AND businesses.owner_id = auth.uid()));
