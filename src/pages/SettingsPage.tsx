import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import {
  Store,
  Database,
  Download,
  Upload,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Save,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export function SettingsPage() {
  const {
    user,
    business,
    profile,
    updateProfile,
    exportDataJson,
    importDataJson,
    clearAllData,
    refreshData,
    isSupabaseConfigured,
  } = useBusiness();

  // Profile form
  const [businessName, setBusinessName] = useState(profile.business_name);
  const [ownerName, setOwnerName] = useState(profile.owner_name);
  const [phone, setPhone] = useState(profile.phone);
  const [businessType, setBusinessType] = useState(profile.business_type);
  const [address, setAddress] = useState(profile.address);
  const [receiptFooter, setReceiptFooter] = useState(profile.receipt_footer);
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Supabase form
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{ testing: boolean; message?: string; success?: boolean }>({
    testing: false,
  });
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'profile' | 'supabase' | 'backup'>('profile');

  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
  }, []);

  useEffect(() => {
    setBusinessName(profile.business_name);
    setOwnerName(profile.owner_name);
    setPhone(profile.phone);
    setBusinessType(profile.business_type);
    setAddress(profile.address);
    setReceiptFooter(profile.receipt_footer);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      business_name: businessName,
      owner_name: ownerName,
      phone,
      business_type: businessType,
      address,
      receipt_footer: receiptFooter,
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2500);
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus({ testing: true });
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setConnectionStatus({ testing: false, success: res.success, message: res.message });

    if (res.success) {
      saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
      await refreshData();
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_bisnisku_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      const success = await importDataJson(content);
      if (success) {
        alert('Data berhasil diimpor ke Supabase!');
        await refreshData();
      } else {
        alert('Gagal mengimpor data. Format file tidak sesuai.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopySchemaSql = () => {
    const sql = `-- Supabase PostgreSQL Schema for BisnisKu AI
-- Tables: businesses, products, sales, sale_items, expenses, ai_conversations, ai_messages

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

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  hpp NUMERIC(15,2) DEFAULT 0,
  selling_price NUMERIC(15,2) DEFAULT 0,
  stock INT DEFAULT 0,
  unit TEXT DEFAULT 'porsi',
  min_stock INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(15,2) DEFAULT 0,
  total_hpp NUMERIC(15,2) DEFAULT 0,
  gross_profit NUMERIC(15,2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  customer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  unit_hpp NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) DEFAULT 0,
  subtotal_hpp NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(15,2) DEFAULT 0,
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Tanya Bisnis',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant schema privileges for authenticated and anon roles
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
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Policies for businesses
CREATE POLICY "Users can manage own business" ON public.businesses
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policies for products
CREATE POLICY "Users can manage own products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = products.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = products.business_id AND businesses.owner_id = auth.uid()));

-- Policies for sales
CREATE POLICY "Users can manage own sales" ON public.sales
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = sales.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = sales.business_id AND businesses.owner_id = auth.uid()));

-- Policies for sale_items
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

-- Policies for expenses
CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = expenses.business_id AND businesses.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = expenses.business_id AND businesses.owner_id = auth.uid()));`;

    navigator.clipboard.writeText(sql);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2]">
            Pengaturan
          </h1>
          <p className="text-xs text-[#7A7A84] mt-0.5">
            Kelola profil usaha, integrasi Supabase PostgreSQL, dan cadangan data.
          </p>
        </div>

        {user.isAuthenticated && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161B] border border-[#22222A] text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[#F0F0F2] font-medium">{user.email}</span>
            {business?.name && (
              <span className="text-[#7A7A84] border-l border-[#22222A] pl-2">
                {business.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#22222A] pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'profile'
              ? 'bg-[#101013] text-[#10B981] border border-[#22222A]'
              : 'text-[#7A7A84] hover:text-[#F0F0F2]'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Profil Toko & Struk</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'supabase'
              ? 'bg-[#101013] text-[#10B981] border border-[#22222A]'
              : 'text-[#7A7A84] hover:text-[#F0F0F2]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Koneksi Supabase</span>
          {isSupabaseConfigured && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'backup'
              ? 'bg-[#101013] text-[#10B981] border border-[#22222A]'
              : 'text-[#7A7A84] hover:text-[#F0F0F2]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Cadangan & Reset</span>
        </button>
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-4">
          <div className="p-5 rounded-xl bg-[#101013] border border-[#22222A] space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Nama Usaha / Toko *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Nama Pemilik
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Kategori Usaha
                </label>
                <input
                  type="text"
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Alamat / Lokasi Toko
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Catatan Footer Struk (Akan dicetak di bagian bawah nota)
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={e => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Profil</span>
            </button>

            {isProfileSaved && (
              <span className="text-xs text-[#10B981] font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Berhasil disimpan</span>
              </span>
            )}
          </div>
        </form>
      )}

      {/* Supabase PostgreSQL Integration */}
      {activeTab === 'supabase' && (
        <div className="max-w-2xl space-y-5">
          <div className="p-5 rounded-xl bg-[#101013] border border-[#22222A] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F0F0F2] flex items-center gap-2">
                  <span>Koneksi Database Supabase PostgreSQL</span>
                  {isSupabaseConfigured && (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  )}
                </h3>
                <p className="text-xs text-[#7A7A84] mt-0.5">
                  Aplikasi ini terhubung langsung ke database Supabase Anda untuk menyimpan seluruh tabel produk, penjualan, pengeluaran, dan autentikasi secara persisten.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
                Production Ready
              </span>
            </div>

            <form onSubmit={handleSaveSupabase} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] font-mono focus:outline-hidden focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOi..."
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] font-mono focus:outline-hidden focus:border-[#10B981]"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={connectionStatus.testing}
                  className="px-4 py-2 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{connectionStatus.testing ? 'Menguji Koneksi...' : 'Uji & Simpan Koneksi'}</span>
                </button>

                {connectionStatus.message && (
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      connectionStatus.success ? 'text-[#10B981]' : 'text-rose-400'
                    }`}
                  >
                    {connectionStatus.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{connectionStatus.message}</span>
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Database Schema Status Card */}
          <div className="p-5 rounded-xl bg-[#101013] border border-[#22222A] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-[#F0F0F2]">
                  Struktur Skema Tabel PostgreSQL Anda
                </h4>
                <p className="text-[11px] text-[#7A7A84]">
                  Tabel yang digunakan secara langsung oleh aplikasi BisnisKu AI:
                </p>
              </div>

              <button
                onClick={handleCopySchemaSql}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F0F0F2] bg-[#16161B] hover:bg-[#22222A] rounded-lg transition-colors border border-[#22222A]"
              >
                {isCopiedSql ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedSql ? 'Tersalin' : 'Salin SQL Schema'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              {[
                { name: 'businesses', desc: 'Profil & identitas bisnis UMKM' },
                { name: 'products', desc: 'Katalog, HPP, harga jual & stok' },
                { name: 'sales', desc: 'Faktur penjualan & total omzet' },
                { name: 'sale_items', desc: 'Rincian produk terjual' },
                { name: 'expenses', desc: 'Pencatatan pengeluaran operasional' },
                { name: 'ai_conversations', desc: 'Riwayat percakapan Tanya Bisnis' },
                { name: 'ai_messages', desc: 'Pesan chat AI Copilot' },
              ].map(table => (
                <div
                  key={table.name}
                  className="p-2.5 rounded-lg bg-[#16161B] border border-[#22222A]"
                >
                  <p className="font-mono text-[11px] font-semibold text-[#10B981]">
                    {table.name}
                  </p>
                  <p className="text-[10px] text-[#7A7A84] mt-0.5">{table.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backup and Data Reset */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl space-y-5">
          {/* Backup / Export */}
          <div className="p-5 rounded-xl bg-[#101013] border border-[#22222A] space-y-3">
            <h3 className="text-sm font-semibold text-[#F0F0F2]">
              Ekspor & Impor Cadangan Data (JSON)
            </h3>
            <p className="text-xs text-[#7A7A84]">
              Simpan semua data menu, transaksi, dan pengeluaran ke komputer atau perangkat Anda dalam format JSON.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#F0F0F2] bg-[#16161B] hover:bg-[#22222A] border border-[#22222A] rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Unduh Cadangan JSON</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#F0F0F2] bg-[#16161B] hover:bg-[#22222A] border border-[#22222A] rounded-lg transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Pulihkan ke Supabase</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-5 rounded-xl bg-[#101013] border border-rose-500/30 space-y-3">
            <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Zona Berbahaya: Hapus Semua Data Bisnis</span>
            </h3>
            <p className="text-xs text-[#7A7A84]">
              Menghapus semua produk, riwayat transaksi, dan catatan pengeluaran bisnis aktif dari Supabase. Tindakan ini tidak dapat dibatalkan.
            </p>
            <button
              onClick={async () => {
                if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data produk, transaksi, dan pengeluaran bisnis Anda dari Supabase?')) {
                  await clearAllData();
                  alert('Semua data berhasil dibersihkan dari database Supabase.');
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Bersih Semua Data di Supabase</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
