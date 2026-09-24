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

export function DashboardPage({ onNavigate, onOpenQuickTx, onOpenQuickExpense }: DashboardPageProps) {
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

  // Max omzet for 7-day trend bar scaling
  const maxTrendOmzet = Math.max(...sevenDaysTrend.map(d => d.omzet), 100000);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2]">
            Ringkasan Bisnis
          </h1>
          <p className="text-xs text-[#7A7A84] mt-0.5">
            Halo {profile.owner_name}, berikut performa toko hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#10B981] bg-[#101013] border border-[#10B981]/30 hover:border-[#10B981] rounded-lg transition-colors"
          >
            <BotMessageSquare className="w-4 h-4" />
            <span>Tanya Copilot AI</span>
          </button>
          <button
            onClick={onOpenQuickTx}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning if any */}
      {lowStockProducts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#16161B] border border-amber-500/30 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F0F0F2]">
                Peringatan Stok Menipis ({lowStockProducts.length} Produk)
              </p>
              <p className="text-[11px] text-[#7A7A84]">
                {lowStockProducts.map(p => `${p.name} (sisa ${p.stock} ${p.unit})`).slice(0, 2).join(', ')}
                {lowStockProducts.length > 2 && ` dan ${lowStockProducts.length - 2} lainnya.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 shrink-0"
          >
            <span>Periksa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Omzet Hari Ini"
          value={formatRupiah(omzetToday)}
          subtitle={`${transactionsCountToday} pesanan selesai`}
          icon={<DollarSign className="w-4 h-4 text-[#10B981]" />}
          highlight={true}
        />

        <StatCard
          title="Pengeluaran Hari Ini"
          value={formatRupiah(expensesToday)}
          subtitle="Biaya operasional & bahan"
          icon={<ArrowDownCircle className="w-4 h-4 text-rose-400" />}
        />

        <StatCard
          title="Estimasi Laba Hari Ini"
          value={formatRupiah(estimatedProfitToday)}
          subtitle="Omzet - HPP - Pengeluaran"
          icon={<TrendingUp className="w-4 h-4 text-[#10B981]" />}
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
          icon={<ShoppingBag className="w-4 h-4 text-sky-400" />}
        />
      </div>

      {/* 7 Days Trend + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ringkasan 7 Hari */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F0F0F2]">Ringkasan 7 Hari Terakhir</h3>
              <p className="text-xs text-[#7A7A84] mt-0.5">Tren omzet dan estimasi laba harian</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-[#10B981] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trend Bar Chart */}
          <div className="pt-2 pb-1">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 border-b border-[#22222A] pb-2">
              {sevenDaysTrend.map((day, idx) => {
                const heightPercent = Math.max(8, Math.round((day.omzet / maxTrendOmzet) * 100));
                const isToday = idx === 6;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    {/* Tooltip value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#F0F0F2] bg-[#16161B] px-1.5 py-0.5 rounded border border-[#22222A] whitespace-nowrap">
                      {formatNumber(day.omzet)}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[36px] flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isToday
                            ? 'bg-[#10B981]'
                            : 'bg-[#22222A] group-hover:bg-[#10B981]/70'
                        }`}
                      />
                    </div>

                    {/* Label */}
                    <span className={`text-[10px] font-medium ${isToday ? 'text-[#10B981]' : 'text-[#7A7A84]'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-[#7A7A84] mt-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" />
                  <span>Omzet Hari Ini</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#22222A]" />
                  <span>Omzet Sebelumnya</span>
                </span>
              </div>
              <span className="text-[11px]">Skala real-time</span>
            </div>
          </div>
        </div>

        {/* Produk Terlaris */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#F0F0F2]">Produk Terlaris</h3>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs text-[#7A7A84] hover:text-[#F0F0F2]"
              >
                Katalog Menu
              </button>
            </div>

            {topProductsToday.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A7A84]">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Belum ada penjualan tercatat.</p>
                <button
                  onClick={onOpenQuickTx}
                  className="mt-2 text-[#10B981] font-medium hover:underline"
                >
                  Catat transaksi pertama
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {topProductsToday.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-1.5 border-b border-[#22222A]/60 last:border-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-center text-xs font-semibold text-[#7A7A84]">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#F0F0F2] truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#7A7A84]">
                          {item.quantity} terjual
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#F0F0F2] shrink-0">
                      {formatRupiah(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick CTA to Ask AI */}
          <div className="mt-4 pt-3 border-t border-[#22222A]">
            <button
              onClick={() => onNavigate('chat')}
              className="w-full py-2 px-3 rounded-lg bg-[#16161B] hover:bg-[#22222A] text-xs text-[#F0F0F2] flex items-center justify-center gap-2 transition-colors"
            >
              <BotMessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Analisis produk ini bersama AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaksi Terbaru */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F0F0F2]">Transaksi Terbaru</h3>
            <p className="text-xs text-[#7A7A84] mt-0.5">5 transaksi kasir terakhir yang tercatat</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-[#10B981] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7A7A84]">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Belum ada riwayat transaksi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead className="text-[#7A7A84] border-b border-[#22222A] font-medium">
                <tr>
                  <th className="pb-2.5 px-3">No. Nota</th>
                  <th className="pb-2.5 px-3">Waktu</th>
                  <th className="pb-2.5 px-3">Item Pesanan</th>
                  <th className="pb-2.5 px-3">Metode</th>
                  <th className="pb-2.5 px-3 text-right">Total</th>
                  <th className="pb-2.5 px-3 text-right">Laba Kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22222A]/60">
                {recentTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#16161B]/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-[#F0F0F2]">
                      {tx.invoice_number}
                    </td>
                    <td className="py-2.5 px-3 text-[#7A7A84] whitespace-nowrap">
                      {formatDateTime(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 text-[#F0F0F2] max-w-[200px] truncate">
                      {tx.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-[#7A7A84]">
                      {tx.payment_method}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#F0F0F2]">
                      {formatRupiah(tx.total_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#10B981]">
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
