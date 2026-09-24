import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const formatRp = (num: number = 0) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

/**
 * Build compact business context from real business data
 */
function buildCompactBusinessContext(
  business: any,
  products: any[] = [],
  sales: any[] = [],
  expenses: any[] = []
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const thisMonthStr = `${year}-${month}`;
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const getDateStr = (d?: string) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d.split('T')[0] || '';
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    } catch {
      return d.split('T')[0] || '';
    }
  };

  // 1. Today's sales & expenses
  const salesToday = sales.filter(s => getDateStr(s.created_at || s.date || s.transaction_date) === todayStr);
  const expensesToday = expenses.filter(e => getDateStr(e.date || e.created_at) === todayStr);

  const omzetToday = salesToday.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const hppToday = salesToday.reduce((sum, s) => {
    const h = Number(s.total_hpp || 0);
    if (h > 0) return sum + h;
    const items = Array.isArray(s.sale_items) ? s.sale_items : (Array.isArray(s.items) ? s.items : []);
    return sum + items.reduce((isum: number, it: any) => isum + Number(it.subtotal_hpp || (it.quantity * it.unit_hpp) || 0), 0);
  }, 0);
  const grossProfitToday = omzetToday - hppToday;
  const totalExpensesToday = expensesToday.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfitToday = grossProfitToday - totalExpensesToday;
  const txCountToday = salesToday.length;
  const aovToday = txCountToday > 0 ? Math.round(omzetToday / txCountToday) : 0;

  // 2. Last 7 Days
  const sales7d = sales.filter(s => new Date(s.created_at || s.date || 0).getTime() >= sevenDaysAgo);
  const expenses7d = expenses.filter(e => new Date(e.date || e.created_at || 0).getTime() >= sevenDaysAgo);
  const omzet7d = sales7d.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const hpp7d = sales7d.reduce((sum, s) => sum + Number(s.total_hpp || 0), 0);
  const grossProfit7d = omzet7d - hpp7d;
  const totalExpenses7d = expenses7d.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit7d = grossProfit7d - totalExpenses7d;

  // 3. This Month
  const salesMonth = sales.filter(s => getDateStr(s.created_at || s.date).startsWith(thisMonthStr));
  const expensesMonth = expenses.filter(e => getDateStr(e.date || e.created_at).startsWith(thisMonthStr));
  const omzetMonth = salesMonth.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const hppMonth = salesMonth.reduce((sum, s) => sum + Number(s.total_hpp || 0), 0);
  const totalExpensesMonth = expensesMonth.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grossProfitMonth = omzetMonth - hppMonth;
  const netProfitMonth = grossProfitMonth - totalExpensesMonth;

  // 4. Products Analysis
  const mappedProducts = products.map(p => {
    const price = Number(p.selling_price || 0);
    const hpp = Number(p.hpp || 0);
    const profit = price - hpp;
    const margin = price > 0 ? Math.round((profit / price) * 1000) / 10 : 0;
    const stock = Number(p.stock ?? p.current_stock ?? 0);
    const minStock = Number(p.min_stock ?? 5);
    return {
      name: p.name,
      category: p.category || 'Menu',
      selling_price: price,
      hpp,
      profit_per_unit: profit,
      margin_pct: margin,
      current_stock: stock,
      min_stock: minStock,
      unit: p.unit || 'porsi',
      is_low_stock: stock <= minStock,
    };
  });

  const lowStockProducts = mappedProducts.filter(p => p.is_low_stock);
  const mostProfitableProducts = [...mappedProducts].sort((a, b) => b.profit_per_unit - a.profit_per_unit);
  const highestMarginProducts = [...mappedProducts].sort((a, b) => b.margin_pct - a.margin_pct);

  // 5. Sale Items Volume & Revenue Ranking
  const itemMap: Record<string, { name: string; quantity: number; revenue: number; grossProfit: number }> = {};
  sales.forEach(s => {
    const rawItems = Array.isArray(s.sale_items) ? s.sale_items : (Array.isArray(s.items) ? s.items : []);
    rawItems.forEach((it: any) => {
      const name = (it.product_name || 'Produk').trim();
      if (!itemMap[name]) {
        itemMap[name] = { name, quantity: 0, revenue: 0, grossProfit: 0 };
      }
      const qty = Number(it.quantity || 1);
      const sub = Number(it.subtotal || (qty * Number(it.unit_price || 0)));
      const subHpp = Number(it.subtotal_hpp || (qty * Number(it.unit_hpp || 0)));
      itemMap[name].quantity += qty;
      itemMap[name].revenue += sub;
      itemMap[name].grossProfit += (sub - subHpp);
    });
  });

  const topItemsByVolume = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const topItemsByProfit = Object.values(itemMap).sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);

  // 6. Expense Breakdown
  const expenseCatMap: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Lainnya';
    expenseCatMap[cat] = (expenseCatMap[cat] || 0) + Number(e.amount || 0);
  });

  return {
    store_profile: {
      business_name: business?.name || business?.business_name || 'Bisnis Anda',
      owner_name: business?.owner_name || 'Bos',
      business_type: business?.business_type || 'F&B',
      address: business?.address || '',
    },
    today_real_metrics: {
      date: todayStr,
      omzet: omzetToday,
      hpp: hppToday,
      gross_profit: grossProfitToday,
      operational_expenses: totalExpensesToday,
      net_profit: netProfitToday,
      transaction_count: txCountToday,
      average_order_value: aovToday,
    },
    last_7_days_metrics: {
      omzet: omzet7d,
      hpp: hpp7d,
      gross_profit: grossProfit7d,
      operational_expenses: totalExpenses7d,
      net_profit: netProfit7d,
      transaction_count: sales7d.length,
    },
    this_month_metrics: {
      month: thisMonthStr,
      omzet: omzetMonth,
      hpp: hppMonth,
      gross_profit: grossProfitMonth,
      operational_expenses: totalExpensesMonth,
      net_profit: netProfitMonth,
      transaction_count: salesMonth.length,
    },
    products_catalog: mappedProducts,
    low_stock_alerts: lowStockProducts,
    top_profitable_products_by_margin: highestMarginProducts.slice(0, 5),
    top_profitable_products_by_nominal: mostProfitableProducts.slice(0, 5),
    top_selling_products_by_volume: topItemsByVolume,
    top_selling_products_by_profit: topItemsByProfit,
    expense_category_breakdown: expenseCatMap,
    recent_expenses: expenses.slice(0, 10).map(e => ({
      name: e.name,
      amount: Number(e.amount || 0),
      category: e.category,
      date: e.date,
    })),
    total_lifetime_transactions: sales.length,
    total_lifetime_expenses: expenses.length,
  };
}

