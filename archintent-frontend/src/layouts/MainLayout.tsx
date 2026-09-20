import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import BudzWallet from '../components/BudzWallet';
import { useUnreadCount } from '../context/UnreadCountContext';
import { resolveImageUrl } from '../utils/storage';
import {
  Menu,
  Grid,
  Folder,
  PlusCircle,
  Search,
  MessageSquare,
  CreditCard,
  User,
  Image,
  Shield,
  Activity,
  LogOut,
  Bell,
  Fingerprint,
  Wallet,
  Store,
  History,
  Layout,
  Users,
  Terminal,
  Zap,
  Maximize2,
  Building2
} from 'lucide-react';

interface NavLinkItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [budzBalance, setBudzBalance] = useState<number>(0);
  const { unreadCount } = useUnreadCount();

  useEffect(() => {
    if (user) {
      fetchPendingAgreements();
      if (user.role === 'contractor') {
        fetchBudzBalance();
      }
    }
  }, [user]);

  const fetchPendingAgreements = async () => {
    try {
      const response = await axiosInstance.get('/agreements/pending');
      setPendingCount(response.data.count || 0);
    } catch (error) {}
  };

  const fetchBudzBalance = async () => {
    try {
      const response = await axiosInstance.get('/budz/wallet');
      setBudzBalance(response.data?.data?.balance || 0);
    } catch (_error) {
      setBudzBalance(0);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavLinks = (): NavLinkItem[] => {
    if (!user) return [];

    const common = [{ label: 'PROFILE', path: '/profile', icon: User }];

    switch (user.role) {
      case 'client':
        return [
          { label: 'DASHBOARD', path: '/dashboard/client', icon: Grid },
          { label: 'MY PROJECTS', path: '/dashboard/client/projects', icon: Folder },
          { label: 'CREATE BRIEF', path: '/dashboard/client/create-project', icon: PlusCircle },
          { label: 'BROWSE ARCHITECTS', path: '/architects', icon: Search },
          { label: 'MESSAGES', path: '/messages', icon: MessageSquare, badge: unreadCount > 0 ? String(unreadCount) : undefined },
          { label: 'PAYMENTS', path: '/dashboard/client/payments', icon: CreditCard },
          ...common,
        ];
      case 'architect':
        return [
          { label: 'DASHBOARD', path: '/dashboard/architect', icon: Grid },
          { label: 'PORTFOLIO', path: '/dashboard/architect/portfolio', icon: Image },
          { label: 'ACTIVE MISSIONS', path: '/dashboard/architect/projects', icon: Layout },
          { label: 'MESSAGES', path: '/messages', icon: MessageSquare, badge: unreadCount > 0 ? String(unreadCount) : undefined },
          ...common,
        ];
      case 'contractor':
        return [
          { label: 'CONTROL CENTER', path: '/dashboard/contractor', icon: Terminal },
          { label: 'FIND JOBS', path: '/construction-jobs', icon: Store },
          { label: 'MY BIDS', path: '/dashboard/contractor/bids', icon: History },
          { label: 'BUY BUDZ', path: '/dashboard/contractor/buy-budz', icon: Wallet },
          { label: 'MESSAGES', path: '/messages', icon: MessageSquare, badge: unreadCount > 0 ? String(unreadCount) : undefined },
          ...common,
        ];
      case 'admin':
        return [
          { label: 'OVERVIEW', path: '/dashboard/admin', icon: Activity },
          { label: 'VERIFY ARCHITECTS', path: '/admin/verify-architects', icon: Shield, badge: pendingCount > 0 ? String(pendingCount) : undefined },
          { label: 'VERIFY CONTRACTORS', path: '/admin/verify-contractors', icon: Fingerprint },
          { label: 'USERS', path: '/admin/users', icon: Users },
          { label: 'ANALYTICS', path: '/admin/analytics', icon: Zap },
          { label: 'AUDIT LOGS', path: '/admin/logs', icon: Terminal },
          ...common,
        ];
      default:
        return common;
    }
  };

  const navLinks = getNavLinks();

  const getLinkClass = (path: string) => {
    const active = isActive(path);
    const collapsed = !sidebarOpen;
    return [
      'flex items-center rounded-2xl transition-all duration-300 group',
      collapsed
        ? 'mx-auto h-11 w-11 shrink-0 items-center justify-center p-0'
        : 'gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5',
      active
        ? 'bg-indigo-700 text-white shadow-xl shadow-indigo-900/30'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
    ].join(' ');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-inter selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-500"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 flex h-full min-h-0 flex-col overflow-x-visible bg-slate-900 border-r border-slate-800 transition-all duration-500 ease-in-out
          ${sidebarOpen ? 'w-80' : 'w-80 lg:w-24'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header — min-height + overflow-visible so logo/hover never clips */}
        <div
          className={`flex shrink-0 items-center border-b border-slate-800 overflow-visible ${
            sidebarOpen
              ? 'min-h-[5.75rem] justify-between gap-3 px-4 py-4 sm:min-h-[6rem] sm:px-5 sm:py-4'
              : 'min-h-[4.75rem] justify-between gap-2 px-2.5 py-3 sm:min-h-[5.75rem] sm:px-3 sm:py-3.5'
          }`}
        >
          <Link
            to="/"
            title={!sidebarOpen ? 'ArchIntent home' : undefined}
            className={`flex items-center overflow-visible group ${
              sidebarOpen ? 'min-w-0 flex-1 gap-3 sm:gap-4' : 'shrink-0 gap-0'
            }`}
          >
            <div
              className={`flex shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/10 transition-colors group-hover:bg-indigo-500 ${
                sidebarOpen ? 'h-12 w-12' : 'h-10 w-10 sm:h-11 sm:w-11'
              }`}
            >
              <Building2 size={sidebarOpen ? 24 : 20} className="shrink-0" strokeWidth={2} />
            </div>
            {sidebarOpen && (
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden py-0.5">
                <span className="truncate font-black text-lg uppercase italic leading-tight tracking-tighter text-slate-100 sm:text-xl">
                  ArchIntent
                </span>
                <span className="truncate text-[8px] font-bold uppercase leading-tight tracking-[0.3em] text-slate-400 sm:tracking-[0.35em]">
                  Operational Hub
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-controls="main-sidebar-nav"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`hidden shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-800/60 text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white lg:inline-flex ${
              sidebarOpen ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-10 w-10 sm:h-11 sm:w-11'
            }`}
          >
            <Menu size={sidebarOpen ? 22 : 20} strokeWidth={2.25} className="shrink-0" />
          </button>
        </div>

        {/* Sidebar Content */}
        <nav
          id="main-sidebar-nav"
          className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-visible custom-scrollbar ${
            sidebarOpen ? 'p-4 sm:p-5' : 'items-center px-2 py-3'
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={getLinkClass(link.path)}
              title={
                !sidebarOpen
                  ? link.badge
                    ? `${link.label} (${link.badge} unread)`
                    : link.label
                  : undefined
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <link.icon
                size={sidebarOpen ? 22 : 20}
                className={`shrink-0 transition-colors ${
                  isActive(link.path)
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-slate-100'
                }`}
              />
              {sidebarOpen && (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-black uppercase italic tracking-[0.2em]">
                    {link.label}
                  </span>
                  {link.badge && (
                    <span className="shrink-0 rounded-md bg-indigo-500 px-2 py-0.5 text-[9px] font-black text-white">
                      {link.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}

          {user?.role === 'contractor' && sidebarOpen && (
            <div className="pt-10 px-2">
              <div className="bg-slate-800 rounded-[2.5rem] p-6 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Operational Capital</p>
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xl font-black italic tracking-tighter">{budzBalance} <span className="text-[10px] text-indigo-500 uppercase tracking-widest">Budz</span></p>
                   <Link to="/dashboard/contractor/buy-budz" className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm border border-slate-600 hover:bg-indigo-500 hover:text-white transition-all">
                      <Maximize2 size={14} />
                   </Link>
                </div>
                <div className="w-full h-1 bg-slate-600 rounded-full overflow-hidden">
                   <div className="w-2/3 h-full bg-indigo-500" />
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div
          className={`shrink-0 border-t border-slate-800 overflow-visible ${
            sidebarOpen ? 'p-5 sm:p-6' : 'flex justify-center px-2 py-3'
          }`}
        >
          <button
            type="button"
            onClick={handleLogout}
            title={!sidebarOpen ? 'Terminate session' : undefined}
            className={`group flex items-center justify-center rounded-2xl text-rose-500 transition-all duration-300 hover:bg-rose-950/30 ${
              sidebarOpen
                ? 'w-full gap-3 px-5 py-3.5 sm:gap-4 sm:px-6 sm:py-4'
                : 'h-11 w-11 shrink-0 p-0 sm:h-11 sm:w-11'
            }`}
          >
            <LogOut size={20} className="shrink-0 transition-transform group-hover:rotate-12" />
            {sidebarOpen && (
              <span className="truncate text-[10px] font-black uppercase italic tracking-widest">
                Terminate Session
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">

        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md h-24 px-10 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800 transition-all duration-300">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-3 bg-slate-800 text-slate-100 rounded-2xl shadow-sm border border-slate-700 hover:bg-indigo-500 hover:text-white transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
               <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
                 Identity: {user?.role?.toUpperCase()} VERIFIED
               </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Context Icons */}
            <div className="hidden lg:flex items-center gap-4 border-r border-slate-700 pr-6">
               <button onClick={() => navigate('/architects')} className="relative p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-2xl transition-all group" title="Browse Architects">
                  <Search size={20} />
               </button>
               <button onClick={() => navigate('/messages')} className="relative p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-2xl transition-all group" title="Messages">
                  <MessageSquare size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-md flex items-center justify-center border-2 border-slate-900">
                      {unreadCount}
                    </span>
                  )}
               </button>
               <button className="relative p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-2xl transition-all group" title="Notifications">
                  <Bell size={20} />
                  {pendingCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-md flex items-center justify-center border-2 border-slate-900">
                      {pendingCount}
                    </span>
                  )}
               </button>
            </div>

            {/* Profile Protocol */}
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-100 italic uppercase tracking-tighter">{user?.full_name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: ARCH-{String(user?.user_id ?? 0).padStart(4, '0')}</p>
              </div>
              <Link to="/profile" className="w-14 h-14 bg-slate-800 rounded-2xl p-0.5 relative group">
                <div className="w-full h-full bg-slate-700 rounded-xl overflow-hidden shadow-inner border border-slate-600 flex items-center justify-center text-indigo-400 font-black italic text-xl group-hover:scale-95 transition-transform duration-500">
                  {user?.profile_image ? (
                    <img
                      key={user.profile_image}
                      src={resolveImageUrl(user.profile_image)}
                      alt={user.full_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-950 text-white rounded-lg flex items-center justify-center border-2 border-slate-900 shadow-lg">
                   <Shield size={12} className="text-indigo-400" />
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Main content scroll area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
          <div className="p-6 sm:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
