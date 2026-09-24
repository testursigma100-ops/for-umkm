/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BusinessProvider } from './context/BusinessContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPages } from './pages/AuthPages';
import { Modal } from './components/common/Modal';
import { useBusiness } from './context/BusinessContext';
import { formatRupiah, getTodayDateString } from './utils/formatters';
import { ExpenseCategory } from './types';
import { Database, LogIn, AlertCircle } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavTab | 'auth'>('dashboard');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Quick expense form states
  const { user, isSupabaseConfigured, addExpense } = useBusiness();

  // If user is already authenticated, skip auth screen and navigate to dashboard
  useEffect(() => {
    if (user.isAuthenticated && activeTab === 'auth') {
      setActiveTab('dashboard');
    }
  }, [user.isAuthenticated, activeTab]);

  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Bahan');
  const [expNotes, setExpNotes] = useState('');
  const [isSavingExp, setIsSavingExp] = useState(false);

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName || !expAmount || isSavingExp) return;

    setIsSavingExp(true);
    try {
      await addExpense({
        name: expName.trim(),
        amount: Number(expAmount),
        category: expCategory,
        date: getTodayDateString(),
        notes: expNotes.trim() || undefined,
      });

      setExpName('');
      setExpAmount('');
      setExpNotes('');
      setIsQuickExpenseOpen(false);
    } finally {
      setIsSavingExp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#F0F0F2] flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab === 'auth' ? 'dashboard' : activeTab}
        onTabChange={(tab: NavTab) => setActiveTab(tab)}
        onOpenQuickTxModal={() => setActiveTab('transactions')}
        onOpenQuickExpenseModal={() => setIsQuickExpenseOpen(true)}
        onOpenAuthModal={() => setActiveTab('auth')}
      />

      {/* Supabase Status Notification Banners */}
      {!isSupabaseConfigured ? (
        <div className="bg-[#16161B] border-b border-[#22222A] px-4 py-2 text-xs text-[#7A7A84] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Database Supabase belum terhubung. Seluruh data produk, penjualan, dan laporan membutuhkan koneksi Supabase PostgreSQL.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-[#10B981] font-semibold hover:underline shrink-0"
          >
            Hubungkan Sekarang &rarr;
          </button>
        </div>
      ) : !user.isAuthenticated && activeTab !== 'auth' && activeTab !== 'settings' ? (
        <div className="bg-[#101013] border-b border-[#22222A] px-4 py-2 text-xs text-[#7A7A84] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              Silakan masuk atau daftarkan akun usaha Anda untuk mengakses data bisnis tersimpan di Supabase.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('auth')}
            className="text-[#10B981] font-semibold hover:underline shrink-0"
          >
            Masuk / Daftar &rarr;
          </button>
        </div>
      ) : null}

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar (hidden when in auth screen) */}
        {activeTab !== 'auth' && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab: NavTab) => setActiveTab(tab)}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab: NavTab) => setActiveTab(tab)}
              onOpenQuickTx={() => setActiveTab('transactions')}
              onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
            />
          )}

          {activeTab === 'products' && <ProductsPage />}

          {activeTab === 'transactions' && <TransactionsPage />}

          {activeTab === 'expenses' && <ExpensesPage />}

          {activeTab === 'reports' && <ReportsPage />}

          {activeTab === 'chat' && <ChatPage />}

          {activeTab === 'settings' && <SettingsPage />}

          {activeTab === 'auth' && (
            <AuthPages onSuccess={() => setActiveTab('dashboard')} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden in auth screen) */}
      {activeTab !== 'auth' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab: NavTab) => setActiveTab(tab)}
        />
      )}

      {/* Quick Add Expense Modal accessible from navbar */}
      <Modal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        title="Catat Pengeluaran Cepat"
        subtitle="Biaya operasional atau pembelian bahan hari ini"
        maxWidth="md"
      >
        <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#7A7A84] mb-1">
              Nama Pengeluaran *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli Es Kristal, Bensin, Galon Air"
              value={expName}
              onChange={e => setExpName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Jumlah Biaya (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Kategori Biaya
              </label>
              <select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
              >
                <option value="Bahan">Bahan</option>
                <option value="Operasional">Operasional</option>
                <option value="Transport">Transport</option>
                <option value="Promosi">Promosi</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#7A7A84] mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Keterangan tambahan..."
              value={expNotes}
              onChange={e => setExpNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
            />
          </div>

          <div className="pt-3 border-t border-[#22222A] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickExpenseOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#7A7A84] hover:text-[#F0F0F2] bg-[#16161B] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingExp}
              className="px-4 py-2 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 rounded-lg transition-colors"
            >
              {isSavingExp ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <BusinessProvider>
      <MainApp />
    </BusinessProvider>
  );
}
