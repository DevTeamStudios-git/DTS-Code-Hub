import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  language: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  requires2FA: boolean;
  twoFactorVerified: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ requires2FA: boolean }>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithOAuth: (provider: 'github' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    requires2FA: false,
    twoFactorVerified: false,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.get<{ user: UserProfile }>('/api/auth/session');
      setState(prev => ({ ...prev, profile: data.user }));
    } catch {
      setState(prev => ({ ...prev, profile: null }));
    }
  }, []);

  useEffect(() => {
    // Initialize session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
      if (session) fetchProfile();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        requires2FA: session ? prev.requires2FA : false,
        twoFactorVerified: session ? prev.twoFactorVerified : false,
      }));
      if (session) {
        fetchProfile();
      } else {
        setState(prev => ({ ...prev, profile: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // Check if 2FA is required via our API
    try {
      const result = await api.post<{ requires2FA: boolean }>('/api/auth/login', { email, password });
      if (result.requires2FA) {
        setState(prev => ({ ...prev, requires2FA: true, twoFactorVerified: false }));
      }
      return { requires2FA: result.requires2FA };
    } catch {
      // If the API check fails, proceed without 2FA
    }

    void data;
    return { requires2FA: false };
  };

  const signUp = async (email: string, password: string, username: string) => {
    await api.post('/api/auth/register', { email, password, username });
  };

  const signInWithOAuth = async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState(prev => ({
      ...prev,
      session: null,
      user: null,
      profile: null,
      requires2FA: false,
      twoFactorVerified: false,
    }));
  };

  const verify2FA = async (code: string) => {
    await api.post('/api/2fa/verify-session', { code });
    setState(prev => ({ ...prev, requires2FA: false, twoFactorVerified: true }));
    sessionStorage.setItem('2fa_verified', '1');
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const result = await api.put<{ user: UserProfile }>('/api/users/me', data);
    setState(prev => ({ ...prev, profile: result.user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithOAuth, signOut, verify2FA, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
