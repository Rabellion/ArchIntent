import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { User } from '../types/auth';
import toast from 'react-hot-toast';

interface FormErrors {
  [key: string]: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, token, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Login — ArchIntent';

    const getDashboardPath = (role?: string) => {
      if (role === 'client') return '/dashboard/client';
      if (role === 'architect') return '/dashboard/architect';
      if (role === 'contractor') return '/dashboard/contractor';
      if (role === 'admin') return '/dashboard/admin';
      return '/login';
    };

    if (!isLoading && token && user) {
      if (user.account_status === 'pending') {
        navigate('/pending-verification', { replace: true });
      } else {
        navigate(getDashboardPath(user.role), { replace: true });
      }
      return;
    }

    const params = new URLSearchParams(location.search);
    const hint = params.get('hint');
    const hintEmailMap: Record<string, string> = {
      client: 'client@test.com',
      architect: 'architect@test.com',
      contractor: 'contractor@test.com',
      admin: 'admin@test.com',
    };

    if (hint && hintEmailMap[hint]) {
      setEmail(hintEmailMap[hint]);
      setPassword('Test@1234');
    }
  }, [isLoading, token, user, navigate, location.search]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Valid email required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      const response = await axiosInstance.post('/login', { email, password });

      if (response.data.data) {
        const { token, user } = response.data.data;
        login(token, user as User);

        toast.success(`Welcome back, ${user.full_name}!`);

        if (user.account_status === 'pending') {
          navigate('/pending-verification');
          return;
        }

        const roleRedirects: Record<string, string> = {
          client: '/dashboard/client',
          architect: '/dashboard/architect',
          contractor: '/dashboard/contractor',
          admin: '/dashboard/admin',
        };

        navigate(roleRedirects[user.role] || '/dashboard');
      }
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.needs_email_verification) {
        const { user_id, email, verification_method } = error.response.data;
        const method = verification_method === 'link' ? 'link' : 'code';
        toast.error('Please verify your email first.');
        navigate(`/verify-otp?userId=${user_id}&email=${encodeURIComponent(email)}&method=${method}`);
        return;
      } else if (error.response?.status === 403) {
        setApiError(error.response.data.message);
      } else if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 pt-24 pb-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/40">
            <span className="material-symbols-outlined text-white text-3xl">login</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-100">Welcome Back</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Authenticate Your Identity</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-[2.5rem] shadow-xl shadow-black/40 border border-slate-700 p-10 sm:p-12">
          {apiError && (
            <div className="p-5 rounded-2xl mb-8 bg-red-950/40 border border-red-800/60">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => { const {email, ...rest} = prev; return rest; }); }}
                disabled={loading}
                className={`w-full px-6 py-4 bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50`}
                placeholder="name@example.com"
              />
              {errors.email && <p className="text-red-500 text-[10px] font-bold mt-2 px-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => { const {password, ...rest} = prev; return rest; }); }}
                disabled={loading}
                className={`w-full px-6 py-4 bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-[10px] font-bold mt-2 px-1">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl hover:bg-indigo-500 disabled:bg-slate-600 transition-all duration-500 mt-4 flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/40"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center mt-8 text-sm text-slate-400">
            No account?{' '}
            <Link to="/register" className="font-black text-indigo-400 hover:text-indigo-300 uppercase text-xs tracking-widest">
              Create One
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
