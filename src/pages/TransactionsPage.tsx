import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Product, PaymentMethod, Transaction } from '../types';
import { formatRupiah, formatDateTime, getTodayDateString } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Receipt,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  Share2,
  Printer,
  DollarSign,
  CreditCard,
  QrCode,
  HelpCircle,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Package,
} from 'lucide-react';

interface CartEntry {
  product: Product;
  quantity: number;
}

export function TransactionsPage() {
  const {
    products,
    transactions,
    createTransaction,
    deleteTransaction,
    profile,
    isLoadingData,
    refreshData,
  } = useBusiness();

  // Active view: 'pos' (Kasir Catat Baru) vs 'history' (Riwayat)
  const [activeView, setActiveView] = useState<'pos' | 'history'>('pos');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // POS State
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [customerName, setCustomerName] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');

  // Completed transaction for receipt modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Delete transaction modal state
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / feedback notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // History filtering
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('all');

  // Categories for POS product selector derived dynamically from products
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products for POS
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchProductQuery.toLowerCase());
      const matchCat = selectedProductCategory === 'all' || p.category === selectedProductCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchProductQuery, selectedProductCategory]);

  // POS Cart Calculations
  const cartSummary = useMemo(() => {
    let totalAmount = 0;
    let totalHpp = 0;
    let totalItems = 0;

    cart.forEach(item => {
      const itemSubtotal = item.quantity * item.product.selling_price;
      const itemHppSubtotal = item.quantity * item.product.hpp;
      totalAmount += itemSubtotal;
      totalHpp += itemHppSubtotal;
      totalItems += item.quantity;
    });

    const profit = totalAmount - totalHpp;
    const margin = totalAmount > 0 ? Math.round((profit / totalAmount) * 1000) / 10 : 0;

    return { totalAmount, totalHpp, profit, margin, totalItems };
  }, [cart]);

  // Add product to cart with strict stock limit
  const addToCart = (product: Product) => {
    const currentProd = products.find(p => p.id === product.id) || product;
    if (currentProd.stock <= 0) {
      setToast({
        message: `Stok produk "${product.name}" habis.`,
        type: 'error',
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= currentProd.stock) {
          setToast({
            message: `Maksimal stok tersedia untuk "${product.name}" adalah ${currentProd.stock} ${currentProd.unit}.`,
            type: 'error',
          });
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, product: currentProd }
            : item
        );
      }
      return [...prev, { product: currentProd, quantity: 1 }];
    });
  };

  // Adjust cart item quantity with strict stock limit
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;

      const currentProd = products.find(p => p.id === productId) || item.product;

      if (delta > 0 && item.quantity + delta > currentProd.stock) {
        setToast({
          message: `Stok tidak mencukupi. Maksimal ${currentProd.stock} ${currentProd.unit} untuk "${item.product.name}".`,
          type: 'error',
        });
        return prev;
      }

      return prev
        .map(entry => {
          if (entry.product.id === productId) {
            const newQty = entry.quantity + delta;
            return newQty > 0 ? { ...entry, quantity: newQty, product: currentProd } : null;
          }
          return entry;
        })
        .filter(Boolean) as CartEntry[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setTransactionNotes('');
  };

  // Submit Transaction safely
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isCheckingOut) return;

    for (const item of cart) {
      const liveProd = products.find(p => p.id === item.product.id);
      const available = liveProd ? liveProd.stock : item.product.stock;
      if (item.quantity > available) {
        setToast({
          message: `Stok "${item.product.name}" tidak mencukupi (Tersedia: ${available}, Di keranjang: ${item.quantity}).`,
          type: 'error',
        });
        return;
      }
    }

    setIsCheckingOut(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        unit_hpp: item.product.hpp,
        subtotal: item.quantity * item.product.selling_price,
      }));

      const newTx = await createTransaction({
        items,
        total_amount: cartSummary.totalAmount,
        total_hpp: cartSummary.totalHpp,
        profit: cartSummary.profit,
        payment_method: paymentMethod,
        date: new Date().toISOString(),
        customer_name: customerName.trim() || undefined,
        notes: transactionNotes.trim() || undefined,
      });

      if (newTx) {
        clearCart();
        setReceiptTx(newTx);
        setToast({
          message: `Transaksi ${newTx.invoice_number} berhasil dicatat!`,
          type: 'success',
        });
        await refreshData();
      }
    } catch (err: any) {
      setToast({
        message: err?.message || 'Gagal menyimpan transaksi',
        type: 'error',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDeleteTransactionConfirm = async () => {
    if (!deletingTx || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTx.id);
      setToast({
        message: `Nota transaksi ${deletingTx.invoice_number} berhasil dihapus.`,
        type: 'success',
      });
      setDeletingTx(null);
      await refreshData();
    } catch (err: any) {
      setToast({
        message: err?.message || 'Gagal menghapus transaksi',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const todayStr = getTodayDateString();

    return transactions.filter(t => {
      const matchSearch =
        (t.invoice_number || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(historySearch.toLowerCase())) ||
        (Array.isArray(t.items) && t.items.some(i => i.product_name.toLowerCase().includes(historySearch.toLowerCase())));

      const matchMethod = historyMethodFilter === 'all' || t.payment_method === historyMethodFilter;

      let matchDate = true;
      const txDateStr = t.date ? t.date.split('T')[0] : '';
      if (historyDateFilter === 'today') {
        matchDate = txDateStr === todayStr;
      } else if (historyDateFilter === '7days') {
        const diffDays = (Date.now() - new Date(t.date || Date.now()).getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 7;
      } else if (historyDateFilter === 'month') {
        const thisMonth = new Date().toISOString().slice(0, 7);
        matchDate = txDateStr.startsWith(thisMonth);
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [transactions, historySearch, historyMethodFilter, historyDateFilter]);

  const generateWaShareText = (tx: Transaction) => {
    const itemsList = tx.items
      .map(i => `• ${i.product_name} (${i.quantity}x) = ${formatRupiah(i.subtotal)}`)
      .join('\n');

    return encodeURIComponent(
      `*STRUK PEMBELIAN - ${profile.business_name}*\n` +
      `No. Nota: ${tx.invoice_number}\n` +
      `Tanggal: ${formatDateTime(tx.date)}\n` +
      `${tx.customer_name ? `Pelanggan: ${tx.customer_name}\n` : ''}` +
      `--------------------------------\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `*Total: ${formatRupiah(tx.total_amount)}*\n` +
      `Metode: ${tx.payment_method.toUpperCase()}\n\n` +
      `${profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}`
    );
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Kasir & Transaksi
          </h1>
          <p className="text-xs text-[#8A8A91] mt-0.5">
            Pencatatan kasir instan, kalkulasi laba kotor, dan riwayat penjualan.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#141416] border border-[#242428] rounded-lg">
          <button
            type="button"
            onClick={() => setActiveView('pos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === 'pos'
                ? 'bg-[#1C1C20] text-[#F5F5F5]'
                : 'text-[#8A8A91] hover:text-[#F5F5F5]'
            }`}
          >
            Kasir / Catat Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === 'history'
                ? 'bg-[#1C1C20] text-[#F5F5F5]'
                : 'text-[#8A8A91] hover:text-[#F5F5F5]'
            }`}
          >
            Riwayat Penjualan ({transactions.length})
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
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
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-[#8A8A91] hover:text-[#F5F5F5] text-sm leading-none px-1"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      )}

      {activeView === 'pos' ? (
        /* KASIR / POS MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Left Column: Product Selector (Col 7) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari menu pesanan..."
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#141416] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedProductCategory(cat)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      selectedProductCategory === cat
                        ? 'bg-[#141416] text-[#F5F5F5] border border-[#242428]'
                        : 'text-[#8A8A91] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {cat === 'all' ? 'Semua' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Selector Grid */}
            {isLoadingData && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="p-3 rounded-xl bg-[#141416] border border-[#242428] animate-pulse h-28 space-y-2">
                    <div className="h-3 w-16 bg-[#1C1C20] rounded" />
                    <div className="h-4 w-24 bg-[#1C1C20] rounded" />
                    <div className="h-3 w-20 bg-[#1C1C20] rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#141416] border border-[#242428]">
                <Package className="w-8 h-8 text-[#8A8A91] mx-auto mb-2 opacity-40" />
                <p className="text-xs text-[#8A8A91]">
                  {searchProductQuery
                    ? `Tidak ada menu yang cocok dengan "${searchProductQuery}".`
                    : 'Belum ada produk di katalog usaha. Tambahkan produk di menu Produk.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredProducts.map(product => {
                  const inCart = cart.find(c => c.product.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isMaxInCart = inCart ? inCart.quantity >= product.stock : false;
                  const prodImg = product.image_url || product.image;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOutOfStock || isMaxInCart}
                      onClick={() => addToCart(product)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                        isOutOfStock
                          ? 'opacity-40 bg-[#141416] border-[#242428] cursor-not-allowed'
                          : isMaxInCart
                          ? 'bg-[#1C1C20] border-amber-500/40'
                          : inCart
                          ? 'bg-[#1C1C20] border-[#22C55E]/50'
                          : 'bg-[#141416] border-[#242428] hover:border-[#323238]'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#22C55E] text-[#0B0B0C] font-bold text-[10px] flex items-center justify-center tabular-nums">
                          {inCart.quantity}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <p className="text-[#8A8A91] font-medium">{product.category}</p>
                          {isOutOfStock ? (
                            <span className="text-red-400 font-semibold text-[9px]">Habis</span>
                          ) : isMaxInCart ? (
                            <span className="text-amber-400 font-semibold text-[9px]">Max Stok</span>
                          ) : null}
                        </div>

                        <div className="flex items-start gap-2">
                          {prodImg ? (
                            <img
                              src={prodImg}
                              alt={product.name}
                              className="w-9 h-9 rounded-md object-cover bg-[#1C1C20] border border-[#242428] shrink-0 mt-0.5"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-[#1C1C20] border border-[#242428] flex items-center justify-center text-[#8A8A91] shrink-0 mt-0.5">
                              <Package className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                          <h4 className="text-xs font-semibold text-[#F5F5F5] line-clamp-2 leading-tight">
                            {product.name}
                          </h4>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#242428]/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F5F5F5] tabular-nums">
                          {formatRupiah(product.selling_price)}
                        </span>
                        <span className={`text-[10px] tabular-nums ${isOutOfStock ? 'text-red-400' : 'text-[#8A8A91]'}`}>
                          {product.stock} {product.unit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Order Cart & Checkout (Col 5) */}
          <div className="lg:col-span-5">
            <div className="p-4 sm:p-5 rounded-xl bg-[#141416] border border-[#242428] sticky top-20 flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#242428]">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#8A8A91]" />
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">
                      Keranjang Pesanan ({cartSummary.totalItems})
                    </h3>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs text-[#8A8A91] hover:text-red-400 transition-colors"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>

                {/* Items in Cart */}
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#8A8A91]">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#8A8A91]" />
                    <p>Keranjang masih kosong.</p>
                    <p className="text-[11px] mt-0.5">Pilih menu di samping untuk menambah pesanan.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#242428]/60 max-h-52 overflow-y-auto py-2 pr-1">
                    {cart.map(item => {
                      const currentProd = products.find(p => p.id === item.product.id) || item.product;
                      const isMax = item.quantity >= currentProd.stock;
                      const cartProdImg = item.product.image_url || item.product.image;

                      return (
                        <div key={item.product.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {cartProdImg ? (
                              <img
                                src={cartProdImg}
                                alt={item.product.name}
                                className="w-8 h-8 rounded-md object-cover bg-[#1C1C20] border border-[#242428] shrink-0"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#F5F5F5] truncate">{item.product.name}</p>
                              <p className="text-[11px] text-[#8A8A91] tabular-nums">
                                {formatRupiah(item.product.selling_price)} / {item.product.unit}
                                <span className="ml-1 text-[10px] text-[#8A8A91]">(Sisa: {currentProd.stock})</span>
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="w-6 h-6 rounded bg-[#1C1C20] hover:bg-[#242428] text-[#F5F5F5] flex items-center justify-center font-bold text-xs transition-colors"
                              title="Kurangi jumlah"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-semibold text-[#F5F5F5] tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isMax}
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                                isMax
                                  ? 'bg-[#1C1C20] opacity-40 cursor-not-allowed text-[#8A8A91]'
                                  : 'bg-[#1C1C20] hover:bg-[#242428] text-[#F5F5F5]'
                              }`}
                              title={isMax ? 'Maksimal stok tercapai' : 'Tambah jumlah'}
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right min-w-[70px] shrink-0">
                            <p className="font-semibold text-[#F5F5F5] tabular-nums">
                              {formatRupiah(item.quantity * item.product.selling_price)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[#8A8A91] hover:text-red-400 p-1 transition-colors"
                            title="Hapus dari keranjang"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckout} className="pt-3 border-t border-[#242428] space-y-3">
                {/* Customer name and notes */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pelanggan (opsional)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                  />
                  <input
                    type="text"
                    placeholder="Catatan / Meja (opsional)"
                    value={transactionNotes}
                    onChange={e => setTransactionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <p className="text-[11px] font-medium text-[#8A8A91] mb-1.5">Metode Pembayaran:</p>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === 'qris'
                          ? 'bg-[#1C1C20] border-[#22C55E] text-[#F5F5F5]'
                          : 'bg-[#141416] border-[#242428] text-[#8A8A91] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span className="text-[10px]">QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === 'cash'
                          ? 'bg-[#1C1C20] border-[#22C55E] text-[#F5F5F5]'
                          : 'bg-[#141416] border-[#242428] text-[#8A8A91] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span className="text-[10px]">Cash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === 'transfer'
                          ? 'bg-[#1C1C20] border-[#22C55E] text-[#F5F5F5]'
                          : 'bg-[#141416] border-[#242428] text-[#8A8A91] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[10px]">Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('other')}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === 'other'
                          ? 'bg-[#1C1C20] border-[#22C55E] text-[#F5F5F5]'
                          : 'bg-[#141416] border-[#242428] text-[#8A8A91] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-[10px]">Lainnya</span>
                    </button>
                  </div>
                </div>

                {/* Subtotal & Profit preview */}
                <div className="p-2.5 rounded-lg bg-[#1C1C20] border border-[#242428] space-y-1 text-xs">
                  <div className="flex justify-between text-[#8A8A91]">
                    <span>Subtotal Penjualan</span>
                    <span className="font-semibold text-[#F5F5F5] tabular-nums">{formatRupiah(cartSummary.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#8A8A91]">
                    <span>Estimasi Laba Kotor</span>
                    <span className="text-[#22C55E] font-medium tabular-nums">
                      +{formatRupiah(cartSummary.profit)} ({cartSummary.margin}%)
                    </span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-2.5 px-4 text-xs font-bold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0B0B0C]" />
                      <span>Menyimpan Transaksi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span className="tabular-nums">Selesaikan ({formatRupiah(cartSummary.totalAmount)})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* RIWAYAT TRANSAKSI MODE */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nota, pelanggan, atau menu..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#141416] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1 p-1 bg-[#141416] border border-[#242428] rounded-lg">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari' },
                  { id: 'month', label: 'Bulan Ini' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHistoryDateFilter(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      historyDateFilter === opt.id
                        ? 'bg-[#1C1C20] text-[#F5F5F5]'
                        : 'text-[#8A8A91] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Method filter */}
              <select
                value={historyMethodFilter}
                onChange={e => setHistoryMethodFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#141416] border border-[#242428] rounded-lg text-[#F5F5F5] focus:outline-hidden focus:border-[#22C55E]"
              >
                <option value="all">Semua Metode</option>
                <option value="qris">QRIS</option>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Transactions Table with Loading & Empty State */}
          {isLoadingData && transactions.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#141416] border border-[#242428] space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-9 bg-[#1C1C20] rounded-lg" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center rounded-xl bg-[#141416] border border-[#242428]">
              <Receipt className="w-8 h-8 text-[#8A8A91] mx-auto mb-2 opacity-40" />
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Tidak ada transaksi ditemukan</h3>
              <p className="text-xs text-[#8A8A91] mt-1">
                Ubah filter atau catat penjualan baru di kasir.
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 rounded-xl bg-[#141416] border border-[#242428] overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="text-[#8A8A91] border-b border-[#242428] font-medium">
                  <tr>
                    <th className="pb-2.5 px-3">No. Nota</th>
                    <th className="pb-2.5 px-3">Waktu</th>
                    <th className="pb-2.5 px-3">Pelanggan</th>
                    <th className="pb-2.5 px-3">Pesanan</th>
                    <th className="pb-2.5 px-3">Metode</th>
                    <th className="pb-2.5 px-3 text-right">Total</th>
                    <th className="pb-2.5 px-3 text-right">Laba Kotor</th>
                    <th className="pb-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242428]/60">
                  {filteredHistory.map(tx => (
                    <tr key={tx.id} className="hover:bg-[#1C1C20]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#F5F5F5]">
                        {tx.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 text-[#8A8A91] whitespace-nowrap tabular-nums">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="py-2.5 px-3 text-[#F5F5F5]">
                        {tx.customer_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[#F5F5F5] max-w-[200px] truncate">
                        {Array.isArray(tx.items) && tx.items.length > 0
                          ? tx.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')
                          : '-'}
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
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReceiptTx(tx)}
                            className="p-1.5 text-[#8A8A91] hover:text-[#F5F5F5] hover:bg-[#1C1C20] rounded-md transition-colors"
                            title="Lihat Struk"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="p-1.5 text-[#8A8A91] hover:text-red-400 hover:bg-[#1C1C20] rounded-md transition-colors"
                            title="Hapus Nota"
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
      )}

      {/* Digital Receipt / Struk Modal */}
      {receiptTx && (
        <Modal
          isOpen={true}
          onClose={() => setReceiptTx(null)}
          title="Struk Penjualan Digital"
          subtitle={receiptTx.invoice_number}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            {/* Business header */}
            <div className="text-center pb-3 border-b border-[#242428] space-y-0.5">
              <h4 className="font-bold text-sm text-[#F5F5F5]">{profile.business_name || 'Kedai UMKM'}</h4>
              <p className="text-[11px] text-[#8A8A91]">{profile.address || 'Kedai F&B'}</p>
              {profile.phone && <p className="text-[10px] text-[#8A8A91]">Telp/WA: {profile.phone}</p>}
            </div>

            {/* Meta */}
            <div className="space-y-1 text-[#8A8A91] text-[11px]">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-mono text-[#F5F5F5]">{receiptTx.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span className="text-[#F5F5F5] tabular-nums">{formatDateTime(receiptTx.date)}</span>
              </div>
              {receiptTx.customer_name && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="text-[#F5F5F5]">{receiptTx.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="uppercase text-[#F5F5F5] font-semibold">{receiptTx.payment_method}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2 border-y border-[#242428] divide-y divide-[#242428]/50">
              {receiptTx.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <div>
                    <p className="font-medium text-[#F5F5F5]">{item.product_name}</p>
                    <p className="text-[10px] text-[#8A8A91] tabular-nums">
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#F5F5F5] tabular-nums">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-sm font-bold text-[#F5F5F5]">
                <span>Total Bayar</span>
                <span className="tabular-nums">{formatRupiah(receiptTx.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#22C55E]">
                <span>Laba Kotor</span>
                <span className="tabular-nums">+{formatRupiah(receiptTx.profit)}</span>
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center pt-2 text-[10px] text-[#8A8A91]">
              <p>{profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}</p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#242428] grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 rounded-lg bg-[#141416] hover:bg-[#1C1C20] border border-[#242428] text-[#F5F5F5] flex items-center justify-center gap-1.5 font-medium transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>

              <a
                href={`https://wa.me/?text=${generateWaShareText(receiptTx)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0B0C] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTx}
        onClose={() => !isDeleting && setDeletingTx(null)}
        title="Hapus Nota Transaksi"
        subtitle="Konfirmasi penghapusan data penjualan"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            Apakah Anda yakin ingin menghapus nota transaksi <strong>{deletingTx?.invoice_number}</strong> senilai <strong className="tabular-nums">{formatRupiah(deletingTx?.total_amount || 0)}</strong>? Data penjualan akan dihapus secara permanen.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#242428]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingTx(null)}
              className="px-4 py-2 text-xs font-medium text-[#8A8A91] hover:text-[#F5F5F5] bg-[#141416] border border-[#242428] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteTransactionConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Hapus Transaksi</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
