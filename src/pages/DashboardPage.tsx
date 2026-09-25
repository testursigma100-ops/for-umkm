import React from 'react';
import { useBusiness } from '../context/BusinessContext';
import { StatCard } from '../components/common/StatCard';
import { formatRupiah, formatNumber, formatDateTime } from '../utils/formatters';
import { NavTab } from '../components/layout/BottomNav';
import {
  TrendingUp,
  ArrowDownCircle,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Plus,
  BotMessageSquare,
  Package,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickTx: () => void;
  onOpenQuickExpense: () => void;
}

export function DashboardPage({ onNavigate, onOpenQuickTx }: DashboardPageProps) {
  const { profile, dashboardSummary } = useBusiness();
  const {
    omzetToday,
    expensesToday,
    estimatedProfitToday,
    transactionsCountToday,
    topProductsToday,
    sevenDaysTrend,
    recentTransactions,
    lowStockProducts,
  } = dashboardSummary;

  const maxTrendOmzet = Math.max(...sevenDaysTrend.map(d => d.omzet), 100000);

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Pusat Kontrol Bisnis
          </h1>
          <p className="text-xs text-[#8A8A91] mt-0.5">
            Performa penjualan dan estimasi laba {profile.business_name || 'kedai'} hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F5F5F5] bg-[#141416] border border-[#242428] hover:bg-[#1C1C20] rounded-lg transition-colors active:scale-[0.98]"
          >
            <BotMessageSquare className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Tanya Copilot AI</span>
          </button>
          <button
            type="button"
            onClick={onOpenQuickTx}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockProducts.length > 0 && (
        <div className="p-3 rounded-xl bg-[#141416] border border-[#242428] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#1C1C20] text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                Peringatan Stok Menipis ({lowStockProducts.length} Produk)
              </p>
              <p className="text-[11px] text-[#8A8A91] truncate">
                {lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).slice(0, 2).join(', ')}
                {lowStockProducts.length > 2 && ` dan ${lowStockProducts.length - 2} lainnya.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="text-xs font-medium text-[#8A8A91] hover:text-[#F5F5F5] flex items-center gap-1 shrink-0"
          >
            <span>Periksa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI 4-Card Grid - Unified clean palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Omzet Hari Ini"
          value={formatRupiah(omzetToday)}
          subtitle={`${transactionsCountToday} pesanan selesai`}
          icon={<DollarSign className="w-4 h-4 text-[#8A8A91]" />}
        />

        <StatCard
          title="Pengeluaran Hari Ini"
          value={formatRupiah(expensesToday)}
          subtitle="Biaya operasional & bahan"
          icon={<ArrowDownCircle className="w-4 h-4 text-[#8A8A91]" />}
        />

        <StatCard
          title="Estimasi Laba Hari Ini"
          value={formatRupiah(estimatedProfitToday)}
          subtitle="Omzet - HPP - Biaya"
          icon={<TrendingUp className="w-4 h-4 text-[#8A8A91]" />}
          trend={{
            value: estimatedProfitToday >= 0 ? 'Surplus' : 'Defisit',
            isPositive: estimatedProfitToday >= 0,
            label: 'Bersih',
          }}
        />

        <StatCard
          title="Jumlah Transaksi"
          value={`${transactionsCountToday} Trx`}
          subtitle="Total nota kasir hari ini"
          icon={<ShoppingBag className="w-4 h-4 text-[#8A8A91]" />}
        />
      </div>

      {/* 7 Days Trend & Top Products 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ringkasan 7 Hari */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Ringkasan 7 Hari Terakhir</h3>
              <p className="text-xs text-[#8A8A91] mt-0.5">Tren omzet dan estimasi laba harian</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs text-[#8A8A91] hover:text-[#F5F5F5] flex items-center gap-1 font-medium"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trend Bar Chart */}
          <div className="pt-2 pb-1">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 border-b border-[#242428] pb-2">
              {sevenDaysTrend.map((day, idx) => {
                const heightPercent = Math.max(8, Math.round((day.omzet / maxTrendOmzet) * 100));
                const isToday = idx === 6;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 h-full justify-end group">
                    {/* Tooltip value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#F5F5F5] bg-[#1C1C20] px-1.5 py-0.5 rounded border border-[#242428] whitespace-nowrap tabular-nums">
                      {formatNumber(day.omzet)}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[32px] flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isToday
                            ? 'bg-[#22C55E]'
                            : 'bg-[#242428] group-hover:bg-[#323238]'
                        }`}
                      />
                    </div>

                    {/* Label */}
                    <span className={`text-[10px] font-medium ${isToday ? 'text-[#F5F5F5]' : 'text-[#8A8A91]'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-[#8A8A91] mt-2.5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#22C55E]" />
                  <span>Hari Ini</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[#242428]" />
                  <span>Sebelumnya</span>
                </span>
              </div>
              <span className="text-[11px] tabular-nums">Real-time</span>
            </div>
          </div>
        </div>

        {/* Produk Terlaris */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Produk Terlaris Hari Ini</h3>
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="text-xs text-[#8A8A91] hover:text-[#F5F5F5]"
              >
                Katalog Menu
              </button>
            </div>

            {topProductsToday.length === 0 ? (
              <div className="py-7 text-center text-xs text-[#8A8A91]">
                <Package className="w-7 h-7 mx-auto mb-2 opacity-40 text-[#8A8A91]" />
                <p>Belum ada penjualan hari ini.</p>
                <button
                  type="button"
                  onClick={onOpenQuickTx}
                  className="mt-2 text-[#F5F5F5] font-medium hover:underline"
                >
                  Catat transaksi pertama
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topProductsToday.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-1.5 border-b border-[#242428]/70 last:border-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-4 text-center text-xs font-semibold text-[#8A8A91] tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#F5F5F5] truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#8A8A91] tabular-nums">
                          {item.quantity} terjual
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#F5F5F5] shrink-0 tabular-nums">
                      {formatRupiah(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Assistant Trigger */}
          <div className="mt-4 pt-3 border-t border-[#242428]">
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="w-full py-2 px-3 rounded-lg bg-[#1C1C20] hover:bg-[#242428] text-xs text-[#F5F5F5] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              <BotMessageSquare className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Analisis Performa Bersama Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaksi Terbaru 5 Data */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Transaksi Kasir Terakhir</h3>
            <p className="text-xs text-[#8A8A91] mt-0.5">5 nota pesanan terakhir yang tercatat</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="text-xs text-[#8A8A91] hover:text-[#F5F5F5] flex items-center gap-1 font-medium"
          >
            <span>Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-7 text-center text-xs text-[#8A8A91]">
            <Receipt className="w-7 h-7 mx-auto mb-2 opacity-40 text-[#8A8A91]" />
            <p>Belum ada riwayat transaksi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="text-[#8A8A91] border-b border-[#242428] font-medium">
                <tr>
                  <th className="pb-2.5 px-3">No. Nota</th>
                  <th className="pb-2.5 px-3">Waktu</th>
                  <th className="pb-2.5 px-3">Item Pesanan</th>
                  <th className="pb-2.5 px-3">Metode</th>
                  <th className="pb-2.5 px-3 text-right">Total</th>
                  <th className="pb-2.5 px-3 text-right">Laba Kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242428]/60">
                {recentTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#1C1C20]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-[#F5F5F5]">
                      {tx.invoice_number}
                    </td>
                    <td className="py-2.5 px-3 text-[#8A8A91] whitespace-nowrap tabular-nums">
                      {formatDateTime(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 text-[#F5F5F5] max-w-[200px] truncate">
                      {tx.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-[#8A8A91]">
                      {tx.payment_method}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F5F5F5] tabular-nums">
                      {formatRupiah(tx.total_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#22C55E] tabular-nums">
                      +{formatRupiah(tx.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
