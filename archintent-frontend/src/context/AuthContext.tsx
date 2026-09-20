import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { User, AuthContextType } from '../types/auth';
import axiosInstance from '../api/axios';
import { disconnectEcho } from '../lib/echo';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    disconnectEcho();
  }, []);

  const syncProfileFromServer = useCallback(async (): Promise<User | null> => {
    const response = await axiosInstance.get('/profile');
    const data = response.data?.data as User | undefined;
    if (data) {
      setUser(data);
      sessionStorage.setItem('user', JSON.stringify(data));
      return data;
    }
    return null;
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!sessionStorage.getItem('token')) return;
    try {
      await syncProfileFromServer();
    } catch {
      // 401 clears storage via axios interceptor; avoid throwing into callers
    }
  }, [syncProfileFromServer]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!sessionStorage.getItem('token')) return false;

    try {
      const data = await syncProfileFromServer();
      if (!data) {
        clearAuth();
        return false;
      }
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [syncProfileFromServer, clearAuth]);

  // Check sessionStorage for token on app load (tab isolated)
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          const response = await axiosInstance.get('/profile', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.data.data) {
            setUser(response.data.data);
            sessionStorage.setItem('user', JSON.stringify(response.data.data));
          }
        } catch {
          clearAuth();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [clearAuth]);

  const login = useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    sessionStorage.setItem('token', nextToken);
    sessionStorage.setItem('user', JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      clearAuth,
      validateToken,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, clearAuth, validateToken, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
