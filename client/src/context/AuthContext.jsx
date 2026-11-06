import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } catch {
        setUser(null);
        setAuthToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshUser]);

  const login = async (identifier, password) => {
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      setAuthToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      setAuthToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, booting, login, register, logout, refreshUser, setUser }),
    [user, booting, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
