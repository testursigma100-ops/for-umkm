import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { NavTab } from './BottomNav';
import {
  Sparkles,
  Plus,
  ArrowDownCircle,
  Settings as SettingsIcon,
  Receipt,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickTxModal?: () => void;
  onOpenQuickExpenseModal?: () => void;
  onOpenAuthModal?: () => void;
}

export function Navbar({
  activeTab,
  onTabChange,
  onOpenQuickTxModal,
  onOpenQuickExpenseModal,
  onOpenAuthModal,
}: NavbarProps) {
  const { profile, user, logout } = useBusiness();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#08080A]/90 backdrop-blur-md border-b border-[#22222A] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Business Name */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('dashboard')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#101013] border border-[#22222A] flex items-center justify-center text-[#10B981] group-hover:border-[#10B981]/50 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[#F0F0F2]">
                  BisnisKu
                </span>
                <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-[#7A7A84] hidden sm:block leading-tight">
                {profile.business_name || 'Jualan jalan, bisnis makin jelas.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Navigation shortcuts */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Expense button */}
          <button
            onClick={onOpenQuickExpenseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F0F0F2] bg-[#101013] hover:bg-[#16161B] border border-[#22222A] hover:border-[#33333F] rounded-lg transition-colors"
            title="Catat Pengeluaran Baru"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Pengeluaran</span>
          </button>

          {/* Quick POS Transaction button */}
          <button
            onClick={onOpenQuickTxModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors shadow-xs"
            title="Buka Kasir / Catat Penjualan"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Kasir / Jual</span>
          </button>

          {/* Extra Desktop links (Pengeluaran, Pengaturan) */}
          <button
            onClick={() => onTabChange('expenses')}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'expenses'
                ? 'text-[#10B981] bg-[#16161B]'
                : 'text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Pengeluaran</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'settings'
                ? 'text-[#10B981] bg-[#16161B]'
                : 'text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013]'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Pengaturan</span>
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 text-xs text-[#F0F0F2] bg-[#101013] hover:bg-[#16161B] border border-[#22222A] rounded-lg transition-colors"
              aria-label="Menu Pengguna"
            >
              <div className="w-6 h-6 rounded-full bg-[#16161B] border border-[#22222A] flex items-center justify-center text-[#10B981]">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden md:inline font-medium max-w-[90px] truncate">
                {user.name || 'Owner'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#7A7A84]" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-[#101013] border border-[#22222A] rounded-xl shadow-xl z-50 py-1 divide-y divide-[#22222A]">
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs font-semibold text-[#F0F0F2]">
                      {profile.business_name}
                    </p>
                    <p className="text-[11px] text-[#7A7A84] truncate">
                      {user.isAuthenticated ? (user.email || 'Akun Supabase') : 'Belum Masuk Akun'}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onTabChange('settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-[#F0F0F2] hover:bg-[#16161B] flex items-center gap-2"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-[#7A7A84]" />
                      <span>Pengaturan & Supabase</span>
                    </button>
                    <button
                      onClick={() => {
                        onTabChange('expenses');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-[#F0F0F2] hover:bg-[#16161B] flex items-center gap-2 lg:hidden"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#7A7A84]" />
                      <span>Daftar Pengeluaran</span>
                    </button>
                  </div>

                  <div className="py-1">
                    {user.isAuthenticated ? (
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-[#16161B] flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar Akun</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (onOpenAuthModal) onOpenAuthModal();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-[#10B981] hover:bg-[#16161B] flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Masuk / Daftar</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
