import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Notification } from '../types/Notification';

// Mock data
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Document Approved',
    message: 'John Doe approved "Q1 2025 Financial Report"',
    time: '2 hours ago',
    read: false
  },
  {
    id: 'notif-2',
    title: 'New Comment',
    message: 'Jane Smith commented on "Employee Handbook 2025"',
    time: '5 hours ago',
    read: false
  },
  {
    id: 'notif-3',
    title: 'Document Rejected',
    message: 'Jane Smith rejected "Product Launch Plan"',
    time: 'Yesterday',
    read: true
  },
  {
    id: 'notif-4',
    title: 'Collaborator Added',
    message: 'You were added as a collaborator on "IT Security Policy"',
    time: '2 days ago',
    read: true
  }
];

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };
  
  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead }}>
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