import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const user = useUserStore(state => state.user);
  const logout = useUserStore(state => state.logout);

  // CRITICAL FIX: Always check both isAuthenticated AND user exists
  // This prevents access when localStorage has stale isAuthenticated: true but user: null
  // Also prevents auto-login to wrong users
  React.useEffect(() => {
    if (isAuthenticated && !user) {
      console.warn('⚠️ Invalid authentication state detected in ProtectedRoute - clearing');
      logout();
    }
  }, [isAuthenticated, user, logout]);

  // If not authenticated or no user, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

