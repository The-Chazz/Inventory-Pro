/**
 * Main Application Component
 * 
 * Handles routing, authentication, and layout for the Inventory Pro application.
 * Includes protected routes that require authentication before access.
 */
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/./../node_modules/.vite/deps_temp_343513f7/react-query";
import { Toaster } from "./src/components/ui/toaster";
import { TooltipProvider } from "./src/components/ui/tooltip";
import { useState, useEffect } from "react";
import NotFound from "./src/pages/not-found";
import Dashboard from "./src/pages/Dashboard";
import Inventory from "./src/pages/Inventory";
import PointOfSale from "./src/pages/PointOfSale";
import UserManagement from "./src/pages/UserManagement";
import ReorderAlerts from "./src/pages/ReorderAlerts";
import Losses from "./src/pages/Losses";
import Settings from "./src/pages/Settings";
import Sales from "./src/pages/Sales";
import Logs from "./src/pages/Logs";
import ProfitTracker from "./src/pages/ProfitTracker";
import Login from "./src/pages/Login";
import SidebarNew from "./src/components/SidebarNew";
import { useAppContext } from "./context/AppContext";
import LogoutModal from "./components/LogoutModal";

/**
 * Types for user authentication and route protection
 */
interface UserData {
  id: number;
  name: string;
  username: string;
  userRole: string;
  lastActive: string;
  status: string;
}

type ProtectedRouteProps = {
  component: React.ComponentType<any>;
  requiredRoles?: string[];
  [key: string]: any;
};

/**
 * Protected Route Component
 * 
 * Guards routes that require authentication and specific user roles.
 * Redirects to login page if user is not authenticated.
 * Can restrict access based on user roles.
 * 
 * @param component - The component to render if authorized
 * @param requiredRoles - Optional array of roles that can access this route
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  requiredRoles = [],
  ...rest 
}) => {
  const [location, setLocation] = useLocation();
  
  /**
   * Check if user is authenticated by verifying session storage
   * Returns the user object if authenticated, null otherwise
   */
  const getAuthenticatedUser = (): UserData | null => {
    try {
      const userJSON = sessionStorage.getItem("user");
      if (!userJSON) return null;
      
      const user: UserData = JSON.parse(userJSON);
      
      // Validate user object structure
      if (!user || typeof user !== 'object' || !user.id || !user.user.role) {
        sessionStorage.removeItem("user"); // Clear invalid data
        return null;
      }
      
      return user;
    } catch (error) {
      // Silently clean up corrupted session data
      sessionStorage.removeItem("user");
      return null;
    }
  };
  
  /**
   * Check if user has required user.role for this route
   */
  const hasRequiredRole = (user: UserData): boolean => {
    // If no specific roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    // Check if user user.role is in the required roles list
    return requiredRoles.includes(user.user.role);
  };
  
  /**
   * Redirect to login page if not authenticated
   */
  useEffect(() => {
    const user = getAuthenticatedUser();
    
    if (!user && location !== "/login") {
      // Not authenticated, redirect to login
      setLocation("/login");
    } else if (user && !hasRequiredRole(user) && location !== "/dashboard") {
      // Authenticated but not authorized for this route - silently redirect to dashboard
      setLocation("/dashboard");
    }
  }, [location, setLocation, requiredRoles]);
  
  const user = getAuthenticatedUser();
  
  // Render component only if authenticated and authorized
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (!hasRequiredRole(user)) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component {...rest} />;
};

/**
 * Router Component
 * 
 * Handles all routes for the application with user.role-based access control.
 * Updates page title based on current route.
 */