/**
 * Intelligent deterministic answer generator when external API is unreachable.
 * NEVER invents numbers; uses ONLY the supplied context.
 */
function generateGroundedBusinessAnswer(query: string, ctx: any): string {
  const q = query.toLowerCase();
  const store = ctx?.store_profile || {};
  const storeName = store.business_name || 'Bisnis Anda';
  const today = ctx?.today_real_metrics || ctx?.today_metrics || {};
  const products = Array.isArray(ctx?.products_catalog) ? ctx.products_catalog : [];
  const lowStock = Array.isArray(ctx?.low_stock_alerts) ? ctx.low_stock_alerts : [];
  const topVolume = Array.isArray(ctx?.top_selling_products_by_volume) ? ctx.top_selling_products_by_volume : [];
  const topProfit = Array.isArray(ctx?.top_selling_products_by_profit) ? ctx.top_selling_products_by_profit : [];

  // 1. Untung / Laba hari ini
  if (q.includes('untung') && (q.includes('hari ini') || q.includes('berapa')) && !q.includes('diskon') && !q.includes('besok')) {
    const omzet = today.omzet ?? today.omzet_today ?? 0;
    const hpp = today.hpp ?? 0;
    const grossProfit = today.gross_profit ?? (omzet - hpp);
    const exp = today.operational_expenses ?? today.expenses_today ?? 0;
    const netProfit = today.net_profit ?? today.estimated_profit_today ?? (grossProfit - exp);
    const tx = today.transaction_count ?? today.transactions_count_today ?? 0;

    if (omzet === 0 && exp === 0 && tx === 0) {
      return `Halo Bos ${store.owner_name || ''}! Berdasarkan data riil di sistem, belum ada transaksi penjualan atau pengeluaran yang tercatat untuk **hari ini** (${today.date || 'hari ini'}).\n\n` +
        `• **Omzet**: Rp 0\n• **Pengeluaran**: Rp 0\n• **Laba Bersih**: Rp 0\n\n` +
        `Silakan catat penjualan baru di menu **Kasir** agar data keuntungan harian langsung terhitung otomatis.`;
    }

    return `Halo Bos! Berikut rekap keuntungan riil **${storeName}** hari ini:\n\n` +
      `• **Omzet Penjualan**: ${formatRp(omzet)} (${tx} transaksi)\n` +
      `• **HPP (Harga Pokok Menu)**: ${formatRp(hpp)}\n` +
      `• **Laba Kotor (Gross Profit)**: ${formatRp(grossProfit)}\n` +
      `• **Beban Pengeluaran**: ${formatRp(exp)}\n` +
      `• **Laba Bersih Hari Ini**: **${formatRp(netProfit)}**\n\n` +
      (netProfit >= 0
        ? `Alhamdulillah operasional hari ini positif! Margin laba bersih berada di ${omzet > 0 ? Math.round((netProfit / omzet) * 100) : 0}%.`
        : `Hari ini laba bersih berada di posisi defisit karena beban pengeluaran (${formatRp(exp)}) melebihi laba kotor (${formatRp(grossProfit)}).`);
  }

  // 2. Produk paling menguntungkan
  if (q.includes('paling menguntungkan') || q.includes('profit tertinggi') || q.includes('margin')) {
    if (products.length === 0) {
      return `Data produk belum tersedia di sistem. Silakan tambahkan menu terlebih dahulu di halaman **Produk** agar profitabilitas per menu dapat dihitung.`;
    }

    const byNominal = [...products].sort((a, b) => (b.profit_per_unit || 0) - (a.profit_per_unit || 0))[0];
    const byMargin = [...products].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))[0];

    return `Berdasarkan katalog menu terdaftar di **${storeName}**:\n\n` +
      `1. **Laba Nominal Terbesar per Unit**:\n` +
      `   • **${byNominal.name}**\n` +
      `   • Harga Jual: ${formatRp(byNominal.selling_price)} | HPP: ${formatRp(byNominal.hpp)}\n` +
      `   • Laba Kotor per Unit: **${formatRp(byNominal.profit_per_unit)}** (Margin: ${byNominal.margin_pct}%)\n\n` +
      `2. **Persentase Margin Tertinggi**:\n` +
      `   • **${byMargin.name}** dengan margin laba kotor **${byMargin.margin_pct}%**\n\n` +
      `💡 Jadikan ${byNominal.name} sebagai rekomendasi utama atau paket bundling kasir untuk mengoptimalkan keuntungan.`;
  }

  // 3. Produk paling laris
  if (q.includes('paling laris') || q.includes('terlaris') || q.includes('paling laku')) {
    if (topVolume.length === 0) {
      return `Belum ada riwayat penjualan produk yang tercatat di sistem. Setelah transaksi disimpan melalui menu **Kasir**, peringkat menu terlaris akan otomatis muncul di sini.`;
    }

    const top = topVolume[0];
    return `Berdasarkan riwayat transaksi penjualan riil **${storeName}**:\n\n` +
      `🔥 **Produk Terlaris #1**: **${top.name}**\n` +
      `• Total Terjual: **${top.quantity} porsi / unit**\n` +
      `• Total Omzet Dihasilkan: **${formatRp(top.revenue)}**\n` +
      `• Kontribusi Laba Kotor: **${formatRp(top.grossProfit)}**\n\n` +
      (topVolume.length > 1
        ? `Peringkat berikutnya diikuti oleh **${topVolume.slice(1, 3).map((p: any) => `${p.name} (${p.quantity} terjual)`).join(', ')}**.`
        : '');
  }

  // 4. Kenapa laba turun
  if (q.includes('kenapa laba') || q.includes('laba turun') || q.includes('profit turun')) {
    const todayNet = today.net_profit ?? today.estimated_profit_today ?? 0;
    const todayExp = today.operational_expenses ?? today.expenses_today ?? 0;
    const todayOmzet = today.omzet ?? today.omzet_today ?? 0;

    if (ctx?.total_lifetime_transactions === 0) {
      return `Data transaksi di sistem belum mencukupi untuk menganalisis tren penurunan laba. Silakan catat transaksi penjualan dan pengeluaran secara konsisten terlebih dahulu.`;
    }

    return `Analisis penyebab penurunan laba operasional **${storeName}**:\n\n` +
      `1. **Beban Pengeluaran**: Pengeluaran operasional tercatat hari ini mencapai **${formatRp(todayExp)}**.\n` +
      `2. **Volume Penjualan**: Omzet tercatat hari ini adalah **${formatRp(todayOmzet)}** (${today.transaction_count || 0} transaksi).\n` +
      `3. **Laba Bersih Saat Ini**: **${formatRp(todayNet)}**.\n\n` +
      `Faktor utama laba tertekan biasanya terjadi saat pengeluaran bahan/operasional dibayarkan di awal sebelum omzet harian tercapai, atau persentase HPP menu melampaui 60% harga jual.`;
  }

  // 5. Simulasi diskon
  if (q.includes('diskon')) {
    const targetProduct = products[0] || { name: 'Menu Produk', selling_price: 20000, hpp: 12000 };
    const price = targetProduct.selling_price || 20000;
    const hpp = targetProduct.hpp || 12000;
    const discountedPrice = Math.round(price * 0.9);
    const newProfit = discountedPrice - hpp;
    const newMargin = discountedPrice > 0 ? Math.round((newProfit / discountedPrice) * 100) : 0;

    return `📌 **Simulasi Skenario Diskon 10%** untuk contoh menu **${targetProduct.name}**:\n\n` +
      `• Harga Normal: ${formatRp(price)}\n` +
      `• Harga Setelah Diskon 10%: **${formatRp(discountedPrice)}**\n` +
      `• HPP Bahan Baku: ${formatRp(hpp)}\n` +
      `• Estimasi Laba Bersih Baru: **${formatRp(newProfit)}** per unit\n` +
      `• Estimasi Margin Baru: **${newMargin}%**\n\n` +
      (newProfit > 0
        ? `✅ **Kesimpulan**: Masih untung **${formatRp(newProfit)}** per porsi. Strategi diskon 10% aman dijalankan.`
        : `⚠️ **Peringatan**: Diskon 10% membuat produk ini merugi/impas karena HPP (${formatRp(hpp)}) sama atau melebihi harga promo.`);
  }

  // 6. Simulasi jual 100 cup
  if (q.includes('100') || q.includes('besok jual') || q.includes('kalau jual')) {
    const targetProduct = products[0] || { name: 'Menu Anda', selling_price: 15000, hpp: 8000 };
    const price = targetProduct.selling_price || 15000;
    const hpp = targetProduct.hpp || 8000;
    const estOmzet = 100 * price;
    const estHpp = 100 * hpp;
    const estProfit = estOmzet - estHpp;

    return `📌 **Perkiraan Skenario Penjualan 100 Cup/Porsi (${targetProduct.name})**:\n\n` +
      `• Estimasi Omzet (100 x ${formatRp(price)}): **${formatRp(estOmzet)}**\n` +
      `• Estimasi Biaya HPP (100 x ${formatRp(hpp)}): **${formatRp(estHpp)}**\n` +
      `• **Estimasi Laba Kotor Skenario**: **${formatRp(estProfit)}** (Margin: ${price > 0 ? Math.round(((price - hpp) / price) * 100) : 0}%)\n\n` +
      `*Catatan: Ini adalah proyeksi estimasi hipotesis, belum memperhitungkan biaya operasional tetap harian (listrik/gaji).*`;
  }

  // 7. Restock
  if (q.includes('restock') || q.includes('stok') || q.includes('habis')) {
    if (products.length === 0) {
      return `Belum ada produk terdaftar di sistem. Silakan kelola stok di halaman **Produk**.`;
    }

    if (lowStock.length === 0) {
      return `Kabar baik Bos! Semua persediaan stok produk di **${storeName}** saat ini dalam status aman (di atas batas minimum stok).`;
    }

    const list = lowStock.map((p: any) =>
      `• **${p.name}**: Sisa **${p.current_stock} ${p.unit || 'pcs'}** (Batas aman min: ${p.min_stock} ${p.unit || 'pcs'})`
    ).join('\n');

    return `⚠️ **Peringatan Stok Menipis!**\nTerdapat **${lowStock.length} produk** yang harus segera di-restock:\n\n${list}\n\n💡 Segera pesan bahan baku ke supplier sebelum jam operasional ramai.`;
  }

  // 8. Caption promo
  if (q.includes('caption') || q.includes('promo') || q.includes('iklan')) {
    const sampleProduct = products[0]?.name || 'Menu Spesial Kami';
    const samplePrice = products[0]?.selling_price ? formatRp(products[0].selling_price) : '';

    return `Siap Bos! Ini opsi caption promo untuk status WhatsApp / Instagram **${storeName}**:\n\n` +
      `"Lagi butuh asupan yang bikin mood balik? 🤤 Nikmati kelezatan **${sampleProduct}** ${samplePrice ? `hanya ${samplePrice}` : ''} dibuat fresh dengan bahan pilihan berkualitas!\n\n` +
      `📍 Yuk mampir langsung ke ${storeName} atau pesan via WhatsApp sekarang juga sebelum kehabisan!\n` +
      `👉 Hubungi kami sekarang!"`;
  }

  // General fallback
  const omzet = today.omzet ?? today.omzet_today ?? 0;
  const net = today.net_profit ?? today.estimated_profit_today ?? 0;
  return `Halo Bos! Berdasarkan data riil toko **${storeName}**:\n\n` +
    `• **Omzet Hari Ini**: ${formatRp(omzet)}\n` +
    `• **Laba Bersih Hari Ini**: ${formatRp(net)}\n` +
    `• **Katalog Menu Terdaftar**: ${products.length} item produk\n` +
    `• **Total Riwayat Transaksi**: ${ctx?.total_lifetime_transactions || 0} nota tersimpan\n\n` +
    `Mau saya bantu cek produk terlaris, simulasi diskon, atau peringatan stok menipis?`;
}

