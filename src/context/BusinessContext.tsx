import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { Product, Transaction, Expense, Business, BusinessProfile, DashboardSummary, CreateTransactionPayload, SaleItem, ExpenseCategory } from '../types';
import { generateInvoiceNumber, getTodayDateString } from '../utils/formatters';
import { supabase, getSupabase, getSupabaseConfig } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface UserAuth {
  id?: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
}

interface BusinessContextType {
  user: UserAuth;
  business: Business | null;
  profile: BusinessProfile;
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  isLoadingData: boolean;
  isSupabaseConfigured: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, businessName: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  updateProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product | null>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  createTransaction: (data: CreateTransactionPayload) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<Expense | null>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  dashboardSummary: DashboardSummary;
  clearAllData: () => Promise<void>;
  exportDataJson: () => string;
  importDataJson: (json: string) => Promise<boolean>;
}

const DEFAULT_PROFILE: BusinessProfile = {
  business_name: 'Kedai Saya',
  owner_name: 'Pemilik Usaha',
  email: '',
  phone: '',
  business_type: 'F&B / Kuliner',
  address: '',
  receipt_footer: 'Terima kasih atas kunjungan Anda!',
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [supabaseConfig, setSupabaseConfig] = useState(() => getSupabaseConfig());
  const isSupabaseConfigured = supabaseConfig.isConfigured;

  // Supabase Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<UserAuth>({
    name: '',
    email: '',
    isAuthenticated: false,
  });

  // Current user's business from Supabase 'businesses' table
  const [business, setBusiness] = useState<Business | null>(null);

  // Persistent business profile
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);

  // Real Database Records (NO mock / dummy data)
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Fetch all user business data from Supabase
  const fetchData = useCallback(async (activeBiz?: Business | null, activeUserId?: string) => {
    const sb = getSupabase();
    if (!sb) return;

    const bizId = activeBiz?.id || business?.id;
    const uid = activeUserId || user.id;
    if (!bizId && !uid) return;

    setIsLoadingData(true);
    try {
      // 1. Fetch Products
      let prodQuery = sb.from('products').select('*');
      if (bizId) {
        prodQuery = prodQuery.eq('business_id', bizId);
      } else if (uid) {
        prodQuery = prodQuery.eq('user_id', uid);
      }
      const { data: prodData, error: prodErr } = await prodQuery.order('created_at', { ascending: false });

      if (!prodErr && prodData) {
        const mappedProds: Product[] = prodData.map((p: any) => ({
          id: p.id,
          business_id: p.business_id,
          user_id: p.user_id,
          name: p.name,
          category: p.category || 'Lainnya',
          hpp: Number(p.cost_price ?? p.hpp ?? 0),
          selling_price: Number(p.selling_price ?? p.price ?? 0),
          stock: Number(p.stock || 0),
          unit: p.unit || 'porsi',
          min_stock: Number(p.min_stock || 5),
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at,
        }));
        setProducts(mappedProds);
      }

      // 2. Fetch Sales and Sale Items
      let salesQuery = sb.from('sales').select('*, sale_items(*)');
      if (bizId) {
        salesQuery = salesQuery.eq('business_id', bizId);
      } else if (uid) {
        salesQuery = salesQuery.eq('user_id', uid);
      }
      const { data: salesData, error: salesErr } = await salesQuery.order('created_at', { ascending: false });

      if (!salesErr && salesData) {
        const mappedSales: Transaction[] = salesData.map((s: any) => {
          const rawItems = Array.isArray(s.sale_items) ? s.sale_items : [];
          const items = rawItems.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            product_name: item.product_name || 'Produk',
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.unit_price ?? item.price ?? 0),
            unit_hpp: Number(item.unit_hpp ?? item.hpp ?? 0),
            subtotal: Number(item.subtotal || 0),
            subtotal_hpp: Number(item.subtotal_hpp || 0),
            created_at: item.created_at,
          }));

          const totalAmt = Number(s.total_amount || 0);
          const totalHpp = Number(s.total_hpp || 0);
          const grossProfit = Number(s.gross_profit ?? (totalAmt - totalHpp));

          return {
            id: s.id,
            business_id: s.business_id,
            user_id: s.user_id,
            invoice_number: s.invoice_number,
            total_amount: totalAmt,
            total_hpp: totalHpp,
            gross_profit: grossProfit,
            profit: grossProfit,
            payment_method: s.payment_method || 'cash',
            date: s.created_at || s.transaction_date || new Date().toISOString(),
            customer_name: s.customer_name || undefined,
            notes: s.notes || undefined,
            created_at: s.created_at || new Date().toISOString(),
            items,
          };
        });
        setTransactions(mappedSales);
      }

      // 3. Fetch Expenses
      let expQuery = sb.from('expenses').select('*');
      if (bizId) {
        expQuery = expQuery.eq('business_id', bizId);
      } else if (uid) {
        expQuery = expQuery.eq('user_id', uid);
      }
      const { data: expData, error: expErr } = await expQuery.order('date', { ascending: false }).order('created_at', { ascending: false });

      if (!expErr && expData) {
        const mappedExpenses: Expense[] = expData.map((e: any) => ({
          id: e.id,
          business_id: e.business_id,
          user_id: e.user_id,
          name: e.name,
          amount: Number(e.amount || 0),
          category: e.category || 'Operasional',
          date: e.date || (e.created_at ? e.created_at.split('T')[0] : getTodayDateString()),
          notes: e.notes || undefined,
          created_at: e.created_at || new Date().toISOString(),
        }));
        setExpenses(mappedExpenses);
      } else if (expErr) {
        console.error('Supabase fetch expenses error:', expErr);
      }
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [business?.id, user.id]);

  // Ref to track in-flight business load/create tasks and avoid duplicates
  const inFlightBusinessRef = useRef<Record<string, Promise<Business | null> | undefined>>({});

  // 1-6 & 8. Load or create single business record for current authenticated user
  const loadOrCreateUserBusiness = useCallback(async (
    sbUser: User,
    customBusinessName?: string
  ): Promise<Business | null> => {
    if (!sbUser?.id) return null;

    // Reuse existing in-flight task for this user to guarantee no duplicates
    const existingTask = inFlightBusinessRef.current[sbUser.id];
    if (existingTask) {
      return existingTask;
    }

    const task = (async (): Promise<Business | null> => {
      try {
        // 2. Query existing businesses table for current user using owner_id
        const { data: existingRecords, error: queryError } = await supabase
          .from('businesses')
          .select('id, owner_id, name, owner_name, business_type, created_at')
          .eq('owner_id', sbUser.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (queryError) {
          console.error('Error querying businesses table for user:', queryError);
        }

        // 3. If a business already exists, load it and keep it available throughout session
        if (existingRecords && existingRecords.length > 0) {
          const b = existingRecords[0];
          const rawOwner = b.owner_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Pemilik Usaha';
          const ownerId = b.owner_id || sbUser.id;
          const loaded: Business = {
            id: b.id,
            owner_id: ownerId,
            user_id: ownerId,
            name: b.name,
            owner_name: rawOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: b.business_type || 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
            created_at: b.created_at,
          };
          setBusiness(loaded);
          setProfile({
            business_name: loaded.name,
            owner_name: rawOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: loaded.business_type || 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
          });
          // 9. Load associated products, sales, expenses with business ID
          await fetchData(loaded, sbUser.id);
          return loaded;
        }

        // 4 & 5. If no business exists, create exactly one record using existing schema with owner_id
        const metaBName = (customBusinessName || sbUser.user_metadata?.business_name || '').trim();
        const metaOwner = (sbUser.user_metadata?.name || '').trim();
        const fallbackOwner = metaOwner || (sbUser.email ? sbUser.email.split('@')[0] : 'Pemilik Usaha');
        const initialBusinessName = metaBName || (metaOwner ? `Kedai ${metaOwner}` : 'Kedai UMKM');

        const insertPayload: any = {
          owner_id: sbUser.id,
          name: initialBusinessName,
          owner_name: fallbackOwner,
          business_type: 'F&B / Kuliner',
        };

        const { data: created, error: insertError } = await supabase
          .from('businesses')
          .insert(insertPayload)
          .select('id, owner_id, name, owner_name, business_type, created_at')
          .single();

        if (insertError) {
          console.error('Error creating business for user:', insertError);

          // Retry check in case of concurrent insert using owner_id
          const { data: retryRecords } = await supabase
            .from('businesses')
            .select('id, owner_id, name, owner_name, business_type, created_at')
            .eq('owner_id', sbUser.id)
            .order('created_at', { ascending: true })
            .limit(1);

          if (retryRecords && retryRecords.length > 0) {
            const b = retryRecords[0];
            const rawOwner = b.owner_name || fallbackOwner;
            const ownerId = b.owner_id || sbUser.id;
            const loaded: Business = {
              id: b.id,
              owner_id: ownerId,
              user_id: ownerId,
              name: b.name,
              owner_name: rawOwner,
              phone: '',
              email: sbUser.email || '',
              business_type: b.business_type || 'F&B / Kuliner',
              address: '',
              receipt_footer: 'Terima kasih atas kunjungan Anda!',
              created_at: b.created_at,
            };
            setBusiness(loaded);
            setProfile({
              business_name: loaded.name,
              owner_name: rawOwner,
              phone: '',
              email: sbUser.email || '',
              business_type: loaded.business_type || 'F&B / Kuliner',
              address: '',
              receipt_footer: 'Terima kasih atas kunjungan Anda!',
            });
            await fetchData(loaded, sbUser.id);
            return loaded;
          }

          // If database table has restricted role privileges (42501), initialize local session business
          const fallbackLoaded: Business = {
            id: sbUser.id,
            owner_id: sbUser.id,
            user_id: sbUser.id,
            name: initialBusinessName,
            owner_name: fallbackOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
            created_at: new Date().toISOString(),
          };
          setBusiness(fallbackLoaded);
          setProfile({
            business_name: fallbackLoaded.name,
            owner_name: fallbackOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: fallbackLoaded.business_type || 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
          });
          return fallbackLoaded;
        }

        if (created) {
          const ownerId = created.owner_id || sbUser.id;
          const loaded: Business = {
            id: created.id,
            owner_id: ownerId,
            user_id: ownerId,
            name: created.name,
            owner_name: created.owner_name || fallbackOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: created.business_type || 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
            created_at: created.created_at,
          };
          setBusiness(loaded);
          setProfile({
            business_name: loaded.name,
            owner_name: loaded.owner_name || fallbackOwner,
            phone: '',
            email: sbUser.email || '',
            business_type: loaded.business_type || 'F&B / Kuliner',
            address: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
          });
          // 9. Load associated products, sales, expenses with business ID
          await fetchData(loaded, sbUser.id);
          return loaded;
        }

        return null;
      } catch (err) {
        console.error('Exception loading or creating business:', err);
        return null;
      } finally {
        delete inFlightBusinessRef.current[sbUser.id];
      }
    })();

    inFlightBusinessRef.current[sbUser.id] = task;
    return task;
  }, [fetchData]);

  // Setup Supabase Auth listener and initial session
  useEffect(() => {
    setSupabaseConfig(getSupabaseConfig());

    // 4. Persist the Supabase session on app start
    supabase.auth.getSession().then(async ({ data: { session: currentSession }, error }) => {
      if (error) {
        console.error('Supabase getSession error:', error);
      }
      if (currentSession?.user) {
        setSession(currentSession);
        const sbUser = currentSession.user;
        const displayName = sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Pemilik Usaha';
        setUser({
          id: sbUser.id,
          name: displayName,
          email: sbUser.email || '',
          isAuthenticated: true,
        });
        await loadOrCreateUserBusiness(sbUser);
      } else {
        setSession(null);
        setUser({ name: '', email: '', isAuthenticated: false });
        setBusiness(null);
        setProducts([]);
        setTransactions([]);
        setExpenses([]);
        setProfile(DEFAULT_PROFILE);
      }
    });

    // 5. Listen to Auth State Changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const sbUser = newSession.user;
        const displayName = sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Pemilik Usaha';
        setUser({
          id: sbUser.id,
          name: displayName,
          email: sbUser.email || '',
          isAuthenticated: true,
        });
        await loadOrCreateUserBusiness(sbUser);
      } else {
        setUser({ name: '', email: '', isAuthenticated: false });
        setBusiness(null);
        setProducts([]);
        setTransactions([]);
        setExpenses([]);
        setProfile(DEFAULT_PROFILE);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loadOrCreateUserBusiness]);

  // 1. Auth: Login using supabase.auth.signInWithPassword()
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const sbUser = data.user;
        const displayName = sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Pemilik Usaha';
        setUser({
          id: sbUser.id,
          name: displayName,
          email: sbUser.email || '',
          isAuthenticated: true,
        });
        await loadOrCreateUserBusiness(sbUser);
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Gagal masuk ke akun Supabase.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // 2. Auth: Register using supabase.auth.signUp()
  const register = async (
    name: string,
    email: string,
    password: string,
    businessName: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            business_name: businessName.trim(),
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const sbUser = data.user;
        if (data.session) {
          setSession(data.session);
          setUser({
            id: sbUser.id,
            name: name.trim(),
            email: sbUser.email || email.trim(),
            isAuthenticated: true,
          });
          await loadOrCreateUserBusiness(sbUser, businessName.trim());
        }

        const message = !data.session
          ? 'Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi akun atau silakan masuk.'
          : undefined;

        return { success: true, message };
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Gagal mendaftar akun Supabase.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // 3. Auth: Logout using supabase.auth.signOut()
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setSession(null);
    setUser({ name: '', email: '', isAuthenticated: false });
    setBusiness(null);
    setProducts([]);
    setTransactions([]);
    setExpenses([]);
    setProfile(DEFAULT_PROFILE);
  };

  // Auth: Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengirim instruksi reset kata sandi.' };
    }
  };

  // Refresh data manually
  const refreshData = async () => {
    if (session?.user) {
      const biz = await loadOrCreateUserBusiness(session.user);
      if (biz) {
        await fetchData(biz, session.user.id);
      }
    } else {
      await fetchData();
    }
  };

  // Update profile
  const updateProfile = async (partial: Partial<BusinessProfile>) => {
    setProfile(prev => ({ ...prev, ...partial }));

    if (business?.id) {
      try {
        const updateData: any = {};
        if (partial.business_name !== undefined) updateData.name = partial.business_name;
        if (partial.owner_name !== undefined) updateData.owner_name = partial.owner_name;
        if (partial.business_type !== undefined) updateData.business_type = partial.business_type;

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase.from('businesses').update(updateData).eq('id', business.id);
          if (error) {
            console.error('Supabase update businesses error:', error);
          } else {
            setBusiness(prev => prev ? {
              ...prev,
              name: partial.business_name !== undefined ? partial.business_name : prev.name,
              owner_name: partial.owner_name !== undefined ? partial.owner_name : prev.owner_name,
              phone: partial.phone !== undefined ? partial.phone : prev.phone,
              email: partial.email !== undefined ? partial.email : prev.email,
              business_type: partial.business_type !== undefined ? partial.business_type : prev.business_type,
              address: partial.address !== undefined ? partial.address : prev.address,
              receipt_footer: partial.receipt_footer !== undefined ? partial.receipt_footer : prev.receipt_footer,
            } : null);
          }
        }
      } catch (err) {
        console.error('Error updating business profile in Supabase:', err);
      }
    }
  };

  // 1. PRODUCTS: INSERT ke Supabase
  const addProduct = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> => {
    // 1. Get authenticated user from active session
    let authUser: User | null = session?.user || null;
    if (!authUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      authUser = sessionData.session?.user || null;
    }
    if (!authUser) {
      const { data: userData } = await supabase.auth.getUser();
      authUser = userData.user || null;
    }

    if (!authUser?.id) {
      console.error('Cannot add product: No active Supabase authenticated session');
      throw new Error('Sesi bisnis tidak ditemukan. Mohon pastikan akun telah masuk.');
    }

    // 2. Query business using businesses.owner_id = authenticated_user.id
    let currentBiz: Business | null = business;
    if (!currentBiz?.id || currentBiz.owner_id !== authUser.id) {
      currentBiz = await loadOrCreateUserBusiness(authUser);
    }

    // Fallback direct lookup if state not populated yet
    if (!currentBiz?.id) {
      const { data: directBiz } = await supabase
        .from('businesses')
        .select('id, owner_id, name, owner_name, business_type, created_at')
        .eq('owner_id', authUser.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (directBiz && directBiz.length > 0) {
        const b = directBiz[0];
        currentBiz = {
          id: b.id,
          owner_id: b.owner_id,
          user_id: b.owner_id,
          name: b.name,
          owner_name: b.owner_name || authUser.user_metadata?.name || 'Pemilik Usaha',
          phone: '',
          email: authUser.email || '',
          business_type: b.business_type || 'F&B / Kuliner',
          address: '',
          receipt_footer: 'Terima kasih atas kunjungan Anda!',
          created_at: b.created_at,
        };
        setBusiness(currentBiz);
      }
    }

    const bizId = currentBiz?.id;
    if (!bizId) {
      console.error('Cannot add product: No business found for owner_id =', authUser.id);
      throw new Error('Sesi bisnis tidak ditemukan. Mohon pastikan akun telah masuk.');
    }

    try {
      const payload: any = {
        business_id: bizId,
        name: data.name.trim(),
        category: data.category,
        cost_price: Number(data.hpp || 0),
        selling_price: Number(data.selling_price || 0),
        stock: Number(data.stock || 0),
        unit: data.unit || 'porsi',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase.from('products').insert(payload).select().single();

      if (error) {
        console.error('Supabase addProduct error:', error);
        throw new Error(error.message || 'Gagal menambah produk ke database');
      }

      const newProd: Product = {
        id: created.id,
        business_id: created.business_id,
        user_id: authUser.id,
        name: created.name,
        category: created.category,
        hpp: Number(created.cost_price ?? created.hpp ?? 0),
        selling_price: Number(created.selling_price ?? created.price ?? 0),
        stock: Number(created.stock || 0),
        unit: created.unit || 'porsi',
        min_stock: Number(data.min_stock || 5),
        created_at: created.created_at,
        updated_at: created.updated_at,
      };

      setProducts(prev => [newProd, ...prev]);
      return newProd;
    } catch (err: any) {
      console.error('Error in addProduct:', err);
      throw err;
    }
  };

  // 2. PRODUCTS: UPDATE ke Supabase
  const updateProduct = async (id: string, partial: Partial<Product>): Promise<void> => {
    try {
      const updatePayload: any = {
        ...partial,
        updated_at: new Date().toISOString(),
      };
      delete updatePayload.id;
      delete updatePayload.business_id;
      delete updatePayload.user_id;

      if ('hpp' in updatePayload) {
        updatePayload.cost_price = Number(updatePayload.hpp || 0);
        delete updatePayload.hpp;
      }
      if ('min_stock' in updatePayload) {
        delete updatePayload.min_stock;
      }

      let query = supabase.from('products').update(updatePayload).eq('id', id);
      if (business?.id) {
        query = query.eq('business_id', business.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Supabase updateProduct error:', error);
        throw new Error(error.message || 'Gagal memperbarui produk');
      }

      setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...partial } : p)));
    } catch (err) {
      console.error('Error updateProduct:', err);
      throw err;
    }
  };

  // 3. PRODUCTS: DELETE dari Supabase
  const deleteProduct = async (id: string): Promise<void> => {
    try {
      let query = supabase.from('products').delete().eq('id', id);
      if (business?.id) {
        query = query.eq('business_id', business.id);
      }

      const { error } = await query;
      if (error) {
        console.error('Supabase deleteProduct error:', error);
        throw new Error(error.message || 'Gagal menghapus produk');
      }
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleteProduct:', err);
      throw err;
    }
  };

  // 4. PRODUCTS: ADJUST STOCK ke Supabase
  const adjustStock = async (id: string, delta: number): Promise<void> => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    const newStock = Math.max(0, prod.stock + delta);
    await updateProduct(id, { stock: newStock });
  };

  // 5. SALES & SALE_ITEMS: Simpan transaksi & kurangi stok
  const createTransaction = async (data: CreateTransactionPayload): Promise<Transaction | null> => {
    const bizId = business?.id;
    const uid = user.id;

    if (!bizId && !uid) {
      console.error('Cannot create transaction: No active business or user session');
      throw new Error('Sesi bisnis tidak ditemukan. Mohon masuk kembali.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Keranjang belanja kosong. Pilih minimal satu produk.');
    }

    // 9. Prevent selling more quantity than available stock
    for (const item of data.items) {
      if (item.product_id) {
        const prod = products.find(p => p.id === item.product_id);
        const availableStock = prod ? prod.stock : 0;
        if (availableStock < item.quantity) {
          throw new Error(
            `Stok untuk "${item.product_name}" tidak mencukupi (Tersedia: ${availableStock}, Diminta: ${item.quantity}).`
          );
        }
      }
    }

    // 7. Calculate totals according to existing schema
    let computedAmount = 0;
    let computedHpp = 0;
    data.items.forEach(it => {
      computedAmount += Number(it.subtotal || (it.quantity * it.unit_price));
      computedHpp += Number(it.quantity * it.unit_hpp);
    });

    const finalTotalAmount = Number(data.total_amount ?? computedAmount);
    const finalTotalHpp = Number(data.total_hpp ?? computedHpp);
    const finalGrossProfit = Number(data.profit ?? (finalTotalAmount - finalTotalHpp));

    const invNumber = generateInvoiceNumber(transactions.length);
    const salePayload: any = {
      invoice_number: invNumber,
      total_amount: finalTotalAmount,
      total_hpp: finalTotalHpp,
      gross_profit: finalGrossProfit,
      payment_method: data.payment_method,
      customer_name: data.customer_name?.trim() || null,
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
    };

    if (bizId) salePayload.business_id = bizId;
    if (uid) salePayload.user_id = uid;

    // 10. Safe transaction flow with rollback support
    // Step 1: Insert into 'sales'
    const { data: createdSale, error: saleErr } = await supabase
      .from('sales')
      .insert(salePayload)
      .select()
      .single();

    if (saleErr || !createdSale) {
      console.error('Supabase createTransaction sales error:', saleErr);
      throw new Error(saleErr?.message || 'Gagal menyimpan transaksi penjualan ke Supabase');
    }

    // Step 2: Insert into 'sale_items'
    const saleItemsPayload = data.items.map(item => ({
      sale_id: createdSale.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      unit_hpp: Number(item.unit_hpp || 0),
      subtotal: Number(item.subtotal || (item.quantity * item.unit_price)),
      subtotal_hpp: Number((item.quantity * item.unit_hpp) || 0),
      created_at: new Date().toISOString(),
    }));

    const { data: createdItems, error: itemsErr } = await supabase
      .from('sale_items')
      .insert(saleItemsPayload)
      .select();

    if (itemsErr) {
      console.error('Supabase sale_items error, rolling back sale:', itemsErr);
      // Rollback: delete created sale
      await supabase.from('sales').delete().eq('id', createdSale.id);
      throw new Error(itemsErr.message || 'Gagal menyimpan rincian item pesanan');
    }

    // Step 3: Deduct stock in Supabase products table with rollback if failure
    const decrementedProducts: { id: string; prevStock: number }[] = [];
    try {
      for (const item of data.items) {
        if (item.product_id) {
          const currentProd = products.find(p => p.id === item.product_id);
          const prevStock = currentProd ? currentProd.stock : 0;
          const newStock = Math.max(0, prevStock - item.quantity);

          const { error: stockErr } = await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', item.product_id);

          if (stockErr) {
            throw new Error(`Gagal memperbarui stok untuk "${item.product_name}": ${stockErr.message}`);
          }
          decrementedProducts.push({ id: item.product_id, prevStock });
        }
      }
    } catch (stockError: any) {
      console.error('Stock decrement failed, rolling back transaction and restored stock:', stockError);
      // Rollback already decremented products
      for (const p of decrementedProducts) {
        await supabase.from('products').update({ stock: p.prevStock }).eq('id', p.id);
      }
      // Rollback sale_items and sale
      await supabase.from('sale_items').delete().eq('sale_id', createdSale.id);
      await supabase.from('sales').delete().eq('id', createdSale.id);
      throw stockError;
    }

    // Step 4: Update local products stock
    setProducts(prev =>
      prev.map(p => {
        const sold = data.items.find(i => i.product_id === p.id);
        if (sold) {
          return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
        }
        return p;
      })
    );

    // Step 5: Format created Transaction
    const finalItems: SaleItem[] = (createdItems && createdItems.length > 0)
      ? createdItems.map((ci: any) => ({
          id: ci.id,
          sale_id: ci.sale_id,
          product_id: ci.product_id,
          product_name: ci.product_name,
          quantity: Number(ci.quantity),
          unit_price: Number(ci.unit_price),
          unit_hpp: Number(ci.unit_hpp),
          subtotal: Number(ci.subtotal),
          subtotal_hpp: Number(ci.subtotal_hpp),
          created_at: ci.created_at,
        }))
      : data.items.map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          sale_id: createdSale.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          unit_hpp: it.unit_hpp,
          subtotal: it.subtotal,
          subtotal_hpp: it.quantity * it.unit_hpp,
          created_at: createdSale.created_at,
        }));

    const newTx: Transaction = {
      id: createdSale.id,
      business_id: createdSale.business_id,
      user_id: createdSale.user_id,
      invoice_number: createdSale.invoice_number,
      total_amount: Number(createdSale.total_amount),
      total_hpp: Number(createdSale.total_hpp),
      gross_profit: Number(createdSale.gross_profit),
      profit: Number(createdSale.gross_profit),
      payment_method: createdSale.payment_method,
      date: createdSale.created_at,
      customer_name: createdSale.customer_name || undefined,
      notes: createdSale.notes || undefined,
      created_at: createdSale.created_at,
      items: finalItems,
    };

    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  // Delete sale transaction with stock restoration and orphan cleanup
  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      // 1. Locate the transaction to get item quantities for stock restoration
      const txToDelete = transactions.find(t => t.id === id);

      // 2. Explicitly remove associated sale_items to prevent orphan rows
      const { error: itemsDelErr } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);

      if (itemsDelErr) {
        console.warn('Supabase delete sale_items notice (may have cascading delete):', itemsDelErr);
      }

      // 3. Delete the parent sales record
      let query = supabase.from('sales').delete().eq('id', id);
      if (business?.id) {
        query = query.eq('business_id', business.id);
      }

      const { error } = await query;
      if (error) {
        console.error('Supabase deleteTransaction error:', error);
        throw new Error(error.message || 'Gagal menghapus transaksi dari Supabase');
      }

      // 4. Restore product stock in Supabase for each item in the deleted transaction
      if (txToDelete && Array.isArray(txToDelete.items) && txToDelete.items.length > 0) {
        for (const item of txToDelete.items) {
          if (item.product_id) {
            const currentProd = products.find(p => p.id === item.product_id);
            if (currentProd) {
              const restoredStock = currentProd.stock + Number(item.quantity || 0);
              await supabase
                .from('products')
                .update({ stock: restoredStock, updated_at: new Date().toISOString() })
                .eq('id', item.product_id);
            }
          }
        }

        // 5. Update local products state with restored stock
        setProducts(prev =>
          prev.map(p => {
            const soldItem = txToDelete.items.find(i => i.product_id === p.id);
            if (soldItem) {
              return { ...p, stock: p.stock + Number(soldItem.quantity || 0) };
            }
            return p;
          })
        );
      }

      // 6. Remove transaction from local state
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleteTransaction:', err);
      throw err;
    }
  };

  // 6. EXPENSES: INSERT ke Supabase
  const addExpense = async (data: Omit<Expense, 'id' | 'created_at'>): Promise<Expense | null> => {
    const bizId = business?.id;
    const uid = user.id;

    if (!bizId && !uid) {
      console.error('Cannot add expense: No active business or user session');
      throw new Error('Sesi bisnis tidak ditemukan. Mohon masuk kembali.');
    }

    try {
      const payload: any = {
        name: data.name.trim(),
        amount: Number(data.amount || 0),
        category: data.category,
        date: data.date || getTodayDateString(),
        notes: data.notes?.trim() || null,
        created_at: new Date().toISOString(),
      };

      if (bizId) payload.business_id = bizId;
      if (uid) payload.user_id = uid;

      const { data: created, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single();

      if (error || !created) {
        console.error('Supabase addExpense error:', error);
        throw new Error(error?.message || 'Gagal mencatat pengeluaran ke Supabase');
      }

      const newExp: Expense = {
        id: created.id,
        business_id: created.business_id,
        user_id: created.user_id,
        name: created.name,
        amount: Number(created.amount || 0),
        category: created.category as ExpenseCategory,
        date: created.date || data.date,
        notes: created.notes || undefined,
        created_at: created.created_at,
      };

      setExpenses(prev => [newExp, ...prev]);
      return newExp;
    } catch (err: any) {
      console.error('Error addExpense:', err);
      throw err;
    }
  };

  // EXPENSES: UPDATE
  const updateExpense = async (id: string, partial: Partial<Expense>): Promise<void> => {
    try {
      const updatePayload: any = {};
      if (partial.name !== undefined) updatePayload.name = partial.name.trim();
      if (partial.amount !== undefined) updatePayload.amount = Number(partial.amount);
      if (partial.category !== undefined) updatePayload.category = partial.category;
      if (partial.date !== undefined) updatePayload.date = partial.date;
      if (partial.notes !== undefined) updatePayload.notes = partial.notes ? partial.notes.trim() : null;

      let query = supabase.from('expenses').update(updatePayload).eq('id', id);
      if (business?.id) {
        query = query.eq('business_id', business.id);
      }
      const { error } = await query;
      if (error) {
        console.error('Supabase updateExpense error:', error);
        throw new Error(error.message || 'Gagal memperbarui pengeluaran di Supabase');
      }
      setExpenses(prev => prev.map(e => (e.id === id ? { ...e, ...partial } : e)));
    } catch (err) {
      console.error('Error updateExpense:', err);
      throw err;
    }
  };

  // EXPENSES: DELETE
  const deleteExpense = async (id: string): Promise<void> => {
    try {
      let query = supabase.from('expenses').delete().eq('id', id);
      if (business?.id) {
        query = query.eq('business_id', business.id);
      }
      const { error } = await query;
      if (error) {
        console.error('Supabase deleteExpense error:', error);
        throw new Error(error.message || 'Gagal menghapus pengeluaran dari Supabase');
      }
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleteExpense:', err);
      throw err;
    }
  };

  // Clear data (danger zone)
  const clearAllData = async (): Promise<void> => {
    const sb = getSupabase();
    const bizId = business?.id;
    if (sb && bizId) {
      try {
        await sb.from('expenses').delete().eq('business_id', bizId);
        await sb.from('sales').delete().eq('business_id', bizId);
        await sb.from('products').delete().eq('business_id', bizId);
      } catch (err) {
        console.error('Error clearing data in Supabase:', err);
      }
    }
    setProducts([]);
    setTransactions([]);
    setExpenses([]);
  };

  // Export JSON backup
  const exportDataJson = (): string => {
    const backupData = {
      business,
      profile,
      products,
      transactions,
      expenses,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Import JSON backup to Supabase
  const importDataJson = async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.products && Array.isArray(parsed.products)) {
        for (const p of parsed.products) {
          await addProduct({
            name: p.name,
            category: p.category,
            hpp: p.hpp,
            selling_price: p.selling_price,
            stock: p.stock,
            unit: p.unit,
            min_stock: p.min_stock,
          });
        }
      }
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        for (const e of parsed.expenses) {
          await addExpense({
            name: e.name,
            amount: e.amount,
            category: e.category,
            date: e.date,
            notes: e.notes,
          });
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // Real-time Dynamic Report & Dashboard Calculation from Supabase records
  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const todayStr = getTodayDateString();

    // Transactions today
    const todayTxs = transactions.filter(t => {
      const txDateStr = t.date ? t.date.split('T')[0] : '';
      return txDateStr === todayStr;
    });

    const omzetToday = todayTxs.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const hppToday = todayTxs.reduce((sum, t) => sum + (t.total_hpp || 0), 0);
    const transactionsCountToday = todayTxs.length;

    // Expenses today
    const todayExps = expenses.filter(e => e.date === todayStr);
    const expensesToday = todayExps.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Estimated profit today = Omzet - HPP - Expenses
    const estimatedProfitToday = omzetToday - hppToday - expensesToday;

    // Top products by quantity sold
    const productSoldMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    transactions.forEach(t => {
      if (Array.isArray(t.items)) {
        t.items.forEach(item => {
          if (!productSoldMap[item.product_name]) {
            productSoldMap[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
          }
          productSoldMap[item.product_name].quantity += item.quantity;
          productSoldMap[item.product_name].revenue += item.subtotal;
        });
      }
    });

    const topProductsToday = Object.values(productSoldMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 7 Days Trend
    const sevenDaysTrend = [];
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = i === 0 ? 'Hari Ini' : `${dayLabels[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;

      const dayTxs = transactions.filter(t => (t.date ? t.date.split('T')[0] : '') === dateString);
      const dayExps = expenses.filter(e => e.date === dateString);

      const dayOmzet = dayTxs.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const dayHpp = dayTxs.reduce((sum, t) => sum + (t.total_hpp || 0), 0);
      const dayExp = dayExps.reduce((sum, e) => sum + (e.amount || 0), 0);
      const dayProfit = dayOmzet - dayHpp - dayExp;

      sevenDaysTrend.push({
        date: dateString,
        label: dayLabel,
        omzet: dayOmzet,
        profit: dayProfit,
        expenses: dayExp,
      });
    }

    // Low stock items
    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

    return {
      omzetToday,
      expensesToday,
      estimatedProfitToday,
      transactionsCountToday,
      topProductsToday,
      sevenDaysTrend,
      recentTransactions: transactions.slice(0, 5),
      lowStockProducts,
    };
  }, [transactions, expenses, products]);

  return (
    <BusinessContext.Provider
      value={{
        user,
        business,
        profile,
        products,
        transactions,
        expenses,
        isLoadingData,
        isSupabaseConfigured,
        authError,
        login,
        register,
        logout,
        resetPassword,
        refreshData,
        updateProfile,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        createTransaction,
        deleteTransaction,
        addExpense,
        updateExpense,
        deleteExpense,
        dashboardSummary,
        clearAllData,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
