import { createContext, useContext, useState } from 'react';
import type { AuthState } from './types';

const MOCK_USER: AuthState = {
  user: { id: '00000000-0000-0000-0000-000000000001', email: 'demo@phonevault.com' },
  role: 'store_owner',
  tenantId: '00000000-0000-0000-0000-000000000002',
  tenantName: 'PhoneVault Demo Shop',
  loading: false,
};

const AuthContext = createContext<AuthState & { signIn: (e: string, p: string) => Promise<void>; signOut: () => Promise<void> }>({
  ...MOCK_USER,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state] = useState<AuthState>(MOCK_USER);

  const signIn = async () => {};
  const signOut = async () => {};

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
