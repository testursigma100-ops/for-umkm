import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Product } from '../types';
import { formatRupiah, formatNumber, calculateProfit } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Package,
  TrendingUp,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, adjustStock, isLoadingData } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / Feedback State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Minuman Kopi');
  const [formHpp, setFormHpp] = useState<number | ''>('');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>(10);
  const [formUnit, setFormUnit] = useState('porsi');
  const [formMinStock, setFormMinStock] = useState<number | ''>(5);

  // Categories list derived dynamically from real products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Live calculation for the form
  const liveCalc = useMemo(() => {
    const sp = typeof formSellingPrice === 'number' ? formSellingPrice : 0;
    const hp = typeof formHpp === 'number' ? formHpp : 0;
    return calculateProfit(sp, hp);
  }, [formSellingPrice, formHpp]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setFormName('');
    setFormCategory('Minuman Kopi');
    setFormHpp('');
    setFormSellingPrice('');
    setFormStock(20);
    setFormUnit('cup');
    setFormMinStock(5);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormError(null);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormHpp(p.hpp);
    setFormSellingPrice(p.selling_price);
    setFormStock(p.stock);
    setFormUnit(p.unit);
    setFormMinStock(p.min_stock);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama produk / menu wajib diisi.');
      return;
    }

    const payload = {
      name: formName.trim(),
      category: formCategory,
      hpp: Number(formHpp) || 0,
      selling_price: Number(formSellingPrice) || 0,
      stock: Number(formStock) || 0,
      unit: formUnit.trim() || 'porsi',
      min_stock: Number(formMinStock) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        setToast({ message: `Produk "${payload.name}" berhasil diperbarui`, type: 'success' });
      } else {
        await addProduct(payload);
        setToast({ message: `Produk "${payload.name}" berhasil ditambahkan ke Supabase`, type: 'success' });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan produk ke Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      setToast({ message: `Produk "${deletingProduct.name}" berhasil dihapus`, type: 'success' });
      setDeletingProduct(null);
    } catch (err: any) {
      setToast({ message: err?.message || 'Gagal menghapus produk dari Supabase', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2]">
            Katalog Produk & Menu
          </h1>
          <p className="text-xs text-[#7A7A84] mt-0.5">
            Kelola HPP, harga jual, stok, dan pantau margin profit per porsi dari Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-[#7A7A84] hover:text-[#F0F0F2] text-sm leading-none px-1"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk / menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#101013] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981] transition-colors"
          />
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#16161B] text-[#10B981] border border-[#22222A]'
                  : 'text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013]'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingData && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-4 rounded-xl bg-[#101013] border border-[#22222A] animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-[#16161B] rounded" />
                <div className="h-3 w-16 bg-[#16161B] rounded" />
              </div>
              <div className="h-4 w-36 bg-[#16161B] rounded" />
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#16161B]">
                <div className="h-8 bg-[#22222A]/50 rounded" />
                <div className="h-8 bg-[#22222A]/50 rounded" />
                <div className="h-8 bg-[#22222A]/50 rounded" />
                <div className="h-8 bg-[#22222A]/50 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#22222A]">
                <div className="h-6 w-24 bg-[#16161B] rounded" />
                <div className="h-6 w-14 bg-[#16161B] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-[#101013] border border-[#22222A]">
          <Package className="w-10 h-10 text-[#7A7A84] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-[#F0F0F2]">Tidak ada produk ditemukan</h3>
          <p className="text-xs text-[#7A7A84] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak cocok dengan menu manapun.`
              : 'Belum ada produk di katalog usaha Anda. Tambahkan produk pertama Anda sekarang.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 text-xs font-medium text-black bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors"
          >
            Tambah Produk Sekarang
          </button>
        </div>
      ) : (
        /* Products List / Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map(product => {
            const { profit, margin } = calculateProfit(product.selling_price, product.hpp);
            const isLowStock = product.stock <= product.min_stock;

            return (
              <div
                key={product.id}
                className="p-4 rounded-xl bg-[#101013] border border-[#22222A] hover:border-[#33333F] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between text-[11px] text-[#7A7A84] mb-1.5 font-medium">
                    <span>{product.category}</span>
                    {isLowStock ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Stok Menipis
                      </span>
                    ) : (
                      <span className="text-[#10B981]">Stok Aman</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[#F0F0F2] tracking-tight">
                    {product.name}
                  </h3>

                  {/* Price & Profit Specs */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-[#16161B] border border-[#22222A]/60 text-xs">
                    <div>
                      <p className="text-[10px] text-[#7A7A84]">Harga Jual</p>
                      <p className="font-semibold text-[#F0F0F2]">{formatRupiah(product.selling_price)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#7A7A84]">HPP (Modal)</p>
                      <p className="font-medium text-[#7A7A84]">{formatRupiah(product.hpp)}</p>
                    </div>
                    <div className="pt-1 border-t border-[#22222A]/60">
                      <p className="text-[10px] text-[#7A7A84]">Profit / Unit</p>
                      <p className="font-semibold text-[#10B981]">+{formatRupiah(profit)}</p>
                    </div>
                    <div className="pt-1 border-t border-[#22222A]/60">
                      <p className="text-[10px] text-[#7A7A84]">Margin</p>
                      <p className="font-semibold text-[#10B981]">{margin}%</p>
                    </div>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="pt-2 border-t border-[#22222A] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await adjustStock(product.id, -1);
                        } catch (err: any) {
                          setToast({ message: err?.message || 'Gagal mengurangi stok', type: 'error' });
                        }
                      }}
                      className="w-7 h-7 rounded-md bg-[#16161B] hover:bg-[#22222A] text-[#F0F0F2] flex items-center justify-center font-bold text-xs transition-colors"
                      title="Kurangi 1 Stok"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold px-1 text-[#F0F0F2]">
                      {formatNumber(product.stock)}{' '}
                      <span className="text-[10px] text-[#7A7A84] font-normal">{product.unit}</span>
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await adjustStock(product.id, 1);
                        } catch (err: any) {
                          setToast({ message: err?.message || 'Gagal menambah stok', type: 'error' });
                        }
                      }}
                      className="w-7 h-7 rounded-md bg-[#16161B] hover:bg-[#22222A] text-[#F0F0F2] flex items-center justify-center font-bold text-xs transition-colors"
                      title="Tambah 1 Stok"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#16161B] rounded-lg transition-colors"
                      title="Edit Produk"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(product)}
                      className="p-1.5 text-[#7A7A84] hover:text-rose-400 hover:bg-[#16161B] rounded-lg transition-colors"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk / Menu Baru'}
        subtitle="Hitung otomatis profit bersih dan margin keuntungan langsung ke Supabase"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#7A7A84] mb-1">
              Nama Produk / Menu *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Es Kopi Susu Aren, Toast Cokelat"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Kategori
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
              >
                <option value="Minuman Kopi">Minuman Kopi</option>
                <option value="Non-Kopi">Non-Kopi</option>
                <option value="Makanan Berat">Makanan Berat</option>
                <option value="Makanan Ringan">Makanan Ringan</option>
                <option value="Camilan & Dessert">Camilan & Dessert</option>
                <option value="Topping & Tambahan">Topping & Tambahan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Satuan Jual
              </label>
              <input
                type="text"
                placeholder="cup / porsi / pcs / botol"
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* HPP and Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                HPP Modal (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formHpp}
                onChange={e => setFormHpp(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formSellingPrice}
                onChange={e => setFormSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>
          </div>

          {/* Automatic Live Profit and Margin Calculation Box */}
          <div className="p-3 rounded-xl bg-[#101013] border border-[#10B981]/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <div>
                <p className="text-[11px] text-[#7A7A84]">Perhitungan Otomatis:</p>
                <p className="text-xs font-semibold text-[#F0F0F2]">
                  Profit: <span className="text-[#10B981]">+{formatRupiah(liveCalc.profit)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#7A7A84]">Margin Laba:</p>
              <p className="text-xs font-bold text-[#10B981]">{liveCalc.margin}%</p>
            </div>
          </div>

          {/* Stock & Minimum Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Stok Saat Ini
              </label>
              <input
                type="number"
                min="0"
                value={formStock}
                onChange={e => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Batas Minimum Stok
              </label>
              <input
                type="number"
                min="0"
                value={formMinStock}
                onChange={e => setFormMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#22222A] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#7A7A84] hover:text-[#F0F0F2] bg-[#16161B] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-black bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingProduct}
        onClose={() => !isDeleting && setDeletingProduct(null)}
        title="Hapus Produk"
        subtitle="Konfirmasi penghapusan produk dari Supabase"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            Apakah Anda yakin ingin menghapus produk <strong>"{deletingProduct?.name}"</strong>? Data produk ini akan dihapus secara permanen dari Supabase.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22222A]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingProduct(null)}
              className="px-4 py-2 text-xs font-medium text-[#7A7A84] hover:text-[#F0F0F2] bg-[#16161B] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Produk</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
