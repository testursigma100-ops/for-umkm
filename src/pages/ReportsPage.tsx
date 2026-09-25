import React, { useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatRupiah, formatDateOnly, formatDateTime, getTodayDateString } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import {
  TrendingUp,
  ArrowDownCircle,
  DollarSign,
  Download,
  Printer,
  Receipt,
  Layers,
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
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F4]">
            Laporan Keuangan
          </h1>
          <p className="text-xs text-[#8E8E9A] mt-0.5">
            Analisis omzet, laba kotor, beban biaya, dan laba bersih ({reportData.periodLabel}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#121216] border border-[#202028] rounded-lg">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'daily'
                  ? 'bg-[#181820] text-[#10B981]'
                  : 'text-[#8E8E9A] hover:text-[#F0F0F4]'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'weekly'
                  ? 'bg-[#181820] text-[#10B981]'
                  : 'text-[#8E8E9A] hover:text-[#F0F0F4]'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'monthly'
                  ? 'bg-[#181820] text-[#10B981]'
                  : 'text-[#8E8E9A] hover:text-[#F0F0F4]'
              }`}
            >
              Bulanan
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F0F0F4] bg-[#121216] hover:bg-[#181820] border border-[#202028] rounded-lg transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F0F0F4] bg-[#121216] hover:bg-[#181820] border border-[#202028] rounded-lg transition-colors"
            title="Cetak Laporan"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Primary KPI 4-Card Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Omzet Penjualan"
          value={formatRupiah(reportData.totalOmzet)}
          subtitle={`${reportData.txCount} transaksi`}
          icon={<DollarSign className="w-4 h-4 text-[#10B981]" />}
          highlight={true}
        />

        <StatCard
          title="Total HPP Modal"
          value={formatRupiah(reportData.totalHpp)}
          subtitle="Biaya modal bahan menu"
          icon={<Receipt className="w-4 h-4 text-[#8E8E9A]" />}
        />

        <StatCard
          title="Total Pengeluaran"
          value={formatRupiah(reportData.totalExpenses)}
          subtitle={`${reportData.expenses.length} pos biaya operasional`}
          icon={<ArrowDownCircle className="w-4 h-4 text-rose-400" />}
        />

        <StatCard
          title="Estimasi Laba Bersih"
          value={formatRupiah(reportData.labaBersih)}
          subtitle={`Margin bersih: ${reportData.netMargin}%`}
          icon={<TrendingUp className="w-4 h-4 text-[#10B981]" />}
          trend={{
            value: reportData.labaBersih >= 0 ? `+${reportData.netMargin}%` : `${reportData.netMargin}%`,
            isPositive: reportData.labaBersih >= 0,
            label: reportData.labaBersih >= 0 ? 'Surplus' : 'Defisit',
          }}
        />
      </div>

      {/* P&L Statement Box */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-[#202028]">
        <h3 className="text-sm font-semibold text-[#F0F0F4] mb-3">
          Ringkasan Laba Rugi Operasional ({reportData.periodLabel})
        </h3>

        <div className="space-y-2 text-xs divide-y divide-[#202028]/60">
          <div className="flex justify-between py-2">
            <span className="text-[#8E8E9A] font-medium">1. Pendapatan Penjualan (Omzet)</span>
            <span className="font-semibold text-[#F0F0F4] tabular-nums">{formatRupiah(reportData.totalOmzet)}</span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-[#8E8E9A] font-medium">2. Beban Pokok Penjualan (HPP)</span>
            <span className="font-semibold text-rose-400 tabular-nums">-{formatRupiah(reportData.totalHpp)}</span>
          </div>

          <div className="flex justify-between py-2 bg-[#181820]/60 px-3 rounded-lg">
            <span className="font-bold text-[#F0F0F4]">Laba Kotor (Gross Profit)</span>
            <span className="font-bold text-[#10B981] tabular-nums">{formatRupiah(reportData.labaKotor)}</span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-[#8E8E9A] font-medium">3. Beban Operasional & Biaya Lainnya</span>
            <span className="font-semibold text-rose-400 tabular-nums">-{formatRupiah(reportData.totalExpenses)}</span>
          </div>

          <div className="flex justify-between py-2.5 bg-[#181820] px-3 rounded-lg border border-[#262632]">
            <div>
              <span className="font-bold text-sm text-[#F0F0F4]">Laba Bersih Usaha (Net Profit)</span>
              <p className="text-[10px] text-[#8E8E9A]">Laba kotor dikurangi total beban pengeluaran</p>
            </div>
            <span className={`text-base font-bold tabular-nums ${reportData.labaBersih >= 0 ? 'text-[#10B981]' : 'text-rose-400'}`}>
              {formatRupiah(reportData.labaBersih)}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column: Top Products by Revenue & Profitability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Produk Terlaris */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-[#202028]">
          <h3 className="text-sm font-semibold text-[#F0F0F4] mb-3">
            5 Menu Paling Laku (Kuantitas Terjual)
          </h3>
          {reportData.produkTerlaris.length === 0 ? (
            <p className="text-xs text-[#8E8E9A] py-4 text-center">Belum ada data penjualan pada periode ini.</p>
          ) : (
            <div className="space-y-2.5">
              {reportData.produkTerlaris.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-xs py-1 border-b border-[#202028]/60 last:border-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-center font-bold text-[#71717A] tabular-nums">{idx + 1}</span>
                    <span className="font-medium text-[#F0F0F4] truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-[#F0F0F4] tabular-nums">{p.quantity} porsi</span>
                    <span className="text-[10px] text-[#8E8E9A] ml-2 tabular-nums">({formatRupiah(p.revenue)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produk Paling Menguntungkan */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-[#202028]">
          <h3 className="text-sm font-semibold text-[#F0F0F4] mb-3">
            5 Menu Paling Menguntungkan (Laba Kotor)
          </h3>
          {reportData.produkPalingMenguntungkan.length === 0 ? (
            <p className="text-xs text-[#8E8E9A] py-4 text-center">Belum ada data penjualan pada periode ini.</p>
          ) : (
            <div className="space-y-2.5">
              {reportData.produkPalingMenguntungkan.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-xs py-1 border-b border-[#202028]/60 last:border-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-center font-bold text-[#71717A] tabular-nums">{idx + 1}</span>
                    <span className="font-medium text-[#F0F0F4] truncate">{p.name}</span>
                  </div>
                  <span className="font-semibold text-[#10B981] shrink-0 tabular-nums">
                    +{formatRupiah(p.grossProfit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
