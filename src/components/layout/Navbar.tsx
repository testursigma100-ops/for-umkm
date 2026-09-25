import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { NavTab } from './BottomNav';
import { Logo } from '../common/Logo';
import {
  Plus,
  ArrowDownCircle,
  Settings as SettingsIcon,
  Receipt,
  User,
  LogOut,
  ChevronDown,
  LogIn,
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
    <header className="sticky top-0 z-30 bg-[#0B0B0C]/95 backdrop-blur-md border-b border-[#242428] px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand: [Logo] BisnisKu */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              if (user.isAuthenticated) {
                onTabChange('dashboard');
              } else if (onOpenAuthModal) {
                onOpenAuthModal();
              }
            }}
            className="flex items-center gap-2 text-left focus:outline-hidden group select-none"
            aria-label="BisnisKu"
          >
            <div className="text-[#22C55E] flex items-center justify-center">
              <Logo size={26} />
            </div>
            <span className="text-base font-semibold tracking-tight text-[#F5F5F5]">
              BisnisKu
            </span>
          </button>
        </div>

        {/* Action Buttons Zone */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user.isAuthenticated ? (
            <>
              {/* Quick Expense Trigger */}
              {onOpenQuickExpenseModal && (
                <button
                  type="button"
                  onClick={onOpenQuickExpenseModal}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F5F5F5] bg-[#141416] hover:bg-[#1C1C20] border border-[#242428] rounded-lg transition-colors select-none"
                  title="Catat Pengeluaran"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 text-[#8A8A91]" />
                  <span>Pengeluaran</span>
                </button>
              )}

              {/* Primary Action: POS / Kasir */}
              {onOpenQuickTxModal && (
                <button
                  type="button"
                  onClick={onOpenQuickTxModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors active:scale-[0.98] select-none"
                  title="Buka Kasir / Catat Penjualan"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Kasir / Jual</span>
                </button>
              )}

              {/* User Account Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1.5 text-xs text-[#F5F5F5] bg-[#141416] hover:bg-[#1C1C20] border border-[#242428] rounded-lg transition-colors select-none"
                  aria-label="Menu Pengguna"
                >
                  <div className="w-6 h-6 rounded-full bg-[#1C1C20] border border-[#242428] flex items-center justify-center text-[#8A8A91] shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden md:inline font-medium max-w-[100px] truncate text-[11px] text-[#F5F5F5]">
                    {user.name || 'Owner'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#8A8A91]" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-[#141416] border border-[#242428] rounded-xl shadow-lg z-50 py-1 divide-y divide-[#242428]">
                      <div className="px-3.5 py-2.5">
                        <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                          {profile.business_name || 'Kedai Usaha'}
                        </p>
                        <p className="text-[11px] text-[#8A8A91] truncate mt-0.5">
                          {user.email || 'Akun Supabase'}
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            onTabChange('settings');
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-[#F5F5F5] hover:bg-[#1C1C20] flex items-center gap-2.5 transition-colors"
                        >
                          <SettingsIcon className="w-3.5 h-3.5 text-[#8A8A91]" />
                          <span>Pengaturan Usaha</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onTabChange('expenses');
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-[#F5F5F5] hover:bg-[#1C1C20] flex items-center gap-2.5 transition-colors sm:hidden"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#8A8A91]" />
                          <span>Catatan Pengeluaran</span>
                        </button>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                            if (onOpenAuthModal) onOpenAuthModal();
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-[#1C1C20] flex items-center gap-2.5 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Keluar Akun</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors active:scale-[0.98] select-none"
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Masuk / Daftar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