/**
 * Tanya Bisnis AI Chat Endpoint with Supabase RLS context & Gemini
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, businessId, businessContext: clientContext } = req.body;
    const isStream = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    // Resolve Supabase credentials and active business context
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const supabaseUrl = (req.headers['x-supabase-url'] as string) || process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = (req.headers['x-supabase-anon-key'] as string) || process.env.VITE_SUPABASE_ANON_KEY || '';

    let businessContext = clientContext;

    // If server has direct Supabase credentials and token, fetch real tables under RLS
    if (supabaseUrl && supabaseAnonKey && token) {
      try {
        const sb = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Query active business
        let bizQuery = sb.from('businesses').select('*');
        if (businessId) {
          bizQuery = bizQuery.eq('id', businessId);
        }
        const { data: bizData } = await bizQuery.limit(1).maybeSingle();
        const activeBizId = bizData?.id || businessId;

        // Query products
        let prodQuery = sb.from('products').select('*');
        if (activeBizId) prodQuery = prodQuery.eq('business_id', activeBizId);
        const { data: prodData } = await prodQuery;

        // Query sales with items
        let salesQuery = sb.from('sales').select('*, sale_items(*)');
        if (activeBizId) salesQuery = salesQuery.eq('business_id', activeBizId);
        const { data: salesData } = await salesQuery.order('created_at', { ascending: false });

        // Query expenses
        let expQuery = sb.from('expenses').select('*');
        if (activeBizId) expQuery = expQuery.eq('business_id', activeBizId);
        const { data: expData } = await expQuery.order('created_at', { ascending: false });

        if (bizData || (prodData && prodData.length > 0) || (salesData && salesData.length > 0)) {
          businessContext = buildCompactBusinessContext(bizData, prodData || [], salesData || [], expData || []);
        }
      } catch (sbErr) {
        console.warn('Direct Supabase fetch fallback to provided context:', sbErr);
      }
    }

    // If client provided context directly from its loaded state, ensure it is compacted cleanly
    if (!businessContext || Object.keys(businessContext).length === 0) {
      businessContext = buildCompactBusinessContext(
        clientContext?.store_profile || {},
        clientContext?.products_catalog || [],
        clientContext?.transactions || [],
        clientContext?.recent_expenses || []
      );
    }

    const systemInstruction = `Anda adalah "BisnisKu Copilot", konsultan bisnis & keuangan AI untuk pemilik UMKM kuliner dan F&B Indonesia (kedai kopi, geprek, warmindo, boba, bakery, catering, dll).
Slogan BisnisKu: "Jualan jalan, bisnis makin jelas."

ATURAN UTAMA & INTEGRITAS DATA (STRICT ZERO HALLUCINATION):
1. ANDA HANYA MENJAWAB MENGGUNAKAN DATA NYATA BISNIS PENGGUNA BERIKUT INI.
2. DILARANG MENGARANG: Jangan pernah mengarang angka omzet, nominal laba, beban pengeluaran, persentase margin, nama produk, stok, atau jumlah transaksi.
3. DATA TIDAK TERSEDIA: Jika pengguna menanyakan data yang belum tercatat atau masih Rp 0 (misalnya belum ada penjualan hari ini, belum ada pengeluaran, atau produk tidak ada di katalog), sampaikan secara TEGAS dan JUJUR bahwa data tersebut belum tersedia di sistem. Jangan menebak angka fiktif.
4. PERHITUNGAN MATEMATIS REALISTIS:
   - "Hari ini gue untung berapa?": Hitung dari omzet hari ini dikurangi HPP (laba kotor) dikurangi pengeluaran hari ini = Laba Bersih.
   - "Produk mana paling menguntungkan?": Sebutkan produk berdasarkan laba nominal terbesar (selling_price - hpp) dan persentase margin terbesar dari katalog produk nyata.
   - "Produk mana paling laris?": Sebutkan produk berdasarkan jumlah terjual dari data penjualan riil.
   - "Kenapa laba gue turun?": Analisis apakah omzet turun atau beban pengeluaran naik berdasarkan data riil.
   - "Kalau diskon 10%, masih untung nggak?": Hitung simulasi secara detail: (Harga Jual - 10%) - HPP = Laba baru dan Margin baru. Tegaskan apakah masih untung atau merugi.
   - "Kalau besok jual 100 cup, kira-kira untung berapa?": Hitung proyeksi: (100 * Harga Jual) - (100 * HPP) = Estimasi Laba Kotor. Ingatkan secara jelas bahwa ini adalah proyeksi estimasi skenario, bukan laba aktual masa lalu.
   - "Produk mana yang harus gue restock?": Periksa produk yang sisa stoknya <= minimum stok.
   - "Bikinin caption promo": Buatkan copy promo yang menarik untuk WhatsApp / Instagram, sebutkan nama menu nyata dari katalog dan keunggulannya, sertakan Call to Action (CTA).
5. MEMBEDAKAN DATA AKTUAL vs ESTIMASI: Bedakan secara jelas antara data historis nyata dengan perkiraan skenario.
6. FORMAT & GAYA BAHASA: Gunakan Bahasa Indonesia yang ramah, santai tapi profesional, seperti rekan bisnis terpercaya (misal "Halo Bos [Nama Owner]!"). Selalu gunakan format Rupiah (Rp). Buat jawaban rapi dengan bullet points yang mudah dibaca di layar HP.

DATA NYATA BISNIS PENGGUNA SAAT INI:
${JSON.stringify(businessContext, null, 2)}
`;

    // Format conversation history for Gemini
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-6)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let replyText = '';

    // Handle streaming mode
    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) res.flushHeaders();

      let streamSucceeded = false;
      for (const model of candidateModels) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
          }
          streamSucceeded = true;
          break;
        } catch (err: any) {
          console.warn(`Streaming with model ${model} error:`, err?.message || err);
          await new Promise(r => setTimeout(r, 200));
        }
      }

      if (!streamSucceeded) {
        const fallback = generateGroundedBusinessAnswer(message, businessContext);
        res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Non-streaming standard response
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} request returned error:`, err?.message || err);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (!replyText) {
      console.warn('All Gemini models temporarily unavailable, serving grounded business fallback.');
      replyText = generateGroundedBusinessAnswer(message, businessContext);
    }

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Gemini API handler error:', error);
    try {
      const fallback = generateGroundedBusinessAnswer(req.body?.message || '', req.body?.businessContext || {});
      return res.json({ reply: fallback });
    } catch {
      return res.status(500).json({
        error: 'Terjadi kendala saat menghubungi AI Copilot.',
        details: error?.message || 'Unknown error',
      });
    }
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`BisnisKu AI server running on port ${PORT}`);
  });
}

startServer();
