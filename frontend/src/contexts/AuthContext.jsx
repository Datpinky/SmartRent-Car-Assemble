import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((nextUser) => {
    localStorage.setItem('smartrent_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('smartrent_token');
    if (!token) {
      setUser(null);
      return null;
    }

    const apiUser = await authService.getCurrentUser();
    persistUser(apiUser);
    return apiUser;
  }, [persistUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('smartrent_token');
      if (!token) {
        try {
          const saved = localStorage.getItem('smartrent_user');
          if (saved) localStorage.removeItem('smartrent_user');
        } catch {
          /* ignore */
        }
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const u = await authService.getMe();
        if (!cancelled && u) {
          setUser(u);
          localStorage.setItem('smartrent_user', JSON.stringify(u));
        }
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 401) {
          authService.logout();
          setUser(null);
        } else {
          try {
            const saved = localStorage.getItem('smartrent_user');
            if (saved && saved !== 'undefined' && saved !== 'null' && saved.trim().startsWith('{')) {
              setUser(JSON.parse(saved));
            }
          } catch {
            authService.logout();
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { user: apiUser } = await authService.login(email, password);
      persistUser(apiUser);
      return { success: true, user: apiUser };
    } catch (err) {
      const message = err.status === 401
        ? 'Email hoac mat khau khong dung.'
        : (err.message || 'Dang nhap that bai.');
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password, phone, accountType = 'renter') => {
    try {
      await authService.registerConsumer({
        name,
        email,
        password,
        phone,
        account_type: accountType,
      });
      return { success: true };
    } catch (err) {
      const message = err.status === 409
        ? 'Email nay da ton tai. Hay dang nhap bang tai khoan hien co.'
        : err.message;
      return { success: false, error: message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  /** Cố định tham chiếu để tránh useEffect (vd. Profile) phụ thuộc chạy lại vô hạn. */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('smartrent_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
