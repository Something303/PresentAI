import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

const REMEMBER_KEY = 'presentai-remember-me';

// Backs the Supabase auth session with localStorage (persists across browser restarts)
// when "Ingat saya" is checked, or sessionStorage (cleared once the tab/browser closes)
// when it isn't. The preference itself must live in localStorage so it survives long
// enough to be read back on the next page load, before we know which storage the
// session itself is in.
function rememberedSession(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== '0';
}

function authStorage() {
  return {
    getItem: (key: string) => (rememberedSession() ? localStorage : sessionStorage).getItem(key),
    setItem: (key: string, value: string) => {
      (rememberedSession() ? localStorage : sessionStorage).setItem(key, value);
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  };
}

export function setRememberMe(remember: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

let cachedClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';
  const isBrowser = typeof window !== 'undefined';

  cachedClient = createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      storage: isBrowser ? authStorage() : undefined,
    },
  });
  return cachedClient;
}
