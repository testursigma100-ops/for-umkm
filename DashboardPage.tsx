import React from 'react';
import { useBusiness } from '../context/BusinessContext';
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
  Activity,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickTx: () => void;
  onOpenQuickExpense: () => void;
}

export function DashboardPage({
  onNavigate,
  onOpenQuickTx,
}: DashboardPageProps) {
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

  const maxTrendOmzet = Math.max(
    ...sevenDaysTrend.map(d => d.omzet),
    100000
  );

  // Build a smooth SVG line from the existing 7-day data.
  const chartWidth = 700;
  const chartHeight = 220;
  const chartPadding = 16;

  const points = sevenDaysTrend.map((day, index) => {
    const x =
      sevenDaysTrend.length <= 1
        ? chartWidth / 2
        : chartPadding +
          (index / (sevenDaysTrend.length - 1)) *
            (chartWidth - chartPadding * 2);

    const normalized = day.omzet / maxTrendOmzet;
    const y =
      chartHeight -
      chartPadding -
      normalized * (chartHeight - chartPadding * 2);

    return { x, y, ...day };
  });

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
      : '';

  return (
    <div className="pb-24 md:pb-8 animate-[fadeIn_.35s_ease-out]">

      {/* HEADER */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5F5F5]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#666]">
              Business overview
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            Dashboard
          </h1>

          <p className="mt-1 text-xs text-[#777]">
            {profile.business_name || 'Toko Anda'} · Performa hari ini
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="group flex items-center gap-2 border border-[#29292D] bg-[#111113] px-3 py-2 text-xs font-medium text-[#D8D8D8] transition-all duration-200 hover:border-[#444] hover:bg-[#18181A] active:scale-[0.98]"
          >
            <BotMessageSquare className="h-3.5 w-3.5 text-[#999] group-hover:text-white" />
            Asisten
          </button>

          <button
            type="button"
            onClick={onOpenQuickTx}
            className="flex items-center gap-2 bg-[#F5F5F5] px-3.5 py-2 text-xs font-semibold text-[#0B0B0C] transition-all duration-200 hover:bg-white active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" />
            Transaksi
          </button>
        </div>
      </section>

      {/* MAIN REVENUE BLOCK */}
      <section className="relative overflow-hidden border border-[#29292D] bg-[#111113] p-4 sm:p-6 mb-4">
        <div className="absolute right-0 top-0 h-32 w-32 bg-white/[0.025] blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#666]">
              <Activity className="h-3.5 w-3.5" />
              Omzet hari ini
            </div>

            <div className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-[#F5F5F5] tabular-nums">
              {formatRupiah(omzetToday)}
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-[#999]">
                {transactionsCountToday} transaksi selesai
              </span>

              <span className="h-1 w-1 rounded-full bg-[#555]" />

              <span
                className={
                  estimatedProfitToday >= 0
                    ? 'text-[#D8D8D8]'
                    : 'text-[#888]'
                }
              >
                {estimatedProfitToday >= 0 ? '+' : ''}
                {formatRupiah(estimatedProfitToday)} laba
              </span>
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#666]">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-[#D8D8D8]">
              {estimatedProfitToday >= 0
                ? 'Operasional positif'
                : 'Perlu perhatian'}
            </p>
          </div>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-[#29292D] mb-4">
        {[
          {
            title: 'Omzet',
            value: formatRupiah(omzetToday),
            subtitle: `${transactionsCountToday} pesanan`,
            icon: DollarSign,
          },
          {
            title: 'Pengeluaran',
            value: formatRupiah(expensesToday),
            subtitle: 'Operasional',
            icon: ArrowDownCircle,
          },
          {
            title: 'Estimasi laba',
            value: formatRupiah(estimatedProfitToday),
            subtitle: 'Omzet - HPP - biaya',
            icon: TrendingUp,
          },
          {
            title: 'Transaksi',
            value: `${transactionsCountToday}`,
            subtitle: 'Nota hari ini',
            icon: ShoppingBag,
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group border-r border-b border-[#29292D] bg-[#0F0F11] p-4 transition-colors duration-200 hover:bg-[#151517]"
              style={{
                animation: 'slideUp .4s ease-out both',
                animationDelay: `${index * 60}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#666]">
                  {item.title}
                </span>

                <Icon className="h-3.5 w-3.5 text-[#555] transition-colors group-hover:text-[#AAA]" />
              </div>

              <div className="mt-3 text-base sm:text-lg font-semibold text-[#EDEDED] tabular-nums">
                {item.value}
              </div>

              <div className="mt-1 text-[10px] text-[#666] truncate">
                {item.subtitle}
              </div>
            </div>
          );
        })}
      </section>

      {/* LOW STOCK */}
      {lowStockProducts.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 border border-[#29292D] bg-[#111113] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#AAA]" />

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#DDD]">
                Stok menipis · {lowStockProducts.length} produk
              </p>

              <p className="truncate text-[10px] text-[#666]">
                {lowStockProducts
                  .map(p => `${p.name} (${p.stock} ${p.unit})`)
                  .slice(0, 2)
                  .join(', ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="flex shrink-0 items-center gap-1 text-[10px] text-[#999] hover:text-white"
          >
            Periksa
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* CHART + TOP PRODUCTS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* CHART */}
        <div className="lg:col-span-2 border border-[#29292D] bg-[#111113] p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#EDEDED]">
                  Performa omzet
                </h2>

                <span className="text-[9px] uppercase tracking-wider text-[#555]">
                  7D
                </span>
              </div>

              <p className="mt-1 text-[10px] text-[#666]">
                Pergerakan omzet 7 hari terakhir
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-[10px] text-[#777] hover:text-white"
            >
              Laporan →
            </button>
          </div>

          <div className="relative h-[220px] w-full overflow-hidden">
            {/* horizontal guides */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="border-t border-dashed border-[#202024]"
                />
              ))}
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="relative h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d={areaPath}
                fill="url(#chartFill)"
                className="opacity-0 animate-[fadeIn_.8s_ease-out_.35s_forwards]"
              />

              <path
                d={linePath}
                fill="none"
                stroke="#EDEDED"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                className="animate-[drawLine_1.1s_ease-out_forwards]"
              />

              {points.map((point, index) => {
                const isToday = index === points.length - 1;

                return (
                  <g key={point.date}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isToday ? 4 : 2.5}
                      fill="#111113"
                      stroke="#F5F5F5"
                      strokeWidth={isToday ? 2 : 1}
                      className="transition-all duration-200 hover:r-5"
                    />

                    <title>
                      {point.label}: {formatNumber(point.omzet)}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid grid-cols-7 gap-1 border-t border-[#29292D] pt-2">
            {sevenDaysTrend.map((day, index) => (
              <div key={day.date} className="text-center">
                <span
                  className={`text-[9px] ${
                    index === sevenDaysTrend.length - 1
                      ? 'font-semibold text-[#F5F5F5]'
                      : 'text-[#555]'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-[#666]">
            <span>Terendah — tertinggi</span>
            <span className="tabular-nums">
              Max {formatRupiah(maxTrendOmzet)}
            </span>
          </div>
        </div>

        {/* TOP PRODUCTS */}
        <div className="border border-[#29292D] bg-[#111113] p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#EDEDED]">
                Produk terlaris
              </h2>

              <p className="mt-1 text-[10px] text-[#666]">
                Penjualan hari ini
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="text-[10px] text-[#777] hover:text-white"
            >
              Katalog
            </button>
          </div>

          {topProductsToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-2 h-6 w-6 text-[#444]" />
              <p className="text-[10px] text-[#666]">
                Belum ada penjualan hari ini.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              {topProductsToday.map((prod, idx) => (
                <div
                  key={prod.name}
                  className="group flex items-center gap-3 border-b border-[#222226] py-3 last:border-none"
                >
                  <span className="w-5 text-[10px] font-mono text-[#555]">
                    0{idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#DDD]">
                      {prod.name}
                    </p>

                    <p className="mt-0.5 text-[9px] text-[#666]">
                      {prod.quantity} terjual
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-[#AAA] tabular-nums">
                    {formatRupiah(prod.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenQuickTx}
            className="mt-4 flex w-full items-center justify-center gap-1.5 border border-[#29292D] bg-[#151517] py-2.5 text-[10px] font-semibold text-[#CCC] transition-colors hover:bg-[#1C1C1F] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Pesanan baru
          </button>
        </div>
      </section>

      {/* RECENT TRANSACTIONS */}
      <section className="border border-[#29292D] bg-[#111113]">
        <div className="flex items-center justify-between border-b border-[#29292D] px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-[#EDEDED]">
              Transaksi terbaru
            </h2>

            <p className="mt-0.5 text-[10px] text-[#666]">
              Aktivitas kasir terakhir
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="flex items-center gap-1 text-[10px] text-[#777] hover:text-white"
          >
            Semua
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="mx-auto mb-2 h-6 w-6 text-[#444]" />
            <p className="text-[10px] text-[#666]">
              Belum ada transaksi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-[#222226] text-[9px] uppercase tracking-wider text-[#555]">
                <tr>
                  <th className="px-4 py-2.5">Nota</th>
                  <th className="px-2 py-2.5">Waktu</th>
                  <th className="px-2 py-2.5">Item</th>
                  <th className="px-2 py-2.5">Metode</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Laba</th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.slice(0, 5).map(tx => (
                  <tr
                    key={tx.id}
                    className="border-b border-[#1D1D20] transition-colors hover:bg-[#151517]"
                  >
                    <td className="px-4 py-3 font-mono text-[10px] font-medium text-[#DDD]">
                      {tx.invoice_number}
                    </td>

                    <td className="whitespace-nowrap px-2 py-3 text-[10px] text-[#666]">
                      {formatDateTime(tx.date)}
                    </td>

                    <td className="max-w-[180px] truncate px-2 py-3 text-[10px] text-[#AAA]">
                      {Array.isArray(tx.items) && tx.items.length > 0
                        ? tx.items
                            .map(
                              i =>
                                `${i.quantity}x ${i.product_name}`
                            )
                            .join(', ')
                        : '-'}
                    </td>

                    <td className="px-2 py-3 text-[9px] font-semibold uppercase text-[#666]">
                      {tx.payment_method}
                    </td>

                    <td className="px-4 py-3 text-right text-[10px] font-semibold text-[#DDD] tabular-nums">
                      {formatRupiah(tx.total_amount)}
                    </td>

                    <td className="px-4 py-3 text-right text-[10px] font-semibold text-[#AAA] tabular-nums">
                      {tx.profit >= 0 ? '+' : ''}
                      {formatRupiah(tx.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drawLine {
          from {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
          }
          to {
            stroke-dasharray: 1;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}