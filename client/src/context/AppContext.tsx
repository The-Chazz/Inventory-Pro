import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Notification object type definition
 */
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Current user interface
 */
export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: string;
  lastActive: string;
}

interface AppContextType {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  showLogoutModal: boolean;
  setShowLogoutModal: (show: boolean) => void;
  scannerActive: boolean;
  toggleScanner: () => void;
  // User related state and functions
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  // Notification related state and functions
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showNotifications: boolean;
  toggleNotifications: () => void;
  unreadCount: number;
}

// Create a context with default values
const AppContext = createContext<AppContextType>({
  currentPage: 'Dashboard',
  setCurrentPage: () => {},
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  showLogoutModal: false,
  setShowLogoutModal: () => {},
  scannerActive: false,
  toggleScanner: () => {},
  currentUser: null,
  setCurrentUser: () => {},
  notifications: [],
  addNotification: () => {},
  markNotificationAsRead: () => {},
  markAllNotificationsAsRead: () => {},
  clearNotification: () => {},
  clearAllNotifications: () => {},
  showNotifications: false,
  toggleNotifications: () => {},
  unreadCount: 0
});

/**
 * App Context Provider component
 * Manages global application state including notifications and user authentication
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load user from sessionStorage on app start
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        sessionStorage.removeItem("user");
      }
    }
  }, []);

  // Save user to sessionStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem("user", JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem("user");
    }
  }, [currentUser]);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Generate low stock notifications on app load
  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        const response = await fetch('/api/alerts/low-stock');
        if (response.ok) {
          const lowStockItems = await response.json();
          
          if (Array.isArray(lowStockItems) && lowStockItems.length > 0) {
            // Add a notification for low stock items
            addNotification({
              type: 'warning',
              title: 'Low Stock Alert',
              message: `${lowStockItems.length} items are low in stock and need attention.`
            });
          }
        }
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      }
    };

    fetchLowStockItems();
    
    // Add some sample notifications for demo purposes
    setTimeout(() => {
      addNotification({
        type: 'info',
        title: 'New Feature: Losses Tracking',
        message: 'Track damaged or expired inventory items in the new Losses section!'
      });
    }, 1000);
    
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Daily Sales Goal Reached',
        message: 'Congratulations! The team has reached the daily sales target of $1,000.'
      });
    }, 2000);
    
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleScanner = () => {
    setScannerActive(!scannerActive);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  /**
   * Add a new notification to the notifications list
   */
  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  /**
   * Mark a notification as read
   */
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  /**
   * Remove a notification from the list
   */
  const clearNotification = (id: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  };

  /**
   * Clear all notifications
   */
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    currentPage,
    setCurrentPage,
    sidebarCollapsed,
    toggleSidebar,
    showLogoutModal,
    setShowLogoutModal,
    scannerActive,
    toggleScanner,
    currentUser,
    setCurrentUser,
    notifications,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
    showNotifications,
    toggleNotifications,
    unreadCount
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
