import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUnreadCount } from '../context/UnreadCountContext';
import {
  Building2,
  Menu,
  X,
  ArrowRight,
  Search,
  LogIn,
} from 'lucide-react';

const getDashboardPath = (role?: string) => {
  if (role === 'client') return '/dashboard/client';
  if (role === 'architect') return '/dashboard/architect';
  if (role === 'contractor') return '/dashboard/contractor';
  if (role === 'admin') return '/dashboard/admin';
  return '/login';
};

const PublicNavbar: React.FC = () => {
  const { user, token } = useAuth();
  const { unreadCount } = useUnreadCount();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isAuthenticated = Boolean(token && user);

  // A logged-in visitor browsing a public page (home, architect
  // profiles, etc.) previously still saw "Login" and "Register" here --
  // both nonsensical once already signed in. Swapped for quick links
  // back into the account instead, with the same unread-messages badge
  // MainLayout's sidebar already shows.
  const navLinks = isAuthenticated
    ? [
        { label: 'Home', path: '/' },
        { label: 'Browse Architects', path: '/architects' },
        { label: 'Messages', path: '/messages', badge: unreadCount > 0 ? unreadCount : undefined },
        { label: 'Profile', path: '/profile' },
      ]
    : [
        { label: 'Home', path: '/' },
        { label: 'Browse Architects', path: '/architects' },
        { label: 'Login', path: '/login' },
        { label: 'Register', path: '/register' },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
            <Building2 size={20} />
          </div>
          <span className="text-xl font-black text-white italic uppercase tracking-tighter">ArchIntent</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300
                ${isActive(link.path)
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {link.label}
              {!!link.badge && (
                <span className="flex items-center justify-center min-w-[16px] h-4 px-1 bg-indigo-600 text-white text-[9px] font-black rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          {token && user ? (
            <button
              onClick={() => navigate(getDashboardPath(user.role))}
              className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-500 transition-all duration-300 shadow-lg shadow-indigo-500/20"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-500 transition-all duration-300 shadow-lg shadow-indigo-500/20"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Get Started</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-2 animate-in slide-in-from-top">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center justify-between px-5 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                ${isActive(link.path) ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {link.label}
              {!!link.badge && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
          <div className="pt-4 border-t border-white/5 space-y-2">
            {token && user ? (
              <button
                onClick={() => { setMobileOpen(false); navigate(getDashboardPath(user.role)); }}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-xl"
              >
                <span className="text-xs font-black uppercase tracking-widest">Dashboard</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); navigate('/register'); }}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-xl"
              >
                <span className="text-xs font-black uppercase tracking-widest">Get Started</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
