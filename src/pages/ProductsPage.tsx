import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Product } from '../types';
import { formatRupiah, formatNumber, calculateProfit } from '../utils/formatters';
import { processProductImage } from '../utils/imageStorage';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
  Camera,
  X,
} from 'lucide-react';

export function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, adjustStock, isLoadingData, business, user } = useBusiness();

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
    }, 4000);
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
  const [formImage, setFormImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFormImage('');
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
    setFormImage(p.image_url || p.image || '');
    setIsModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const processedUrl = await processProductImage(file, business?.id, user?.id);
      setFormImage(processedUrl);
    } catch {
      setFormError('Gagal memproses foto. Silakan coba gambar lain.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      image_url: formImage || undefined,
      image: formImage || undefined,
    };

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        setToast({ message: `Produk "${payload.name}" berhasil diperbarui`, type: 'success' });
      } else {
        await addProduct(payload);
        setToast({ message: `Produk "${payload.name}" berhasil ditambahkan`, type: 'success' });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      setToast({ message: `Produk "${deletingProduct.name}" telah dihapus`, type: 'success' });
      setDeletingProduct(null);
    } catch (err: any) {
      setToast({ message: err?.message || 'Gagal menghapus produk', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Katalog Produk & Menu
          </h1>
          <p className="text-xs text-[#8A8A91] mt-0.5">
            Kelola harga jual, modal HPP, dan pantau stok bahan / porsi.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors active:scale-[0.98] select-none shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
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
            type="button"
            onClick={() => setToast(null)}
            className="text-sm leading-none px-1"
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
          <Search className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk / menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#141416] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E] transition-colors"
          />
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none select-none">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
                  : 'text-[#8A8A91] hover:text-[#F5F5F5]'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingData && products.length === 0 ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-4 rounded-xl bg-[#141416] border border-[#242428] animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-[#1C1C20] rounded" />
                <div className="h-3 w-16 bg-[#1C1C20] rounded" />
              </div>
              <div className="h-4 w-36 bg-[#1C1C20] rounded" />
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#1C1C20]">
                <div className="h-7 bg-[#242428]/50 rounded" />
                <div className="h-7 bg-[#242428]/50 rounded" />
                <div className="h-7 bg-[#242428]/50 rounded" />
                <div className="h-7 bg-[#242428]/50 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#242428]">
                <div className="h-6 w-24 bg-[#1C1C20] rounded" />
                <div className="h-6 w-14 bg-[#1C1C20] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-[#141416] border border-[#242428]">
          <Package className="w-8 h-8 text-[#8A8A91] mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Tidak ada produk ditemukan</h3>
          <p className="text-xs text-[#8A8A91] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak cocok dengan menu manapun.`
              : 'Belum ada produk di katalog usaha Anda. Tambahkan produk pertama Anda sekarang.'}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] rounded-lg hover:bg-[#16A34A] transition-colors select-none"
          >
            Tambah Produk Sekarang
          </button>
        </div>
      ) : (
        /* Products List / Grid */
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
          {filteredProducts.map(product => {
            const { profit, margin } = calculateProfit(product.selling_price, product.hpp);
            const isLowStock = product.stock <= product.min_stock;
            const productImage = product.image_url || product.image;

            return (
              <div
                key={product.id}
                className="p-2.5 sm:p-3 rounded-lg bg-[#141416] border border-[#242428] hover:border-[#323238] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#8A8A91] mb-1.5 font-medium">
                    <span>{product.category}</span>
                    {isLowStock ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Stok Menipis
                      </span>
                    ) : (
                      <span className="text-[#8A8A91]">Stok Aman</span>
                    )}
                  </div>

                  {/* Header: Photo Thumbnail (if exists) + Title */}
                  <div className="flex items-start gap-2">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover bg-[#1C1C20] border border-[#242428] shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#1C1C20] border border-[#242428] flex items-center justify-center text-[#8A8A91] shrink-0">
                        <Package className="w-4 h-4 opacity-60" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-xs font-semibold text-[#F5F5F5] tracking-tight line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-[#8A8A91] mt-0.5 tabular-nums">
                        {formatRupiah(product.selling_price)}
                      </p>
                    </div>
                  </div>

                  {/* Price & Profit Specs */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 my-2 p-2 rounded-md bg-[#1C1C20] border border-[#242428] text-[10px]">
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-[#8A8A91]">Harga Jual</p>
                      <p className="font-semibold text-[10px] sm:text-[11px] text-[#F5F5F5] tabular-nums">{formatRupiah(product.selling_price)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] sm:text-[9px] text-[#8A8A91]">HPP (Modal)</p>
                      <p className="font-medium text-[10px] sm:text-[11px] text-[#8A8A91] tabular-nums">{formatRupiah(product.hpp)}</p>
                    </div>
                    <div className="pt-1 border-t border-[#242428] min-w-0">
                      <p className="text-[8px] sm:text-[9px] text-[#8A8A91]">Laba / Porsi</p>
                      <p className="font-semibold text-[10px] sm:text-[11px] text-[#22C55E] tabular-nums truncate">+{formatRupiah(profit)}</p>
                    </div>
                    <div className="pt-1 border-t border-[#242428] min-w-0">
                      <p className="text-[8px] sm:text-[9px] text-[#8A8A91]">Margin</p>
                      <p className="font-semibold text-[10px] sm:text-[11px] text-[#22C55E] tabular-nums">{margin}%</p>
                    </div>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="pt-1.5 border-t border-[#242428] flex items-center justify-between gap-1 select-none">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => adjustStock(product.id, -1)}
                      className="w-6 h-6 rounded-md bg-[#1C1C20] hover:bg-[#242428] active:scale-95 text-[#F5F5F5] flex items-center justify-center font-bold text-[10px] transition-all"
                      title="Kurangi 1 Stok"
                    >
                      -
                    </button>
                    <span className="text-[10px] sm:text-xs font-semibold px-0.5 text-[#F5F5F5] tabular-nums truncate">
                      {formatNumber(product.stock)}{' '}
                      <span className="text-[8px] sm:text-[9px] text-[#8A8A91] font-normal">{product.unit}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustStock(product.id, 1)}
                      className="w-6 h-6 rounded-md bg-[#1C1C20] hover:bg-[#242428] active:scale-95 text-[#F5F5F5] flex items-center justify-center font-bold text-[10px] transition-all"
                      title="Tambah 1 Stok"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="p-1 text-[#8A8A91] hover:text-[#F5F5F5] hover:bg-[#1C1C20] rounded-md transition-colors"
                      title="Edit Produk"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProduct(product)}
                      className="p-1 text-[#8A8A91] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
        subtitle="Kelola harga jual, HPP modal, dan batas stok"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {formError}
            </div>
          )}

          {/* Optional Product Photo Upload */}
          <div className="p-3 rounded-xl bg-[#1C1C20] border border-[#242428] space-y-2">
            <label className="block text-xs font-medium text-[#8A8A91]">
              Foto Produk <span className="text-[8px] sm:text-[9px] text-[#8A8A91] font-normal">(Opsional)</span>
            </label>

            <div className="flex items-center gap-3">
              {formImage ? (
                <div className="relative group">
                  <img
                    src={formImage}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-[#242428]"
                  />
                  <button
                    type="button"
                    onClick={() => setFormImage('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-all"
                    title="Hapus foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#141416] border border-dashed border-[#242428] flex items-center justify-center text-[#8A8A91]">
                  <ImageIcon className="w-6 h-6 opacity-40" />
                </div>
              )}

              <div className="space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-photo-upload"
                />
                <label
                  htmlFor="product-photo-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isUploadingImage
                      ? 'bg-[#141416] text-[#8A8A91] border-[#242428] opacity-60 pointer-events-none'
                      : 'bg-[#141416] text-[#F5F5F5] border-[#242428] hover:bg-[#242428]'
                  }`}
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-[#22C55E]" />
                      <span>{formImage ? 'Ganti Foto' : '+ Tambah Foto'}</span>
                    </>
                  )}
                </label>
                <p className="text-[8px] sm:text-[9px] text-[#8A8A91]">
                  Format JPG, PNG atau WebP (otomatis dioptimalkan).
                </p>
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-medium text-[#8A8A91] mb-1">
              Nama Produk / Menu *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kopi Susu Gula Aren"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Kategori
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
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
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Satuan Jual
              </label>
              <input
                type="text"
                placeholder="cup / porsi / pcs / botol"
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>
          </div>

          {/* HPP and Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                HPP Modal (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formHpp}
                onChange={e => setFormHpp(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formSellingPrice}
                onChange={e => setFormSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>
          </div>

          {/* Live Profit Preview */}
          {(formSellingPrice !== '' || formHpp !== '') && (
            <div className="p-3 rounded-lg bg-[#1C1C20] border border-[#242428] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#8A8A91]">Estimasi Laba Kotor: </span>
                <span className="font-semibold text-[#22C55E] tabular-nums">
                  +{formatRupiah(liveCalc.profit)}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A91]">Margin: </span>
                <span className="font-semibold text-[#22C55E] tabular-nums">
                  {liveCalc.margin}%
                </span>
              </div>
            </div>
          )}

          {/* Stock and Min Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Stok Awal
              </label>
              <input
                type="number"
                min="0"
                value={formStock}
                onChange={e => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Batas Minimum Stok
              </label>
              <input
                type="number"
                min="0"
                value={formMinStock}
                onChange={e => setFormMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#1C1C20] border border-[#242428] rounded-lg text-[#F5F5F5] tabular-nums focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#242428] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#8A8A91] hover:text-[#F5F5F5] bg-[#141416] border border-[#242428] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0B0C]" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}</span>
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
        subtitle="Konfirmasi penghapusan menu dari database"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            Apakah Anda yakin ingin menghapus produk <strong>&quot;{deletingProduct?.name}&quot;</strong>? Riwayat transaksi lama tetap tersimpan.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242428]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingProduct(null)}
              className="px-4 py-2 text-xs font-medium text-[#8A8A91] hover:text-[#F5F5F5] bg-[#141416] border border-[#242428] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Hapus Produk</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
