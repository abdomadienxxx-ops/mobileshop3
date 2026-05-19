import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { AuthState } from './types';

const AuthContext = createContext<AuthState & { signIn: (e: string, p: string) => Promise<void>; signOut: () => Promise<void> }>({
  user: null,
  role: null,
  tenantId: null,
  tenantName: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    tenantId: null,
    tenantName: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string, email: string) => {
    if (!isSupabaseConfigured) { setState((prev) => ({ ...prev, loading: false })); return; }
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*, tenants(name)')
        .eq('user_id', userId)
        .limit(1);

      if (roles && roles.length > 0) {
        const r = roles[0];
        setState({
          user: { id: userId, email },
          role: r.role as 'super_admin' | 'store_owner',
          tenantId: r.tenant_id,
          tenantName: r.tenants?.name || null,
          loading: false,
        });
      } else {
        setState({
          user: { id: userId, email },
          role: null,
          tenantId: null,
          tenantName: null,
          loading: false,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setState((prev) => ({ ...prev, loading: false })); return; }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          loadProfile(session.user.id, session.user.email || '');
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email || '');
      } else {
        setState({ user: null, role: null, tenantId: null, tenantName: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setState({ user: null, role: null, tenantId: null, tenantName: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
