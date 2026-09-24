import React from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  BarChart3,
  BotMessageSquare,
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
    { id: 'reports' as NavTab, label: 'Laporan', icon: BarChart3 },
    { id: 'chat' as NavTab, label: 'Tanya Bisnis', icon: BotMessageSquare },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#101013]/95 backdrop-blur-md border-t border-[#22222A] px-2 py-1.5"
      aria-label="Navigasi Utama Bawah"
    >
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 ${
                isActive
                  ? 'text-[#10B981]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
