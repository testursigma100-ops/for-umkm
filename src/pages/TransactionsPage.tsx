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
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // History filtering
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('all'); // all, today, 7days, month

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
        message: `Stok produk "${product.name}" habis. Tambahkan stok terlebih dahulu.`,
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

  // Submit Transaction to Supabase safely
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isCheckingOut) return;

    // Validate available stock before checkout
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
          message: `Transaksi ${newTx.invoice_number} berhasil dicatat ke Supabase!`,
          type: 'success',
        });
        refreshData().catch(err => console.error('Error refreshing data after sale:', err));
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setToast({
        message: err?.message || 'Gagal menyimpan transaksi ke Supabase',
        type: 'error',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Delete transaction confirm handler
  const handleDeleteTransactionConfirm = async () => {
    if (!deletingTx) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTx.id);
      setToast({
        message: `Nota transaksi ${deletingTx.invoice_number} berhasil dihapus dari Supabase`,
        type: 'success',
      });
      setDeletingTx(null);
      refreshData().catch(err => console.error('Error refreshing after delete:', err));
    } catch (err: any) {
      setToast({
        message: err?.message || 'Gagal menghapus transaksi dari Supabase',
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
      // Search
      const matchSearch =
        (t.invoice_number || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(historySearch.toLowerCase())) ||
        (Array.isArray(t.items) && t.items.some(i => i.product_name.toLowerCase().includes(historySearch.toLowerCase())));

      // Method
      const matchMethod = historyMethodFilter === 'all' || t.payment_method === historyMethodFilter;

      // Date
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

  // Generate WhatsApp Share text for receipt
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
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2]">
            Transaksi Penjualan
          </h1>
          <p className="text-xs text-[#7A7A84] mt-0.5">
            Pencatatan kasir instan, subtotal otomatis, dan sinkronisasi stok Supabase.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#101013] border border-[#22222A] rounded-lg">
          <button
            onClick={() => setActiveView('pos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === 'pos'
                ? 'bg-[#16161B] text-[#10B981] shadow-xs'
                : 'text-[#7A7A84] hover:text-[#F0F0F2]'
            }`}
          >
            Kasir / Catat Baru
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === 'history'
                ? 'bg-[#16161B] text-[#10B981] shadow-xs'
                : 'text-[#7A7A84] hover:text-[#F0F0F2]'
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

      {activeView === 'pos' ? (
        /* KASIR / POS MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Product Selector (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik nama menu..."
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#101013] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedProductCategory(cat)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      selectedProductCategory === cat
                        ? 'bg-[#16161B] text-[#10B981] border border-[#22222A]'
                        : 'text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013]'
                    }`}
                  >
                    {cat === 'all' ? 'Semua' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Selector Grid with Loading & Empty State */}
            {isLoadingData && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="p-3 rounded-xl bg-[#101013] border border-[#22222A] animate-pulse h-28 space-y-2">
                    <div className="h-3 w-16 bg-[#16161B] rounded" />
                    <div className="h-4 w-24 bg-[#16161B] rounded" />
                    <div className="h-3 w-20 bg-[#16161B] rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#101013] border border-[#22222A]">
                <Package className="w-8 h-8 text-[#7A7A84] mx-auto mb-2 opacity-40" />
                <p className="text-xs text-[#7A7A84]">
                  {searchProductQuery
                    ? `Tidak ada menu yang cocok dengan "${searchProductQuery}".`
                    : 'Belum ada produk di katalog usaha. Tambahkan produk di menu Produk.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredProducts.map(product => {
                  const inCart = cart.find(c => c.product.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isMaxInCart = inCart ? inCart.quantity >= product.stock : false;

                  return (
                    <button
                      key={product.id}
                      disabled={isOutOfStock || isMaxInCart}
                      onClick={() => addToCart(product)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                        isOutOfStock
                          ? 'opacity-40 bg-[#101013] border-[#22222A] cursor-not-allowed'
                          : isMaxInCart
                          ? 'bg-[#16161B] border-amber-500/40 shadow-xs'
                          : inCart
                          ? 'bg-[#16161B] border-[#10B981]/50 shadow-xs'
                          : 'bg-[#101013] border-[#22222A] hover:border-[#33333F]'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#10B981] text-black font-bold text-[11px] flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <p className="text-[#7A7A84] font-medium">{product.category}</p>
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-semibold text-[9px]">Habis</span>
                          ) : isMaxInCart ? (
                            <span className="text-amber-400 font-semibold text-[9px]">Max Stok</span>
                          ) : null}
                        </div>
                        <h4 className="text-xs font-semibold text-[#F0F0F2] line-clamp-2">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#22222A]/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F0F0F2]">
                          {formatRupiah(product.selling_price)}
                        </span>
                        <span className={`text-[10px] ${isOutOfStock ? 'text-rose-400' : 'text-[#7A7A84]'}`}>
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
            <div className="p-4 sm:p-5 rounded-xl bg-[#101013] border border-[#22222A] sticky top-20 flex flex-col justify-between min-h-[520px]">
              <div>
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#22222A]">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#10B981]" />
                    <h3 className="text-sm font-semibold text-[#F0F0F2]">
                      Keranjang Pesanan ({cartSummary.totalItems})
                    </h3>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-[#7A7A84] hover:text-rose-400 transition-colors"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>

                {/* Items in Cart */}
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A7A84]">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Keranjang masih kosong.</p>
                    <p className="text-[11px] mt-1">Pilih menu di sebelah kiri untuk menambah pesanan.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#22222A]/60 max-h-56 overflow-y-auto py-2 pr-1">
                    {cart.map(item => {
                      const currentProd = products.find(p => p.id === item.product.id) || item.product;
                      const isMax = item.quantity >= currentProd.stock;

                      return (
                        <div key={item.product.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#F0F0F2] truncate">{item.product.name}</p>
                            <p className="text-[11px] text-[#7A7A84]">
                              {formatRupiah(item.product.selling_price)} / {item.product.unit}
                              <span className="ml-1 text-[10px] text-[#7A7A84]/70">(Sisa: {currentProd.stock})</span>
                            </p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="w-6 h-6 rounded bg-[#16161B] hover:bg-[#22222A] text-[#F0F0F2] flex items-center justify-center font-bold text-xs transition-colors"
                              title="Kurangi jumlah"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-semibold text-[#F0F0F2]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isMax}
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                                isMax
                                  ? 'bg-[#16161B] opacity-40 cursor-not-allowed text-[#7A7A84]'
                                  : 'bg-[#16161B] hover:bg-[#22222A] text-[#F0F0F2]'
                              }`}
                              title={isMax ? 'Maksimal stok tercapai' : 'Tambah jumlah'}
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right min-w-[70px] shrink-0">
                            <p className="font-semibold text-[#F0F0F2]">
                              {formatRupiah(item.quantity * item.product.selling_price)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[#7A7A84] hover:text-rose-400 p-1 transition-colors"
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
              <form onSubmit={handleCheckout} className="pt-4 border-t border-[#22222A] space-y-3">
                {/* Customer name and notes */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pelanggan (opsional)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                  />
                  <input
                    type="text"
                    placeholder="Catatan / Meja (opsional)"
                    value={transactionNotes}
                    onChange={e => setTransactionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <p className="text-[11px] font-medium text-[#7A7A84] mb-1.5">Metode Pembayaran:</p>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                        paymentMethod === 'qris'
                          ? 'bg-[#16161B] border-[#10B981] text-[#10B981]'
                          : 'bg-[#101013] border-[#22222A] text-[#7A7A84] hover:text-[#F0F0F2]'
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
                          ? 'bg-[#16161B] border-[#10B981] text-[#10B981]'
                          : 'bg-[#101013] border-[#22222A] text-[#7A7A84] hover:text-[#F0F0F2]'
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
                          ? 'bg-[#16161B] border-[#10B981] text-[#10B981]'
                          : 'bg-[#101013] border-[#22222A] text-[#7A7A84] hover:text-[#F0F0F2]'
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
                          ? 'bg-[#16161B] border-[#10B981] text-[#10B981]'
                          : 'bg-[#101013] border-[#22222A] text-[#7A7A84] hover:text-[#F0F0F2]'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-[10px]">Lainnya</span>
                    </button>
                  </div>
                </div>

                {/* Subtotal & Profit preview */}
                <div className="p-3 rounded-lg bg-[#16161B] border border-[#22222A]/60 space-y-1 text-xs">
                  <div className="flex justify-between text-[#7A7A84]">
                    <span>Subtotal Penjualan</span>
                    <span className="font-semibold text-[#F0F0F2]">{formatRupiah(cartSummary.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#7A7A84]">
                    <span>Estimasi Laba Kotor</span>
                    <span className="text-[#10B981] font-medium">
                      +{formatRupiah(cartSummary.profit)} ({cartSummary.margin}%)
                    </span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="submit"
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Menyimpan ke Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Selesaikan Transaksi ({formatRupiah(cartSummary.totalAmount)})</span>
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
              <Search className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nota, pelanggan, atau menu..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#101013] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1 p-1 bg-[#101013] border border-[#22222A] rounded-lg">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari' },
                  { id: 'month', label: 'Bulan Ini' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setHistoryDateFilter(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      historyDateFilter === opt.id
                        ? 'bg-[#16161B] text-[#10B981]'
                        : 'text-[#7A7A84] hover:text-[#F0F0F2]'
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
                className="px-2.5 py-2 text-xs bg-[#101013] border border-[#22222A] rounded-lg text-[#F0F0F2] focus:outline-hidden focus:border-[#10B981]"
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
            <div className="p-6 rounded-xl bg-[#101013] border border-[#22222A] space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-[#16161B] rounded-lg" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#101013] border border-[#22222A]">
              <Receipt className="w-10 h-10 text-[#7A7A84] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-[#F0F0F2]">Tidak ada transaksi ditemukan</h3>
              <p className="text-xs text-[#7A7A84] mt-1">
                Ubah filter atau catat penjualan baru di kasir.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#101013] border border-[#22222A] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[#7A7A84] border-b border-[#22222A] font-medium">
                  <tr>
                    <th className="pb-3 px-3">No. Nota</th>
                    <th className="pb-3 px-3">Tanggal & Waktu</th>
                    <th className="pb-3 px-3">Pelanggan</th>
                    <th className="pb-3 px-3">Detail Pesanan</th>
                    <th className="pb-3 px-3">Metode</th>
                    <th className="pb-3 px-3 text-right">Total Penjualan</th>
                    <th className="pb-3 px-3 text-right">Laba Kotor</th>
                    <th className="pb-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22222A]/60">
                  {filteredHistory.map(tx => (
                    <tr key={tx.id} className="hover:bg-[#16161B]/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-[#F0F0F2]">
                        {tx.invoice_number}
                      </td>
                      <td className="py-3 px-3 text-[#7A7A84] whitespace-nowrap">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="py-3 px-3 text-[#F0F0F2]">
                        {tx.customer_name || '-'}
                      </td>
                      <td className="py-3 px-3 text-[#F0F0F2] max-w-[220px] truncate">
                        {Array.isArray(tx.items) && tx.items.length > 0
                          ? tx.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')
                          : '-'}
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-semibold text-[#7A7A84]">
                        {tx.payment_method}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#F0F0F2]">
                        {formatRupiah(tx.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#10B981]">
                        +{formatRupiah(tx.profit)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setReceiptTx(tx)}
                            className="p-1.5 text-[#10B981] hover:bg-[#16161B] rounded-md transition-colors"
                            title="Lihat Struk"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="p-1.5 text-[#7A7A84] hover:text-rose-400 hover:bg-[#16161B] rounded-md transition-colors"
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
            {/* Business header inside receipt */}
            <div className="text-center pb-3 border-b border-[#22222A] space-y-1">
              <h4 className="font-bold text-sm text-[#F0F0F2]">{profile.business_name}</h4>
              <p className="text-[11px] text-[#7A7A84]">{profile.address || 'Kedai UMKM'}</p>
              <p className="text-[10px] text-[#7A7A84]">WA: {profile.phone || '-'}</p>
            </div>

            {/* Meta */}
            <div className="space-y-1 text-[#7A7A84] text-[11px]">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-mono text-[#F0F0F2]">{receiptTx.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span className="text-[#F0F0F2]">{formatDateTime(receiptTx.date)}</span>
              </div>
              {receiptTx.customer_name && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="text-[#F0F0F2]">{receiptTx.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Metode Bayar:</span>
                <span className="uppercase text-[#10B981] font-semibold">{receiptTx.payment_method}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2 border-y border-[#22222A] divide-y divide-[#22222A]/50">
              {receiptTx.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <div>
                    <p className="font-medium text-[#F0F0F2]">{item.product_name}</p>
                    <p className="text-[10px] text-[#7A7A84]">
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#F0F0F2]">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-sm font-bold text-[#F0F0F2]">
                <span>Total Bayar</span>
                <span>{formatRupiah(receiptTx.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#10B981]">
                <span>Laba Kotor</span>
                <span>+{formatRupiah(receiptTx.profit)}</span>
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center pt-2 text-[10px] text-[#7A7A84]">
              <p>{profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}</p>
            </div>

            {/* Actions: Print and Share to WhatsApp */}
            <div className="pt-3 border-t border-[#22222A] grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 rounded-lg bg-[#16161B] hover:bg-[#22222A] text-[#F0F0F2] flex items-center justify-center gap-1.5 font-medium transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>

              <a
                href={`https://wa.me/?text=${generateWaShareText(receiptTx)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-semibold flex items-center justify-center gap-1.5 transition-colors"
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
        subtitle="Konfirmasi penghapusan data penjualan dari Supabase"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            Apakah Anda yakin ingin menghapus nota transaksi <strong>{deletingTx?.invoice_number}</strong> senilai <strong>{formatRupiah(deletingTx?.total_amount || 0)}</strong>? Data penjualan dan item terkait akan dihapus secara permanen dari Supabase.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22222A]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingTx(null)}
              className="px-4 py-2 text-xs font-medium text-[#7A7A84] hover:text-[#F0F0F2] bg-[#16161B] rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteTransactionConfirm}
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
                  <span>Hapus Transaksi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
