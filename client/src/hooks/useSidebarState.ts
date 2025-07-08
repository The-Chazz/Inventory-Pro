import { useAppContext } from "./src/context/AppContext";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "./../../node_modules/.vite/deps_temp_343513f7/react";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  isActive: boolean;
  roles?: string[]; // Roles that can access this item
}

export function useSidebarState() {
  const { currentPage, sidebarCollapsed, toggleSidebar } = useAppContext();
  const [, navigate] = useLocation();
  const [user.role, setUserRole] = useState<string>("Cashier"); // Default to Cashier for safety
  
  // Check if route is active
  const [isDashboardActive] = useRoute("/");
  const [isDashboardExactActive] = useRoute("/dashboard");
  const [isInventoryActive] = useRoute("/inventory");
  const [isPosActive] = useRoute("/pos");
  const [isUsersActive] = useRoute("/users");
  const [isReportsActive] = useRoute("/reports");
  const [isAlertsActive] = useRoute("/alerts");
  const [isLossesActive] = useRoute("/losses");
  const [isProfitTrackerActive] = useRoute("/profit-tracker");
  
  useEffect(() => {
    // Get user info from session storage
    const userInfo = sessionStorage.getItem("user");
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setUserRole(user.user.role || "Cashier");
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);
  
  // Define all possible navigation items
  const allNavItems: NavItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: 'fa-tachometer-alt',
      path: '/dashboard',
      isActive: isDashboardActive || isDashboardExactActive,
      roles: ["Administrator", "Manager", "Cashier", "Stocker"] // All roles can access
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: 'fa-boxes-stacked',
      path: '/inventory',
      isActive: isInventoryActive,
      roles: ["Administrator", "Manager", "Stocker"] // Cashiers can't manage inventory
    },
    { 
      id: 'pos', 
      label: 'Point of Sale', 
      icon: 'fa-cash-register',
      path: '/pos',
      isActive: isPosActive,
      roles: ["Administrator", "Manager", "Cashier"] // All roles except stocker can access POS
    },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: 'fa-users',
      path: '/users',
      isActive: isUsersActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can manage users
    },
    { 
      id: 'reports', 
      label: 'Business Analytics', 
      icon: 'fa-chart-bar', // Using the bar chart icon previously used for profit tracker
      path: '/reports',
      isActive: isReportsActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can see analytics
    },
    { 
      id: 'alerts', 
      label: 'Reorder Alerts', 
      icon: 'fa-bell',
      path: '/alerts',
      isActive: isAlertsActive,
      roles: ["Administrator", "Manager", "Stocker"] // Cashiers don't need alerts
    },
    { 
      id: 'losses', 
      label: 'Losses', 
      icon: 'fa-triangle-exclamation',
      path: '/losses',
      isActive: isLossesActive,
      roles: ["Administrator", "Manager", "Stocker"] // Cashiers don't need access to losses
    },
    { 
      id: 'profit-tracker', 
      label: 'Profit Tracker', 
      icon: 'fa-dollar-sign', // Using dollar sign icon as requested
      path: '/profit-tracker',
      isActive: isProfitTrackerActive,
      roles: ["Administrator", "Manager"] // Only admin and manager can track profits
    },
  ];

  // Filter items based on user user.role
  const navItems = allNavItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  return {
    currentPage,
    sidebarCollapsed,
    toggleSidebar,
    navItems,
    navigate,
    user.role
  };
}
