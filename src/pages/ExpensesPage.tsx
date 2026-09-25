import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Expense, ExpenseCategory } from '../types';
import { formatRupiah, formatDateOnly, getTodayDateString } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  Search,
  ArrowDownCircle,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export function ExpensesPage() {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    isLoadingData,
    refreshData,
    profile,
  } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Bahan');
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const categories: ExpenseCategory[] = [
    'Bahan',
    'Operasional',
    'Transport',
    'Promosi',
    'Lainnya',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchSearch =
        exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat =
        selectedCategory === 'all' || exp.category === selectedCategory;

      const expDate = exp.date ? exp.date.split('T')[0] : '';
      const matchMonth = !selectedMonth || expDate.startsWith(selectedMonth);

      return matchSearch && matchCat && matchMonth;
    });
  }, [expenses, searchQuery, selectedCategory, selectedMonth]);

  const monthSummary = useMemo(() => {
    const monthExpenses = expenses.filter(e => {
      const expDate = e.date ? e.date.split('T')[0] : '';
      return !selectedMonth || expDate.startsWith(selectedMonth);
    });

    const total = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const breakdown: Record<ExpenseCategory, number> = {
      Bahan: 0,
      Operasional: 0,
      Transport: 0,
      Promosi: 0,
      Lainnya: 0,
    };

    monthExpenses.forEach(e => {
      if (breakdown[e.category] !== undefined) {
        breakdown[e.category] += Number(e.amount) || 0;
      } else {
        breakdown.Lainnya += Number(e.amount) || 0;
      }
    });

    return {
      total,
      breakdown,
      count: monthExpenses.length,
    };
  }, [expenses, selectedMonth]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormName('');
    setFormAmount('');
    setFormCategory('Bahan');
    setFormDate(getTodayDateString());
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormName(exp.name);
    setFormAmount(exp.amount);
    setFormCategory(exp.category || 'Bahan');
    setFormDate(exp.date ? exp.date.split('T')[0] : getTodayDateString());
    setFormNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formAmount === '' || isSubmitting) return;

    const numAmount = Number(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setToast({
        message: 'Nominal pengeluaran harus lebih besar dari 0.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          name: formName.trim(),
          amount: numAmount,
          category: formCategory,
          date: formDate,
          notes: formNotes.trim(),
        });
        setToast({
          message: `Pengeluaran "${formName.trim()}" berhasil diperbarui.`,
          type: 'success',
        });
      } else {
        await addExpense({
          name: formName.trim(),
          amount: numAmount,
          category: formCategory,
          date: formDate,
          notes: formNotes.trim(),
        });
        setToast({
          message: `Pengeluaran "${formName.trim()}" berhasil dicatat.`,
          type: 'success',
        });
      }

      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.error_description ||
        err?.details ||
        String(err) ||
        'Gagal menyimpan pengeluaran.';
      setToast({
        message: `Error: ${errorMessage}`,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteExpense(deletingExpense.id);
      setToast({
        message: `Pengeluaran "${deletingExpense.name}" berhasil dihapus.`,
        type: 'success',
      });
      setDeletingExpense(null);
      await refreshData();
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.error_description ||
        err?.details ||
        String(err) ||
        'Gagal menghapus pengeluaran.';
      setToast({
        message: `Error: ${errorMessage}`,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Catatan Pengeluaran
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-0.5">
            Belanja bahan baku, operasional, transport, dan biaya {profile.business_name || 'toko'}.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors self-start sm:self-auto active:scale-[0.98] select-none"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Catat Pengeluaran</span>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="break-all">{toast.message}</span>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-[#8A8A8A] hover:text-[#F5F5F5] text-sm leading-none px-1"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary 4-Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#151515] border border-[#252525]">
          <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-2 font-medium">
            <span>Total Bulan Ini</span>
            <ArrowDownCircle className="w-4 h-4 text-[#8A8A8A]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] mb-1 tabular-nums">
            {formatRupiah(monthSummary.total)}
          </div>
          <p className="text-xs text-[#8A8A8A] tabular-nums">
            {monthSummary.count} transaksi biaya
          </p>
        </div>

        {categories.slice(0, 3).map(cat => {
          const amount = monthSummary.breakdown[cat];
          const pct = monthSummary.total > 0 ? Math.round((amount / monthSummary.total) * 100) : 0;

          return (
            <div key={cat} className="p-4 rounded-xl bg-[#151515] border border-[#252525]">
              <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-2 font-medium">
                <span>Kategori {cat}</span>
                <span className="text-[#F5F5F5] font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="text-lg font-bold text-[#F5F5F5] mb-1 tabular-nums">
                {formatRupiah(amount)}
              </div>
              <div className="w-full bg-[#1F1F1F] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#8A8A8A] h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pengeluaran atau catatan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#151515] border border-[#252525] rounded-lg text-[#F5F5F5] placeholder-[#8A8A8A] focus:outline-hidden focus:border-[#22C55E]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none select-none">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#151515] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
          />

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#151515] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl bg-[#151515] border border-[#252525] overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8A8A8A]">
            <ArrowDownCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-[#F5F5F5]">Belum ada data pengeluaran</p>
            <p className="mt-1">
              {searchQuery
                ? 'Tidak ada pengeluaran yang cocok dengan pencarian.'
                : 'Mulai catat biaya operasional toko dengan tombol di atas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="text-[#8A8A8A] border-b border-[#252525] font-medium bg-[#111111]">
                <tr>
                  <th className="py-2.5 px-4">Nama Pengeluaran</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#1F1F1F]/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#F5F5F5]">{exp.name}</p>
                      {exp.notes && (
                        <p className="text-[11px] text-[#8A8A8A] line-clamp-1">{exp.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1F1F1F] text-[#8A8A8A] border border-[#252525]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#8A8A8A] whitespace-nowrap tabular-nums">
                      {formatDateOnly(exp.date)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-red-400 tabular-nums">
                      -{formatRupiah(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 text-[#8A8A8A] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
        subtitle="Biaya bahan baku, operasional, atau pengeluaran toko lainnya"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#8A8A8A] mb-1">
              Nama Pengeluaran *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli Biji Kopi Arabika 1kg"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#8A8A8A] mb-1">
                Nominal Biaya (Rp) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#8A8A8A] mb-1">
                Kategori
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#8A8A8A] mb-1">
              Tanggal
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#8A8A8A] mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan toko / supplier / nota belanja..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#252525] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#252525]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#8A8A8A] hover:text-[#F5F5F5] bg-[#151515] border border-[#252525] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{editingExpense ? 'Simpan Perubahan' : 'Simpan Biaya'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingExpense}
        onClose={() => !isDeleting && setDeletingExpense(null)}
        title="Hapus Catatan Pengeluaran"
        subtitle="Konfirmasi penghapusan data biaya"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            Yakin ingin menghapus pengeluaran <strong>&quot;{deletingExpense?.name}&quot;</strong> senilai <strong className="tabular-nums">{formatRupiah(deletingExpense?.amount || 0)}</strong>?
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252525]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingExpense(null)}
              className="px-4 py-2 text-xs font-medium text-[#8A8A8A] hover:text-[#F5F5F5] bg-[#151515] border border-[#252525] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Hapus Pengeluaran</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
