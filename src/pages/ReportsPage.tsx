import React, { useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatRupiah, formatDateOnly, formatDateTime, getTodayDateString } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import {
  BarChart3,
  TrendingUp,
  ArrowDownCircle,
  DollarSign,
  Download,
  Printer,
} from 'lucide-react';

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export function ReportsPage() {
  const { transactions, expenses, profile, isLoadingData } = useBusiness();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  // Convert date string/ISO to local YYYY-MM-DD
  const toLocalDateString = (dateInput?: string | null): string => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) {
        return dateInput.split('T')[0] || '';
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateInput.split('T')[0] || '';
    }
  };

  // Convert date string/ISO to local YYYY-MM
  const toLocalMonthString = (dateInput?: string | null): string => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) {
        return dateInput.slice(0, 7);
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch {
      return dateInput.slice(0, 7);
    }
  };

  // Filter transactions and expenses based on period
  const reportData = useMemo(() => {
    const now = new Date();
    const todayStr = getTodayDateString();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);

    let filteredTxs = transactions;
    let filteredExps = expenses;
    let periodLabel = 'Bulan Ini';

    if (period === 'daily') {
      filteredTxs = transactions.filter(t => toLocalDateString(t.date) === todayStr);
      filteredExps = expenses.filter(e => toLocalDateString(e.date) === todayStr);
      periodLabel = `Hari Ini (${formatDateOnly(todayStr)})`;
    } else if (period === 'weekly') {
      const startOf7DaysAgo = new Date();
      startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
      startOf7DaysAgo.setHours(0, 0, 0, 0);
      const startTimestamp = startOf7DaysAgo.getTime();

      filteredTxs = transactions.filter(t => {
        const time = new Date(t.date || 0).getTime();
        return !isNaN(time) && time >= startTimestamp;
      });
      filteredExps = expenses.filter(e => {
        const time = new Date(e.date || 0).getTime();
        return !isNaN(time) && time >= startTimestamp;
      });
      periodLabel = '7 Hari Terakhir';
    } else {
      filteredTxs = transactions.filter(t => toLocalMonthString(t.date) === thisMonthStr);
      filteredExps = expenses.filter(e => toLocalMonthString(e.date) === thisMonthStr);
      periodLabel = `Bulan Ini (${monthName})`;
    }

    // Totals from real sales and expenses
    const totalOmzet = filteredTxs.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    const totalHpp = filteredTxs.reduce((sum, t) => {
      const hpp = Number(t.total_hpp || 0);
      if (hpp > 0) return sum + hpp;
      if (Array.isArray(t.items) && t.items.length > 0) {
        return sum + t.items.reduce((isum, it) => isum + Number(it.subtotal_hpp || (it.quantity * it.unit_hpp) || 0), 0);
      }
      return sum;
    }, 0);

    const labaKotor = totalOmzet - totalHpp;
    const totalExpenses = filteredExps.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const labaBersih = labaKotor - totalExpenses;
    const txCount = filteredTxs.length;
    const aov = txCount > 0 ? Math.round(totalOmzet / txCount) : 0;
    const netMargin = totalOmzet > 0 ? Math.round((labaBersih / totalOmzet) * 1000) / 10 : 0;

    // Produk Terlaris & Paling Menguntungkan from real sale_items
    const productStats: Record<string, { name: string; quantity: number; revenue: number; grossProfit: number }> = {};
    filteredTxs.forEach(tx => {
      if (Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          const pName = (item.product_name || 'Produk').trim();
          if (!productStats[pName]) {
            productStats[pName] = {
              name: pName,
              quantity: 0,
              revenue: 0,
              grossProfit: 0,
            };
          }
          const qty = Number(item.quantity || 1);
          const sub = Number(item.subtotal || (qty * Number(item.unit_price || 0)));
          const hppSub = Number(item.subtotal_hpp || (qty * Number(item.unit_hpp || 0)));
          const itemProfit = sub - hppSub;

          productStats[pName].quantity += qty;
          productStats[pName].revenue += sub;
          productStats[pName].grossProfit += itemProfit;
        });
      }
    });

    const list = Object.values(productStats);
    const produkTerlaris = [...list].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const produkPalingMenguntungkan = [...list].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);

    // Payment methods breakdown
    const paymentBreakdown: Record<string, number> = { qris: 0, cash: 0, transfer: 0, other: 0 };
    filteredTxs.forEach(t => {
      if (paymentBreakdown[t.payment_method] !== undefined) {
        paymentBreakdown[t.payment_method] += Number(t.total_amount || 0);
      }
    });

    return {
      periodLabel,
      totalOmzet,
      totalHpp,
      labaKotor,
      totalExpenses,
      labaBersih,
      txCount,
      aov,
      netMargin,
      produkTerlaris,
      produkPalingMenguntungkan,
      paymentBreakdown,
      transactions: filteredTxs,
      expenses: filteredExps,
    };
  }, [transactions, expenses, period]);

  // Export CSV helper with real data
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No. Nota,Tanggal,Pelanggan,Metode,Total Penjualan,HPP,Laba Kotor\n';

    reportData.transactions.forEach(t => {
      const row = [
        t.invoice_number,
        formatDateTime(t.date),
        `"${(t.customer_name || '-').replace(/"/g, '""')}"`,
        t.payment_method,
        t.total_amount,
        t.total_hpp,
        t.profit ?? (t.total_amount - t.total_hpp),
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_penjualan_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2]">
            Laporan Keuangan
          </h1>
          <p className="text-xs text-[#7A7A84] mt-0.5">
            Analisis omzet, laba kotor, beban operasional, dan profitabilitas menu F&B.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#101013] border border-[#22222A] rounded-lg">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'daily'
                  ? 'bg-[#16161B] text-[#10B981]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2]'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'weekly'
                  ? 'bg-[#16161B] text-[#10B981]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2]'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'monthly'
                  ? 'bg-[#16161B] text-[#10B981]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2]'
              }`}
            >
              Bulanan
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={reportData.transactions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#F0F0F2] bg-[#101013] hover:bg-[#16161B] border border-[#22222A] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingData && transactions.length === 0 && expenses.length === 0 ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-[#101013] border border-[#22222A] rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-[#101013] border border-[#22222A] rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-60 bg-[#101013] border border-[#22222A] rounded-xl" />
            <div className="h-60 bg-[#101013] border border-[#22222A] rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Omzet"
              value={formatRupiah(reportData.totalOmzet)}
              subtitle={`${reportData.txCount} transaksi penjualan`}
              icon={<DollarSign className="w-4 h-4 text-[#10B981]" />}
              highlight={true}
            />

            <StatCard
              title="Total Pengeluaran"
              value={formatRupiah(reportData.totalExpenses)}
              subtitle={`${reportData.expenses.length} pos biaya`}
              icon={<ArrowDownCircle className="w-4 h-4 text-rose-400" />}
            />

            <StatCard
              title="Laba Bersih Operasional"
              value={formatRupiah(reportData.labaBersih)}
              subtitle={`Margin bersih ${reportData.netMargin}%`}
              icon={<TrendingUp className="w-4 h-4 text-[#10B981]" />}
              trend={{
                value: reportData.labaBersih >= 0 ? 'Surplus' : 'Defisit',
                isPositive: reportData.labaBersih >= 0,
                label: reportData.periodLabel,
              }}
            />

            <StatCard
              title="Rata-rata Nota (AOV)"
              value={formatRupiah(reportData.aov)}
              subtitle="Nilai per transaksi"
              icon={<BarChart3 className="w-4 h-4 text-sky-400" />}
            />
          </div>

          {/* Laporan Laba Rugi Sederhana (Income Statement Table) */}
          <div className="p-5 rounded-xl bg-[#101013] border border-[#22222A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#22222A]">
              <div>
                <h3 className="text-sm font-semibold text-[#F0F0F2]">
                  Laporan Laba Rugi ({reportData.periodLabel})
                </h3>
                <p className="text-xs text-[#7A7A84] mt-0.5">
                  {profile.business_name ? `${profile.business_name} • ` : ''}Standar pencatatan akuntansi UMKM yang mudah dipahami.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-[#7A7A84] hover:text-[#F0F0F2] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak Laporan</span>
              </button>
            </div>

            <div className="divide-y divide-[#22222A]/60 text-xs py-2">
              {/* Revenue */}
              <div className="py-2.5 flex justify-between items-center font-medium">
                <span className="text-[#F0F0F2]">1. Penjualan Bersih (Omzet)</span>
                <span className="text-[#F0F0F2] font-semibold">{formatRupiah(reportData.totalOmzet)}</span>
              </div>

              {/* COGS */}
              <div className="py-2.5 flex justify-between items-center pl-4 text-[#7A7A84]">
                <span>- HPP (Harga Pokok Penjualan Menu Terjual)</span>
                <span>({formatRupiah(reportData.totalHpp)})</span>
              </div>

              {/* Gross Profit */}
              <div className="py-2.5 flex justify-between items-center font-semibold bg-[#16161B]/50 px-2 rounded-md">
                <span className="text-[#F0F0F2]">2. Laba Kotor (Gross Profit)</span>
                <span className={reportData.labaKotor >= 0 ? 'text-[#10B981]' : 'text-rose-400'}>
                  {reportData.labaKotor >= 0 ? '+' : ''}{formatRupiah(reportData.labaKotor)}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="py-2.5 flex justify-between items-center pl-4 text-[#7A7A84]">
                <span>- Beban Operasional, Bahan & Lainnya</span>
                <span className="text-rose-400">({formatRupiah(reportData.totalExpenses)})</span>
              </div>

              {/* Net Profit */}
              <div className="py-3 flex justify-between items-center font-bold text-sm bg-[#16161B] px-3 rounded-lg border border-[#22222A]">
                <span className="text-[#F0F0F2]">3. Laba Bersih (Net Profit)</span>
                <span className={reportData.labaBersih >= 0 ? 'text-[#10B981]' : 'text-rose-400'}>
                  {formatRupiah(reportData.labaBersih)}
                </span>
              </div>
            </div>
          </div>

          {/* Produk Terlaris vs Produk Paling Menguntungkan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Produk Terlaris */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A]">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#F0F0F2]">Produk Terlaris (Volume)</h3>
                <p className="text-xs text-[#7A7A84] mt-0.5">Berdasarkan jumlah porsi / cup yang laku</p>
              </div>

              {reportData.produkTerlaris.length === 0 ? (
                <p className="text-xs text-[#7A7A84] py-6 text-center">Belum ada data penjualan pada periode ini.</p>
              ) : (
                <div className="space-y-2.5">
                  {reportData.produkTerlaris.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-[#22222A]/60 last:border-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-center font-semibold text-[#7A7A84]">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#F0F0F2] truncate">{item.name}</p>
                          <p className="text-[11px] text-[#7A7A84]">{item.quantity} porsi terjual</p>
                        </div>
                      </div>
                      <span className="font-semibold text-[#F0F0F2] shrink-0">
                        {formatRupiah(item.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Produk Paling Menguntungkan */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A]">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#F0F0F2]">Produk Paling Menguntungkan</h3>
                <p className="text-xs text-[#7A7A84] mt-0.5">Kontribusi laba kotor terbesar ke bisnis</p>
              </div>

              {reportData.produkPalingMenguntungkan.length === 0 ? (
                <p className="text-xs text-[#7A7A84] py-6 text-center">Belum ada data profit pada periode ini.</p>
              ) : (
                <div className="space-y-2.5">
                  {reportData.produkPalingMenguntungkan.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-[#22222A]/60 last:border-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-center font-semibold text-[#10B981]">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#F0F0F2] truncate">{item.name}</p>
                          <p className="text-[11px] text-[#7A7A84]">Omzet: {formatRupiah(item.revenue)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#10B981]">+{formatRupiah(item.grossProfit)}</p>
                        <p className="text-[10px] text-[#7A7A84]">Laba Kotor</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
