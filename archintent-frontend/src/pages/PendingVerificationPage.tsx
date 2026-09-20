import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PendingVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, isLoading, logout } = useAuth();

  useEffect(() => {
    document.title = 'Pending Verification — ArchIntent';
  }, []);

  const getDashboardPath = (role?: string) => {
    if (role === 'client') return '/dashboard/client';
    if (role === 'architect') return '/dashboard/architect';
    if (role === 'contractor') return '/dashboard/contractor';
    if (role === 'admin') return '/dashboard/admin';
    return '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.account_status !== 'pending') {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const handleCompleteProfile = () => {
    const roleRoutes: Record<string, string> = {
      architect: '/dashboard/architect/profile',
      contractor: '/dashboard/contractor/profile',
    };
    const route = roleRoutes[user?.role || ''];
    if (route) {
      navigate(route);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const subtitle =
    user.role === 'architect'
      ? 'Your architect profile is under review by our admin team. This usually takes 1-2 business days.'
      : 'Your company profile is under review by our admin team. This usually takes 1-2 business days.';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-10 w-full max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-indigo-950/60 border border-indigo-800/50 p-6 text-indigo-300">
            <Clock className="w-14 h-14" strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-100 mb-3">
          Account Pending Verification
        </h1>

        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          {subtitle}
        </p>

        <div className="bg-slate-800/80 border border-slate-600 rounded-lg p-5 mb-8 text-left max-w-xl mx-auto">
          <p className="text-sm font-semibold text-slate-200 mb-3">While you wait, you can:</p>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              Complete your profile information
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              Prepare your portfolio images
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              Read our platform guide
            </div>
          </div>
        </div>

        <div className="space-y-3 max-w-sm mx-auto">
          <button
            onClick={handleCompleteProfile}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-500 transition duration-200"
          >
            Complete My Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full border border-slate-600 text-slate-200 font-semibold py-3 rounded-lg hover:bg-slate-800 transition duration-200"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 text-sm text-slate-500 space-y-1">
          <p>You will receive an email notification once verified.</p>
          <p>Questions? Contact support@archintent.com</p>
        </div>
      </div>
    </div>
  );
};

export default PendingVerificationPage;
