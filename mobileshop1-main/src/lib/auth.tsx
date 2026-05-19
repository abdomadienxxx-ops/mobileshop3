import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { AuthState } from './types';

const AuthContext = createContext<AuthState & { signIn: (e: string, p: string) => Promise<void>; signUp: (e: string, p: string) => Promise<void>; signOut: () => Promise<void> }>({
  user: null,
  role: null,
  tenantId: null,
  tenantName: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
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
        setState({ user: null, role: null, tenantId: null, tenantName: null, loading: false });
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      throw new Error(error.message || 'Sign in failed');
    }
    if (data.session?.user) {
      const user = data.session.user;
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (!roles || roles.length === 0) {
          const { data: tenant } = await supabase
            .from('tenants')
            .insert({ name: 'My Store' })
            .select()
            .single();
          if (tenant) {
            await supabase
              .from('user_roles')
              .insert({ user_id: user.id, tenant_id: tenant.id, role: 'store_owner' });
          }
        }
      } catch {
        // ignore – loadProfile handles the fallback
      }
      await loadProfile(user.id, user.email || '');
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
      throw new Error(error.message || 'Sign up failed');
    }
    if (data.session?.user) {
      const user = data.session.user;
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (!roles || roles.length === 0) {
          const { data: tenant } = await supabase
            .from('tenants')
            .insert({ name: 'My Store' })
            .select()
            .single();
          if (tenant) {
            await supabase
              .from('user_roles')
              .insert({ user_id: user.id, tenant_id: tenant.id, role: 'store_owner' });
          }
        }
      } catch {
        // ignore – loadProfile handles the fallback
      }
      await loadProfile(user.id, user.email || '');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: null, tenantId: null, tenantName: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
