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
      label: 'Produk',
      icon: Package,
      badge: dashboardSummary.lowStockProducts.length > 0 ? dashboardSummary.lowStockProducts.length : undefined,
    },
    { id: 'transactions' as NavTab, label: 'Transaksi', icon: Receipt },
    { id: 'expenses' as NavTab, label: 'Pengeluaran', icon: ArrowDownCircle },
    { id: 'chat' as NavTab, label: 'Asisten', icon: BotMessageSquare },
    { id: 'reports' as NavTab, label: 'Laporan', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Pengaturan Usaha', icon: SettingsIcon },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-53px)] bg-[#0B0B0C] border-r border-[#242428] p-4 shrink-0 select-none">
      {/* Business Info Header */}
      <div className="p-3 mb-4 rounded-xl bg-[#141416] border border-[#242428]">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-1.5 rounded-lg bg-[#1C1C20] text-[#8A8A91] shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#F5F5F5] truncate">
              {profile.business_name || 'Kedai UMKM'}
            </h4>
            <p className="text-[11px] text-[#8A8A91] truncate">
              {profile.business_type || 'F&B / Kuliner'}
            </p>
          </div>
        </div>
        <div className="text-[10px] text-[#8A8A91] flex items-center justify-between pt-2 border-t border-[#242428]">
          <span>Status Usaha</span>
          <span className="text-[#22C55E] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            Aktif
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="space-y-1 flex-1">
        <p className="text-[10px] font-semibold text-[#8A8A91] uppercase tracking-wider px-3 py-1 mb-1">
          Menu Utama
        </p>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
                  : 'text-[#8A8A91] hover:text-[#F5F5F5] hover:bg-[#141416]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-[#22C55E]'
                      : 'text-[#8A8A91]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium tabular-nums">
                  <AlertTriangle className="w-3 h-3" />
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
