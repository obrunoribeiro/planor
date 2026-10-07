// Contexto de autenticação — expõe a sessão do Supabase pro resto do app. O root _layout usa
// `loading`/`session` pra decidir entre o fluxo (auth) e o (tabs).
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    loading,
    async signInWithOtp(email) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      return { error: error?.message ?? null };
    },
    async verifyOtp(email, token) {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      return { error: error?.message ?? null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
