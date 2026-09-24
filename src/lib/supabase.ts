import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback values used when environment variables are not yet provided
// to avoid runtime errors during build or initial startup
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey = 'placeholder-anon-key';

const resolvedUrl = supabaseUrl || (typeof localStorage !== 'undefined' ? getStoredConfig()?.url : '') || fallbackUrl;
const resolvedKey = supabaseAnonKey || (typeof localStorage !== 'undefined' ? getStoredConfig()?.anonKey : '') || fallbackAnonKey;

/**
 * Initialized Supabase client instance using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Exported for use throughout the application.
 */
export let supabase: SupabaseClient = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

function getStoredConfig(): { url?: string; anonKey?: string } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bisnisku_supabase_config');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the current configuration and whether valid credentials are set.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      isConfigured: true,
    };
  }

  const stored = getStoredConfig();
  if (stored?.url && stored?.anonKey) {
    return {
      url: stored.url.trim(),
      anonKey: stored.anonKey.trim(),
      isConfigured: true,
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
  };
}

/**
 * Saves configuration to localStorage and re-initializes the exported supabase client.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      'bisnisku_supabase_config',
      JSON.stringify({
        url: cleanUrl,
        anonKey: cleanKey,
      })
    );
  }

  supabase = createClient(cleanUrl || fallbackUrl, cleanKey || fallbackAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Returns the active Supabase client instance or null if unconfigured.
 */
export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }
  return supabase;
}

/**
 * Tests connection to a Supabase instance.
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'URL atau Anon Key Supabase masih kosong.' };
    }

    const testClient = createClient(cleanUrl, cleanKey);
    const { error } = await testClient.auth.getSession();
    if (error) {
      return { success: false, message: `Respon Supabase: ${error.message}` };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Database PostgreSQL siap digunakan.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Network error'}`,
    };
  }
}

export default supabase;
