import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { Logo } from '../components/common/Logo';
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
  Info,
} from 'lucide-react';

export function SettingsPage() {
  const {
    user,
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
  const [activeTab, setActiveTab] = useState<'profile' | 'supabase' | 'backup' | 'about'>('profile');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
        setToastMsg({ text: 'Data berhasil diimpor ke Supabase!', type: 'success' });
        await refreshData();
      } else {
        setToastMsg({ text: 'Gagal mengimpor data. Format file tidak sesuai.', type: 'error' });
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

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to businesses" ON public.businesses FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Allow authenticated users access to products" ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())) WITH CHECK (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Allow authenticated users access to sales" ON public.sales FOR ALL TO authenticated USING (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())) WITH CHECK (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Allow authenticated users access to sale_items" ON public.sale_items FOR ALL TO authenticated USING (sale_id IN (SELECT id FROM public.sales WHERE user_id = auth.uid() OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))) WITH CHECK (sale_id IN (SELECT id FROM public.sales WHERE user_id = auth.uid() OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Allow authenticated users access to expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())) WITH CHECK (auth.uid() = user_id OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
`;
    navigator.clipboard.writeText(sql);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
          Pengaturan & Integrasi
        </h1>
        <p className="text-xs text-[#8A8A91] mt-0.5">
          Kelola profil usaha, integrasi database Supabase PostgreSQL, dan cadangan data.
        </p>
      </div>

      {toastMsg && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            toastMsg.type === 'success'
              ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-sm leading-none px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Account Info Card */}
      <div className="p-3.5 rounded-xl bg-[#141416] border border-[#242428] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#1C1C20] text-[#22C55E]">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F5F5F5]">
              {user.name || 'Owner Kedai'} {user.isAuthenticated && <span className="text-[#22C55E] text-[10px] font-normal">(Login Aktif)</span>}
            </p>
            <p className="text-[11px] text-[#8A8A91]">
              {user.email || 'Akun Supabase'} · ID: <span className="font-mono text-[10px]">{user.id ? user.id.slice(0, 8) + '...' : '-'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-[#242428] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
              : 'text-[#8A8A91] hover:text-[#F5F5F5]'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Profil Toko & Struk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'supabase'
              ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
              : 'text-[#8A8A91] hover:text-[#F5F5F5]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Koneksi Supabase</span>
          {isSupabaseConfigured && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
              : 'text-[#8A8A91] hover:text-[#F5F5F5]'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Cadangan & Reset</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'about'
              ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
              : 'text-[#8A8A91] hover:text-[#F5F5F5]'
          }`}
        >
          <Info className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Tentang BisnisKu</span>
        </button>
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Nama Usaha / Toko *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Nama Pemilik
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Kategori Usaha
                </label>
                <input
                  type="text"
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Alamat / Lokasi Toko
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Catatan Footer Struk (Akan dicetak di bagian bawah nota)
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={e => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Profil</span>
            </button>

            {isProfileSaved && (
              <span className="text-xs text-[#22C55E] font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Berhasil disimpan</span>
              </span>
            )}
          </div>
        </form>
      )}

      {/* Supabase PostgreSQL Integration */}
      {activeTab === 'supabase' && (
        <div className="max-w-2xl space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
                  <span>Koneksi Database Supabase PostgreSQL</span>
                  {isSupabaseConfigured && (
                    <span className="text-[10px] font-medium text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                      Terhubung
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#8A8A91] mt-1">
                  Seluruh data disimpan langsung ke PostgreSQL project Supabase Anda dengan enkripsi dan Row Level Security (RLS).
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSupabase} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] font-mono focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOi..."
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] font-mono focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={connectionStatus.testing}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors disabled:opacity-50"
                >
                  {connectionStatus.testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji Koneksi...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Uji & Simpan Koneksi</span>
                    </>
                  )}
                </button>
              </div>

              {connectionStatus.message && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    connectionStatus.success
                      ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {connectionStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{connectionStatus.message}</span>
                </div>
              )}
            </form>
          </div>

          {/* SQL Schema helper box */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F5]">
                  Skema Tabel PostgreSQL
                </h4>
                <p className="text-[11px] text-[#8A8A91]">
                  Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySchemaSql}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#F5F5F5] bg-[#1C1C20] hover:bg-[#242428] border border-[#242428] rounded-lg transition-colors"
              >
                {isCopiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-[#22C55E]" />
                    <span className="text-[#22C55E]">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Reset */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] space-y-3">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">
              Cadangkan & Pulihkan Data
            </h3>
            <p className="text-xs text-[#8A8A91]">
              Ekspor seluruh data katalog, transaksi, dan pengeluaran ke format JSON untuk arsip offline atau impor ke perangkat baru.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#F5F5F5] bg-[#1C1C20] hover:bg-[#242428] border border-[#242428] rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Unduh Cadangan JSON</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#F5F5F5] bg-[#1C1C20] hover:bg-[#242428] border border-[#242428] rounded-lg transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Pulihkan dari File JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-red-500/20 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Zona Berbahaya</h3>
            </div>
            <p className="text-xs text-[#8A8A91]">
              Hapus seluruh transaksi, produk, dan pengeluaran. Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('YAKIN INGIN MENGHAPUS SEMUA DATA TRANSAKSI & PRODUK? Tindakan ini tidak dapat dibatalkan.')) {
                  clearAllData();
                  setToastMsg({ text: 'Seluruh data lokal dan database telah dibersihkan.', type: 'success' });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Seluruh Data</span>
            </button>
          </div>
        </div>
      )}

      {/* About BisnisKu Tab */}
      {activeTab === 'about' && (
        <div className="max-w-2xl space-y-4">
          <div className="p-6 rounded-xl bg-[#141416] border border-[#242428] text-center space-y-4">
            <div className="text-[#22C55E] flex items-center justify-center mx-auto">
              <Logo size={56} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5]">
                BisnisKu
              </h3>
              <p className="text-xs text-[#8A8A91] mt-0.5">
                Versi 1.0 · Aplikasi Pengelolaan Usaha & Kasir UMKM
              </p>
            </div>
            <p className="text-xs text-[#8A8A91] max-w-md mx-auto leading-relaxed">
              Dirancang untuk membantu pelaku usaha dan UMKM mencatat transaksi kasir, mengelola katalog produk & modal HPP, memantau pengeluaran, serta memahami perkembangan bisnis dengan asisten pintar.
            </p>
            <div className="pt-3 border-t border-[#242428] flex items-center justify-center gap-6 text-xs text-[#8A8A91]">
              <span>Status: <strong className="text-[#22C55E] font-medium">Aktif</strong></span>
              <span>•</span>
              <span>Platform: <strong className="text-[#F5F5F5] font-medium">Web & Mobile PWA</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
