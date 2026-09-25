/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
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
import { getTodayDateString } from './utils/formatters';
import { ExpenseCategory } from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, addExpense } = useBusiness();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Quick expense form states
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
    <div className="min-h-screen bg-[#0B0B0C] text-[#F5F5F5] flex flex-col selection:bg-[#22C55E] selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab: NavTab) => {
          if (user.isAuthenticated) {
            setActiveTab(tab);
          }
        }}
        onOpenQuickTxModal={user.isAuthenticated ? () => setActiveTab('transactions') : undefined}
        onOpenQuickExpenseModal={user.isAuthenticated ? () => setIsQuickExpenseOpen(true) : undefined}
        onOpenAuthModal={() => {}}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Strict Auth Guard: If not authenticated, render AuthPages only */}
        {!user.isAuthenticated ? (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-60px)]">
            <AuthPages onSuccess={() => setActiveTab('dashboard')} />
          </main>
        ) : (
          <>
            {/* Desktop Sidebar */}
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab: NavTab) => setActiveTab(tab)}
            />

            {/* Content Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden min-w-0">
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
            </main>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation (Only visible for authenticated users) */}
      {user.isAuthenticated && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab: NavTab) => setActiveTab(tab)}
        />
      )}

      {/* Quick Add Expense Modal for Authenticated User */}
      {user.isAuthenticated && (
        <Modal
          isOpen={isQuickExpenseOpen}
          onClose={() => !isSavingExp && setIsQuickExpenseOpen(false)}
          title="Catat Pengeluaran Cepat"
          subtitle="Biaya operasional atau pembelian bahan hari ini"
          maxWidth="md"
        >
          <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
                Nama Pengeluaran *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Beli Es Kristal, Bensin, Plastik Cup"
                value={expName}
                onChange={e => setExpName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] placeholder-[#8A8A8A] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
                  Jumlah Biaya (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] placeholder-[#8A8A8A] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
                  Kategori Biaya
                </label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
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
              <label className="block text-xs font-medium text-[#8A8A8A] mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Keterangan tambahan..."
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] placeholder-[#8A8A8A] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div className="pt-3 border-t border-[#252525] flex items-center justify-end gap-2 select-none">
              <button
                type="button"
                disabled={isSavingExp}
                onClick={() => setIsQuickExpenseOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#8A8A8A] hover:text-[#F5F5F5] bg-[#151515] border border-[#252525] rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingExp}
                className="px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
              >
                {isSavingExp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Pengeluaran</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
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
