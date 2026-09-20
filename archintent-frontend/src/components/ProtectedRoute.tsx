import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: string;
  allowedRoles?: string[];
}

const getDashboardPath = (role?: string) => {
  if (role === 'client') return '/dashboard/client';
  if (role === 'architect') return '/dashboard/architect';
  if (role === 'contractor') return '/dashboard/contractor';
  if (role === 'admin') return '/dashboard/admin';
  return '/login';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole, allowedRoles }) => {
  const auth = useContext(AuthContext);

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const { user, token, isLoading, clearAuth } = auth;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.account_status === 'suspended') {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  const effectiveAllowedRole = allowedRole ?? (allowedRoles && allowedRoles.length === 1 ? allowedRoles[0] : undefined);

  if (effectiveAllowedRole && user.role !== effectiveAllowedRole) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Allow architects/contractors with pending account status to complete their profile
  // Only redirect to pending verification for other roles or after profile is complete
  const isProfilePage = window.location.pathname.includes('/profile');
  const isArchitectOrContractor = user.role === 'architect' || user.role === 'contractor';
  
  if (user.account_status === 'pending' && (!isProfilePage || !isArchitectOrContractor)) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