function RouterComponent() {
  const { setCurrentPage } = useAppContext();
  const [location] = useLocation();

  // Define roles for route access control
  const ADMIN_ONLY = ['Administrator'];
  const ADMIN_AND_MANAGER = ['Administrator', 'Manager'];
  const ALL_ROLES = ['Administrator', 'Manager', 'Cashier', 'Stocker'];

  useEffect(() => {
    // Update page title based on current route
    const updatePageFromPath = () => {
      const path = window.location.pathname;
      const pageMap: Record<string, string> = {
        "/": "Dashboard",
        "/dashboard": "Dashboard",
        "/inventory": "Inventory",
        "/pos": "Point of Sale",
        "/users": "User Management",
        // Business Analytics removed as requested
        "/losses": "Losses",
        "/profit-tracker": "Profit Tracker",
        "/settings": "Settings",
        "/sales": "Sales History",
        "/logs": "System Logs"
      };
      
      // Update page title in context
      setCurrentPage(pageMap[path] || "Dashboard");
      
      // Update document title for better UX
      document.title = `Inventory Pro | ${pageMap[path] || "Dashboard"}`;
    };

    updatePageFromPath();
    
    // Listen for route changes
    window.addEventListener("popstate", updatePageFromPath);
    
    return () => {
      window.removeEventListener("popstate", updatePageFromPath);
    };
  }, [setCurrentPage, location]);

  return (
    <Switch key={location}>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      {/* Dashboard - accessible to all */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} requiredRoles={ALL_ROLES} />
      </Route>
      
      {/* Inventory - accessible to all except pure cashiers */}
      <Route path="/inventory">
        <ProtectedRoute 
          component={Inventory} 
          requiredRoles={['Administrator', 'Manager', 'Stocker']} 
        />
      </Route>
      
      {/* Point of Sale - accessible to all */}
      <Route path="/pos">
        <ProtectedRoute component={PointOfSale} requiredRoles={ALL_ROLES} />
      </Route>
      
      {/* User Management - admin only */}
      <Route path="/users">
        <ProtectedRoute component={UserManagement} requiredRoles={ADMIN_ONLY} />
      </Route>
      
      {/* Business Analytics route removed as requested */}
      
      {/* Reorder Alerts route removed as requested */}
      
      {/* Losses - accessible to all except pure cashiers */}
      <Route path="/losses">
        <ProtectedRoute 
          component={Losses} 
          requiredRoles={['Administrator', 'Manager', 'Stocker']} 
        />
      </Route>
      
      {/* Settings - admin and manager only */}
      <Route path="/settings">
        <ProtectedRoute component={Settings} requiredRoles={ADMIN_AND_MANAGER} />
      </Route>
      
      {/* Sales History - accessible to admin, manager, and cashier */}
      <Route path="/sales">
        <ProtectedRoute component={Sales} requiredRoles={['Administrator', 'Manager', 'Cashier']} />
      </Route>
      
      {/* System Logs - admin only */}
      <Route path="/logs">
        <ProtectedRoute component={Logs} requiredRoles={ADMIN_ONLY} />
      </Route>
      
      {/* Profit Tracker - admin and manager only */}
      <Route path="/profit-tracker">
        <ProtectedRoute component={ProfitTracker} requiredRoles={ADMIN_AND_MANAGER} />
      </Route>
      
      {/* 404 Not Found - fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Root Application Component
 * 
 * Main application entry point that sets up the React Query provider,
 * tooltip provider, and main application layout.
 * Renders different layouts for login vs. authenticated pages.
 */
function App() {
  const { sidebarCollapsed } = useAppContext();
  const [location] = useLocation();
  const isLoginPage = location === "/login";
  
  /**
   * Security check to ensure secure session storage
   */
  useEffect(() => {
    // Add security headers for XSS protection
    // Note: These are best implemented server-side but we add client-side as fallback
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;";
    document.head.appendChild(meta);
    
    // Session check interval - verify user session periodically
    const sessionCheckInterval = setInterval(() => {
      try {
        const userJSON = sessionStorage.getItem("user");
        if (userJSON) {
          const user = JSON.parse(userJSON);
          
          // Validate user object structure
          if (!user || typeof user !== 'object' || !user.id || !user.user.role) {
            sessionStorage.removeItem("user");
            window.location.href = "/login";
          }
          
          // Check if session is still valid using the sessionValidUntil timestamp
          if (user.sessionValidUntil) {
            const sessionExpiry = new Date(user.sessionValidUntil).getTime();
            const now = new Date().getTime();
            
            if (now > sessionExpiry) {
              sessionStorage.removeItem("user");
              window.location.href = "/login";
            }
          } else {
            // Fallback to checking lastActive if sessionValidUntil is not present
            // (for backward compatibility with existing sessions)
            const lastActive = new Date(user.lastActive).getTime();
            const now = new Date().getTime();
            const twoHoursInMs = 2 * 60 * 60 * 1000;
            
            if (now - lastActive > twoHoursInMs) {
              sessionStorage.removeItem("user");
              window.location.href = "/login";
            }
          }
        }
      } catch (error) {
        // On error, silently clear session and redirect to login
        sessionStorage.removeItem("user");
        window.location.href = "/login";
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
       <Toaster />
        {isLoginPage ? (
          // Login page layout - no sidebar
          <RouterComponent />
        ) : (
          // Main application layout with sidebar
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <SidebarNew />
            <div 
              className={`main-content flex-1 overflow-auto transition-all duration-300 ${
                sidebarCollapsed ? 'ml-[70px]' : 'ml-64'
              }`}
            >
              <div className="p-4 min-h-screen">
                <RouterComponent />
              </div>
            </div>
            <LogoutModal />
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
