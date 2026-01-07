import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from '@/api/axios';
import { Notification } from '../types/Notification';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    // Don't set loading on every poll to avoid flickering, only on initial mount or manual refresh logic if desired
    // But since we want to debug, maybe we can leave it false for polling.
    // However, for the very first load, we want it true.
    // We initialized loading to true.

    try {
      const response = await axios.get('/notifications');
      // console.log('🔔 Notifications API Response:', response.data); 

      let dataToProcess: any[] = [];

      // Handle different response structures
      if (Array.isArray(response.data)) {
        // Direct array response
        dataToProcess = response.data;
      } else if (response.data?.success && Array.isArray(response.data?.data)) {
        // Standard wrapper response
        dataToProcess = response.data.data;
      } else if (response.data?.data && Array.isArray(response.data?.data)) {
        // Just data wrapper
        dataToProcess = response.data.data;
      } else {
        console.warn('Unexpected notifications response format:', response.data);
        // Don't fail completely, just show empty
        setNotifications([]);
        return;
      }

      // Normalize data (backend returns Uppercase keys, frontend expects lowercase)
      const normalizedNotifications: Notification[] = dataToProcess.map((item: any) => ({
        id: item.ID || item.id,
        title: item.Title || item.title,
        message: item.Message || item.message,
        type: item.Type || item.type,
        link: item.Link || item.link,
        read: item.IsRead !== undefined ? Boolean(item.IsRead) : item.read,
        createdAt: item.CreatedAt || item.createdAt,
        metadata: typeof item.Metadata === 'string' ? JSON.parse(item.Metadata) : (item.Metadata || item.metadata)
      }));

      setNotifications(normalizedNotifications);
      setError(null);

    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );

      await axios.put(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert if needed? usually not critical for read status
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      await axios.put('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      error,
      addNotification,
      markAsRead,
      markAllAsRead,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};