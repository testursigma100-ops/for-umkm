import React from 'react';
import { NavTab } from './BottomNav';
import { useBusiness } from '../../context/BusinessContext';
import {
  LayoutDashboard,
  Package,
  Receipt,
  ArrowDownCircle,
  BarChart3,
  BotMessageSquare,
  Settings as SettingsIcon,
  Store,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { profile, dashboardSummary } = useBusiness();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'products' as NavTab,
      label: 'Produk & Menu',
      icon: Package,
      badge: dashboardSummary.lowStockProducts.length > 0 ? dashboardSummary.lowStockProducts.length : undefined,
    },
    { id: 'transactions' as NavTab, label: 'Transaksi / Kasir', icon: Receipt },
    { id: 'expenses' as NavTab, label: 'Pengeluaran', icon: ArrowDownCircle },
    { id: 'reports' as NavTab, label: 'Laporan Keuangan', icon: BarChart3 },
    { id: 'chat' as NavTab, label: 'Tanya Bisnis AI', icon: BotMessageSquare, isAi: true },
    { id: 'settings' as NavTab, label: 'Pengaturan & Supabase', icon: SettingsIcon },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-57px)] bg-[#08080A] border-r border-[#22222A] p-4">
      {/* Business Info snippet */}
      <div className="p-3.5 mb-4 rounded-xl bg-[#101013] border border-[#22222A]">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-1.5 rounded-lg bg-[#16161B] text-[#10B981]">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#F0F0F2] truncate">
              {profile.business_name}
            </h4>
            <p className="text-[11px] text-[#7A7A84] truncate">
              {profile.business_type}
            </p>
          </div>
        </div>
        <div className="text-[10px] text-[#7A7A84] flex items-center justify-between pt-2 border-t border-[#22222A]/60">
          <span>Target: F&B / Kuliner</span>
          <span className="text-[#10B981] font-medium">Aktif</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="space-y-1 flex-1">
        <p className="text-[10px] font-semibold text-[#7A7A84] uppercase tracking-wider px-3 py-1 mb-1">
          Menu Utama
        </p>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#101013] text-[#10B981] border border-[#22222A]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013]/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-[#10B981]'
                      : item.isAi
                      ? 'text-[#10B981]'
                      : 'text-[#7A7A84]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {item.badge}
                </span>
              )}

              {item.isAi && !isActive && (
                <span className="text-[9px] font-semibold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                  Copilot
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tagline footer */}
      <div className="pt-4 border-t border-[#22222A] px-2 text-center">
        <p className="text-[11px] font-medium text-[#F0F0F2]">BisnisKu AI</p>
        <p className="text-[10px] text-[#7A7A84]">"Jualan jalan, bisnis makin jelas."</p>
      </div>
    </aside>
  );
}
