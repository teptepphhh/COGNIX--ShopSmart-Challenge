import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// Keeps the signed-in customer for the UI only. The API still checks the session on every private request.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    user,
    checking,
    async login(credentials) { const data = await api.login(credentials); setUser(data.user); return data.user; },
    async register(account) { const data = await api.register(account); setUser(data.user); return data.user; },
    async logout() { try { await api.logout(); } finally { setUser(null); } },
    signedOut() { setUser(null); }
  }), [user, checking]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
