import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { useAuth } from './AuthContext';

interface UnreadCountContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

export const UnreadCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef<number | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !token || !['client', 'architect', 'contractor', 'admin'].includes(user.role)) {
      setUnreadCount(0);
      return;
    }

    if (location.pathname === '/messages') {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axiosInstance.get('/messages/unread-count');
      setUnreadCount(Number(response.data?.data?.unread_count || 0));
    } catch (_error) {
      setUnreadCount(0);
    }
  }, [location.pathname, token, user]);

  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!user || !token || !['client', 'architect', 'contractor', 'admin'].includes(user.role)) {
      setUnreadCount(0);
      return;
    }

    refreshUnreadCount();

    pollingRef.current = window.setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, [refreshUnreadCount, token, user]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [refreshUnreadCount, unreadCount]
  );

  return <UnreadCountContext.Provider value={value}>{children}</UnreadCountContext.Provider>;
};

export const useUnreadCount = () => {
  const context = useContext(UnreadCountContext);

  if (!context) {
    throw new Error('useUnreadCount must be used within UnreadCountProvider');
  }

  return context;
};
