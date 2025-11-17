import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const user = useUserStore(state => state.user);

  // CRITICAL FIX: Check both isAuthenticated AND user exists
  // This prevents access when localStorage has stale isAuthenticated: true but user: null
  if (!isAuthenticated || !user) {
    // Clear any stale authentication state
    if (isAuthenticated && !user) {
      console.warn('⚠️ Stale authentication state detected - clearing');
      useUserStore.getState().logout();
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

