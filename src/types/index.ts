export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'other';

export type ExpenseCategory = 'Bahan' | 'Operasional' | 'Transport' | 'Promosi' | 'Lainnya';

export interface Business {
  id: string;
  owner_id: string;
  user_id?: string;
  name: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  business_type?: string;
  address?: string;
  instagram?: string;
  logo_url?: string;
  receipt_footer?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  business_id?: string;
  user_id?: string;
  name: string;
  category: string;
  hpp: number; // Harga Pokok Penjualan
  selling_price: number; // Harga Jual
  stock: number;
  unit: string; // cup, porsi, pcs, botol, pack, dll.
  min_stock: number;
  image_url?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  unit_hpp: number;
  subtotal: number;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_hpp: number;
  subtotal: number;
  subtotal_hpp?: number;
  created_at?: string;
}

// TransactionItem alias for compatibility with UI components
export type TransactionItem = SaleItem;

export interface Sale {
  id: string;
  business_id: string;
  user_id: string;
  invoice_number: string;
  total_amount: number;
  total_hpp: number;
  gross_profit: number;
  profit: number; // UI compatibility (alias of gross_profit)
  payment_method: PaymentMethod;
  subtotal?: number;
  discount?: number;
  cash_received?: number;
  change_amount?: number;
  date: string; // UI compatibility (alias of created_at / transaction_date)
  customer_name?: string;
  notes?: string;
  created_at: string;
  items: SaleItem[];
}

// Transaction alias for backward compatibility across UI components
export type Transaction = Sale;

export interface CreateTransactionPayload {
  items: SaleItem[];
  total_amount: number;
  total_hpp: number;
  profit: number;
  payment_method: PaymentMethod;
  subtotal?: number;
  discount?: number;
  cash_received?: number;
  change_amount?: number;
  date?: string;
  customer_name?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  business_id?: string;
  user_id?: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
  created_at?: string;
}

export interface AIConversation {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface AIMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export interface BusinessProfile {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  business_type: string;
  address: string;
  instagram?: string;
  logo_url?: string;
  receipt_footer: string;
  supabase_url?: string;
  supabase_anon_key?: string;
}

export interface DashboardSummary {
  omzetToday: number;
  expensesToday: number;
  estimatedProfitToday: number;
  transactionsCountToday: number;
  topProductsToday: { name: string; quantity: number; revenue: number }[];
  sevenDaysTrend: { date: string; label: string; omzet: number; profit: number; expenses: number }[];
  recentTransactions: Transaction[];
  lowStockProducts: Product[];
}

