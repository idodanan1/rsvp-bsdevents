import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const user = useUserStore(state => state.user);
  const logout = useUserStore(state => state.logout);
  const navigate = useNavigate();

  // CRITICAL FIX: Always check both isAuthenticated AND user exists
  // This prevents access when localStorage has stale isAuthenticated: true but user: null
  React.useEffect(() => {
    if (isAuthenticated && !user) {
      console.warn('⚠️ Invalid authentication state detected in ProtectedRoute - clearing');
      logout();
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, logout, navigate]);

  // If not authenticated or no user, redirect to login immediately
  // Zustand persist loads instantly from localStorage, so no need to wait
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

