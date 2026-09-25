import React from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  BotMessageSquare,
  BarChart3,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'products' | 'transactions' | 'reports' | 'chat' | 'expenses' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Produk', icon: Package },
    { id: 'transactions' as NavTab, label: 'Transaksi', icon: Receipt },
    { id: 'chat' as NavTab, label: 'Asisten', icon: BotMessageSquare },
    { id: 'reports' as NavTab, label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0C]/95 backdrop-blur-lg border-t border-[#242428] px-2 pt-1.5 pb-safe select-none"
      aria-label="Navigasi Utama Bawah"
    >
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 min-h-[44px] ${
                isActive
                  ? 'text-[#22C55E]'
                  : 'text-[#8A8A91] hover:text-[#F5F5F5]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
              <span className={`text-[10px] tracking-tight whitespace-nowrap ${isActive ? 'font-semibold text-[#F5F5F5]' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
