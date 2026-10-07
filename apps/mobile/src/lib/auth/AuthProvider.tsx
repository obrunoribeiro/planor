// Contexto de autenticação — expõe a sessão do Supabase pro resto do app. O root _layout usa
// `loading`/`session` pra decidir entre o fluxo (auth) e o (tabs).
import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabase';

// Necessário pro fluxo web do expo-web-browser fechar a sessão de autenticação sozinho quando o
// Google redireciona de volta — não atrapalha iOS/Android, que fecham o navegador por conta própria.
WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
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
    async signInWithGoogle() {
      // O Supabase faz o fluxo OAuth inteiro (abre o Google, troca o código); a gente só abre o
      // navegador do sistema pra isso e recebe a sessão de volta pelo deep link (scheme "planor").
      // `makeRedirectUri` resolve pro jeito certo tanto no Expo Go (proxy do Expo) quanto num
      // build de verdade.
      const redirectTo = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error.message };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        return { error: result.type === 'cancel' || result.type === 'dismiss' ? null : 'Não foi possível entrar com o Google.' };
      }

      const { params, errorCode } = getQueryParams(result.url);
      if (errorCode) return { error: errorCode };
      if (!params.access_token || !params.refresh_token) {
        return { error: 'O Google não devolveu uma sessão válida.' };
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      return { error: sessionError?.message ?? null };
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
