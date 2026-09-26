import React, { useMemo, useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatRupiah } from '../utils/formatters';
import { NavTab } from '../components/layout/BottomNav';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickTx: () => void;
  onOpenQuickExpense: () => void;
}

type Range = 'Hari Ini' | '7 Hari' | '30 Hari' | 'Custom';

export function DashboardPage({
  onNavigate,
  onOpenQuickTx,
}: DashboardPageProps) {
  const { profile, dashboardSummary } = useBusiness();
  const [range, setRange] = useState<Range>('7 Hari');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const {
    omzetToday,
    expensesToday,
    estimatedProfitToday,
    transactionsCountToday,
    topProductsToday,
    sevenDaysTrend,
    lowStockProducts,
  } = dashboardSummary;

  const maxTrendOmzet = Math.max(...sevenDaysTrend.map(d => d.omzet), 100000);
  const totalTrendOmzet = sevenDaysTrend.reduce((sum, day) => sum + day.omzet, 0);
  const averageTransaction = transactionsCountToday > 0
    ? omzetToday / transactionsCountToday
    : 0;
  const hppToday = Math.max(omzetToday - estimatedProfitToday - expensesToday, 0);
  const profitMargin = omzetToday > 0 ? (estimatedProfitToday / omzetToday) * 100 : 0;
  const hppRatio = omzetToday > 0 ? (hppToday / omzetToday) * 100 : 0;
  const expenseRatio = omzetToday > 0 ? (expensesToday / omzetToday) * 100 : 0;

  const chart = useMemo(() => {
    const width = 760;
    const height = 150;
    const left = 16;
    const right = 12;
    const top = 14;
    const bottom = 18;
    const innerW = width - left - right;
    const innerH = height - top - bottom;

    const points = sevenDaysTrend.map((day, index) => {
      const x = sevenDaysTrend.length <= 1
        ? width / 2
        : left + (index / (sevenDaysTrend.length - 1)) * innerW;
      const y = top + innerH - (day.omzet / maxTrendOmzet) * innerH;
      return { ...day, x, y };
    });

    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
    const area = points.length
      ? `${line} L ${points[points.length - 1].x.toFixed(2)} ${height - bottom} L ${points[0].x.toFixed(2)} ${height - bottom} Z`
      : '';

    return { width, height, left, right, top, bottom, points, line, area };
  }, [sevenDaysTrend, maxTrendOmzet]);

  const activePoint = hoverIndex !== null ? chart.points[hoverIndex] : chart.points[chart.points.length - 1];

  const productImage = (product: any) => product?.image_url || product?.image || '';

  return (
    <div className="min-h-full select-none pb-24 md:pb-10 text-[#E9ECEC] animate-[dashFade_.35s_ease-out]">
      {/* HERO GRID */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* REVENUE CHART */}
        <div className="relative overflow-hidden rounded-lg border border-[#24292A] bg-[#0D1010] p-2.5 sm:p-3.5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_10%,rgba(104,194,168,.07),transparent_32%)]" />
          <div className="relative">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-[#9DA5A2]">
                  <TrendingUp className="h-4 w-4 text-[#9ACFBE]" />
                  <span>Total Omzet</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-[27px] font-semibold leading-none tracking-[-0.035em] text-[#F3F5F4] tabular-nums sm:text-[39px]">
                    {formatRupiah(omzetToday)}
                  </span>
                  <span className="mb-0.5 inline-flex items-center gap-0.5 text-[9px] font-medium text-[#6ED1AE]">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] text-[#69716F]">
                  <span>Transaksi hari ini&nbsp; {transactionsCountToday}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-[#454B4A]" />
                  <span>Rata-rata&nbsp; {formatRupiah(averageTransaction)}</span>
                </div>
              </div>

              <div className="inline-flex max-w-full self-start overflow-x-auto rounded-lg border border-[#282D2D] bg-[#101313] p-0.5 scrollbar-none sm:ml-auto">
                {(['Hari Ini', '7 Hari', '30 Hari', 'Custom'] as Range[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRange(item)}
                    className={`shrink-0 rounded-md px-2 py-1.5 text-[8px] transition-colors ${
                      range === item
                        ? 'bg-[#1B2020] text-[#E6ECE9] shadow-sm'
                        : 'text-[#727A78] hover:text-[#B9C0BD]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-1.5 h-[84px] select-none touch-none sm:h-[130px]">
              <div className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="border-t border-[#1A2020]" />
                ))}
              </div>

              <div className="pointer-events-none absolute left-0 top-0 bottom-7 flex flex-col justify-between text-[9px] text-[#5F6865]">
                {[100, 75, 50, 25, 0].map((pct, i) => (
                  <span key={pct}>{formatRupiah(Math.round((maxTrendOmzet * pct) / 100)).replace('Rp ', '')}</span>
                ))}
              </div>

              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                preserveAspectRatio="none"
                className="absolute inset-x-7 top-0 h-[calc(100%-28px)] w-[calc(100%-28px)] overflow-visible"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={event => {
                  if (!chart.points.length) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - rect.left) / rect.width) * chart.width;
                  let nearest = 0;
                  let distance = Infinity;
                  chart.points.forEach((point, index) => {
                    const d = Math.abs(point.x - x);
                    if (d < distance) {
                      distance = d;
                      nearest = index;
                    }
                  });
                  setHoverIndex(nearest);
                }}
                onTouchMove={event => {
                  if (!chart.points.length) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = ((event.touches[0].clientX - rect.left) / rect.width) * chart.width;
                  let nearest = 0;
                  let distance = Infinity;
                  chart.points.forEach((point, index) => {
                    const d = Math.abs(point.x - x);
                    if (d < distance) {
                      distance = d;
                      nearest = index;
                    }
                  });
                  setHoverIndex(nearest);
                }}
              >
                <defs>
                  <linearGradient id="bisniskuChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#79CBB2" stopOpacity="0.17" />
                    <stop offset="100%" stopColor="#79CBB2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={chart.area} fill="url(#bisniskuChartFill)" />
                <path
                  d={chart.line}
                  fill="none"
                  stroke="#9DD7C5"
                  strokeWidth="2.1"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  className="animate-[chartDraw_900ms_ease-out_forwards]"
                />
                {chart.points.map((point, index) => (
                  <circle
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r={hoverIndex === index ? 4.5 : index === chart.points.length - 1 ? 3.5 : 2}
                    fill="#0D1010"
                    stroke="#A7DECE"
                    strokeWidth={hoverIndex === index ? 2 : 1.3}
                  />
                ))}
                {activePoint && hoverIndex !== null && (
                  <>
                    <line
                      x1={activePoint.x}
                      x2={activePoint.x}
                      y1={8}
                      y2={chart.height - chart.bottom}
                      stroke="#7E8985"
                      strokeDasharray="3 4"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r="7"
                      fill="#9DD7C5"
                      fillOpacity="0.13"
                    />
                  </>
                )}
              </svg>

              {activePoint && hoverIndex !== null && (
                <div
                  className="pointer-events-none absolute z-10 w-[132px] -translate-x-1/2 rounded-md border border-[#2A3230] bg-[#0B0F0F]/95 px-3 py-2 shadow-xl backdrop-blur"
                  style={{
                    left: `clamp(66px, calc(28px + ${((activePoint.x / chart.width) * 100)}% - 14px), calc(100% - 66px))`,
                    top: Math.max(4, (activePoint.y / chart.height) * 100 - 15) + '%',
                  }}
                >
                  <p className="text-[9px] text-[#68716E]">{activePoint.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#EFF4F2]">{formatRupiah(activePoint.omzet)}</p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-7 bottom-0 flex justify-between text-[9px] text-[#59615F]">
                {sevenDaysTrend.map(day => <span key={day.date}>{day.label}</span>)}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-[#1C2221] pt-2 text-[9px] text-[#5E6764]">
              <span>{range === '7 Hari' ? 'Performa 7 hari terakhir' : 'Data tersedia dari ringkasan usaha'}</span>
              <span>{formatRupiah(totalTrendOmzet)} total periode</span>
            </div>
          </div>
        </div>

        {/* RIGHT SUMMARY */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <details className="group overflow-hidden rounded-lg border border-[#24292A] bg-[#0D1010]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 select-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-sm font-medium text-[#E4E8E6]">
                <CircleDollarSign className="h-4 w-4 text-[#A7B2AE]" />
                Ringkasan Keuangan
              </span>
              <ChevronDown className="h-4 w-4 text-[#606766] transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-[#1D2322] px-3.5">
              {[
                { label: 'Total Omzet', value: omzetToday, meta: `${profitMargin.toFixed(1)}% margin`, icon: CircleDollarSign },
                { label: 'Keuntungan', value: estimatedProfitToday, meta: `${profitMargin.toFixed(1)}% dari omzet`, icon: TrendingUp },
                { label: 'HPP', value: hppToday, meta: `${hppRatio.toFixed(1)}% dari omzet`, icon: Package },
                { label: 'Pengeluaran', value: expensesToday, meta: `${expenseRatio.toFixed(1)}% dari omzet`, icon: Receipt },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`flex items-center gap-3 py-2.5 ${index < 3 ? 'border-b border-[#1D2322]' : ''}`}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#282F2D] bg-[#151A19]">
                      <Icon className="h-3 w-3 text-[#AAB3B0]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-[#69716F]">{item.label}</p>
                      <p className="mt-0.5 text-[12px] font-medium text-[#E8ECEA] tabular-nums">{formatRupiah(item.value)}</p>
                    </div>
                    <span className="text-[9px] font-medium text-[#66C8A6]">{item.meta}</span>
                  </div>
                );
              })}
            </div>
          </details>
          <section className="rounded-lg border border-[#24292A] bg-[#0D1010] p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-[#D7B46A]" />
                <h2 className="text-sm font-medium text-[#E4E8E6]">Stok Menipis</h2>
              </div>
              <button type="button" onClick={() => onNavigate('products')} className="text-[9px] text-[#68716E] hover:text-[#D0D6D3]">Lihat Semua</button>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="py-5 text-center text-[10px] text-[#5E6764]">Semua stok masih aman.</p>
            ) : (
              lowStockProducts.slice(0, 3).map((product: any, index) => (
                <button
                  key={product.id || product.name || index}
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="flex w-full items-center gap-3 border-t border-[#1D2322] py-2.5 text-left"
                >
                  {productImage(product) ? (
                    <img src={productImage(product)} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#252C2A] bg-[#151A19]"><Package className="h-4 w-4 text-[#66706C]" /></div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-medium text-[#D8DEDB]">{product.name}</span>
                    <span className="mt-0.5 block text-[9px] text-[#68716E]">{product.stock} {product.unit}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#4E5654]" />
                </button>
              ))
            )}
          </section>
        </div>
      </section>

      {/* KPI STRIP */}
      <section className="mt-2.5 grid grid-cols-3 overflow-hidden rounded-lg border border-[#24292A] bg-[#0D1010]">
        {[
          { label: 'Transaksi', value: transactionsCountToday.toString(), icon: ShoppingBag },
          { label: 'Rata-rata', value: formatRupiah(averageTransaction), icon: Receipt },
          { label: 'Item Terjual', value: topProductsToday.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toString(), icon: Package },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`flex min-w-0 items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-3.5 ${index < 2 ? 'border-r border-[#1D2322]' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#282F2D] bg-[#151A19] sm:h-9 sm:w-9">
                <Icon className="h-3.5 w-3.5 text-[#AEB8B4] sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[8px] text-[#68716E] sm:text-[9px]">{item.label}</p>
                <p className="mt-0.5 truncate text-[12px] font-medium text-[#E7ECE9] tabular-nums sm:text-[13px]">{item.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* LOWER GRID */}
      <section className="mt-2.5 grid grid-cols-1 gap-2.5">
        {/* TOP PRODUCTS */}
        <details className="group rounded-lg border border-[#24292A] bg-[#0D1010] overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-[#E4E8E6] select-none">
              Produk Terlaris
            </span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={(e) => { e.stopPropagation(); onNavigate('products'); }} className="text-[8px] text-[#68716E]">Lihat Semua</button>
              <ChevronDown className="h-4 w-4 text-[#606766] transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-[#1D2322] px-3.5">


          {topProductsToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-2 h-6 w-6 text-[#454E4B]" />
              <p className="text-[10px] text-[#66706C]">Belum ada penjualan hari ini.</p>
            </div>
          ) : (
            <div className="mt-3">
              {topProductsToday.slice(0, 4).map((product: any, index) => {
                const maxQty = Math.max(...topProductsToday.map(item => Number(item.quantity || 0)), 1);
                const percent = Math.round((Number(product.quantity || 0) / maxQty) * 100);
                return (
                  <div key={product.name || index} className="grid grid-cols-[24px_36px_minmax(0,1fr)_90px_24px] items-center gap-2 border-t border-[#1D2322] py-2.5 sm:grid-cols-[28px_40px_minmax(0,1fr)_120px_30px] sm:py-3">
                    <span className="text-[11px] text-[#69716F]">{String(index + 1).padStart(2, '0')}</span>
                    {productImage(product) ? (
                      <img src={productImage(product)} alt="" className="h-8 w-8 rounded-md object-cover sm:h-9 sm:w-9" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9 rounded-md border border-[#252C2A] bg-[#151A19]"><Package className="h-4 w-4 text-[#68716E]" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-medium text-[#DCE1DF]">{product.name}</p>
                      <p className="mt-0.5 text-[9px] text-[#69716F]">{product.quantity} terjual</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-1 rounded-full bg-[#242B29]">
                        <div className="h-full rounded-full bg-[#79CBB2] transition-[width] duration-500" style={{ width: `${Math.max(percent, 2)}%` }} />
                      </div>
                    </div>
                    <span className="text-right text-[9px] text-[#7B8581]">{product.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}

          </div>
        </details>
      </section>

      {/* QUICK ACTION */}
      <button
        type="button"
        onClick={onOpenQuickTx}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#24292A] bg-[#0D1010] py-3 text-[10px] font-medium text-[#AEB8B4] transition-colors hover:bg-[#121717] hover:text-[#E7ECE9] sm:hidden"
      >
        <Plus className="h-3.5 w-3.5" />
        Transaksi baru
      </button>

      <style>{`
        @keyframes dashFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chartDraw { from { stroke-dasharray: 1; stroke-dashoffset: 1; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
