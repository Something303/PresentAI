'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Profile } from '@/types';
import { isDemoMode } from '@/lib/config';
import { MOCK_PROFILE } from '@/lib/mock/data';
import { createClient, setRememberMe } from '@/lib/supabase/client';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, check sessionStorage first (unchecked "remember me"), then
      // localStorage, for simulated auth.
      const savedUser = sessionStorage.getItem('presentai-demo-user') || localStorage.getItem('presentai-demo-user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('presentai-demo-user');
          sessionStorage.removeItem('presentai-demo-user');
        }
      }
      setIsLoading(false);
      return;
    }

    // Real Supabase auth
    const initAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser(profile);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    if (isDemoMode) {
      // Demo login: accept any credentials. Unchecked "remember me" keeps the simulated
      // session in sessionStorage only, so it doesn't survive closing the tab/browser.
      const demoUser = { ...MOCK_PROFILE, email, name: email.split('@')[0] };
      setUser(demoUser);
      localStorage.removeItem('presentai-demo-user');
      sessionStorage.removeItem('presentai-demo-user');
      (remember ? localStorage : sessionStorage).setItem('presentai-demo-user', JSON.stringify(demoUser));
      return {};
    }
    try {
      // Must be set before signInWithPassword() persists the new session, so the auth
      // storage adapter (see lib/supabase/client.ts) writes it to the right place.
      setRememberMe(remember);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setUser(profile);
      }
      return {};
    } catch {
      return { error: 'Login failed' };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (isDemoMode) {
      const demoUser = { ...MOCK_PROFILE, name, email };
      setUser(demoUser);
      localStorage.setItem('presentai-demo-user', JSON.stringify(demoUser));
      return {};
    }
    try {
      setRememberMe(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          email,
          language: 'id',
          preferred_examiner: 'general_audience',
          default_difficulty: 'medium',
          theme: 'system',
        });
        const profile: Profile = {
          id: data.user.id,
          name,
          email,
          language: 'id',
          preferred_examiner: 'general_audience',
          default_difficulty: 'medium',
          theme: 'system',
          created_at: new Date().toISOString(),
        };
        setUser(profile);
      }
      return {};
    } catch {
      return { error: 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem('presentai-demo-user');
      sessionStorage.removeItem('presentai-demo-user');
      setUser(null);
      return;
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No authenticated user to update.');
    const updated = { ...user, ...updates };
    if (isDemoMode) {
      setUser(updated);
      // Keep whichever storage the demo session is already using (localStorage for a
      // remembered login, sessionStorage otherwise) instead of always re-persisting it.
      const store = sessionStorage.getItem('presentai-demo-user') ? sessionStorage : localStorage;
      store.setItem('presentai-demo-user', JSON.stringify(updated));
      return;
    }
    // Only update local/UI state once the write actually succeeds below — optimistically
    // setting it here (as before) meant the Settings page had no way to know the save had
    // failed, since the error was swallowed and the UI kept showing the new values regardless.
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Failed to update profile.');
    }
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
