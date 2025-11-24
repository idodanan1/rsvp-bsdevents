import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const user = useUserStore(state => state.user);
  const logout = useUserStore(state => state.logout);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand persistence to hydrate before checking auth
  useEffect(() => {
    // Small delay to ensure Zustand has hydrated from localStorage
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // CRITICAL FIX: Always check both isAuthenticated AND user exists
  // This prevents access when localStorage has stale isAuthenticated: true but user: null
  // Also prevents auto-login to wrong users
  React.useEffect(() => {
    if (isHydrated && isAuthenticated && !user) {
      console.warn('⚠️ Invalid authentication state detected in ProtectedRoute - clearing');
      logout();
    }
  }, [isHydrated, isAuthenticated, user, logout]);

  // Show loading screen while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no user, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

