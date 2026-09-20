import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';

interface DashboardData {
  total_users: number;
  total_architects: number;
  total_contractors: number;
  pending_architect_verifications: number;
  pending_contractor_verifications: number;
  active_projects: number;
  /** What the platform actually keeps: design commission + Budz sales. */
  platform_earnings?: number;
  earnings_breakdown?: {
    design_commission: number;
    budz_sales: number;
  };
  /** Money that moved through the platform; mostly paid out to architects. */
  gross_payment_volume?: number;
  /** @deprecated use platform_earnings / gross_payment_volume */
  total_revenue: number;
  /** @deprecated use earnings_breakdown.design_commission */
  total_platform_fees?: number;
  platform_fee_percent?: number;
  recent_logs: Array<{
    log_id: number;
    action: string;
    target_table: string;
    target_id: number;
    description: string;
    created_at: string;
    admin_name?: string;
  }>;
}

interface PendingArchitect {
  architect_id: number;
  full_name: string;
  profile_image?: string;
}

interface PendingContractor {
  contractor_id: number;
  full_name: string;
  profile_image?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingArchitects, setPendingArchitects] = useState<PendingArchitect[]>([]);
  const [pendingContractors, setPendingContractors] = useState<PendingContractor[]>([]);
  const [stats, setStats] = useState({
    total_architects: 0,
    total_contractors: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, architectsRes, contractorsRes] = await Promise.all([
        axiosInstance.get('/admin/dashboard'),
        axiosInstance.get('/admin/architects/pending'),
        axiosInstance.get('/admin/contractors/pending'),
      ]);

      const dashboardData: DashboardData = dashboardRes.data.data;
      const architects = (architectsRes.data?.data || []).map((architect: any) => ({
        architect_id: architect.architect_id,
        full_name: architect.user?.full_name || 'Unknown Architect',
        profile_image: architect.user?.profile_image,
      }));

      const contractors = (contractorsRes.data?.data || []).map((contractor: any) => ({
        contractor_id: contractor.contractor_id,
        full_name: contractor.user?.full_name || 'Unknown Contractor',
        profile_image: contractor.user?.profile_image,
      }));

      setData(dashboardData);
      setPendingArchitects(architects);
      setPendingContractors(contractors);
      setStats({
        total_architects: dashboardData.total_architects,
        total_contractors: dashboardData.total_contractors,
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('verify')) return { color: 'text-emerald-400', bg: 'bg-emerald-950', icon: 'verified' };
    if (act.includes('reject')) return { color: 'text-rose-400', bg: 'bg-rose-950', icon: 'cancel' };
    if (act.includes('suspend')) return { color: 'text-amber-400', bg: 'bg-amber-950', icon: 'block' };
    if (act.includes('delete')) return { color: 'text-rose-300', bg: 'bg-rose-950', icon: 'delete_forever' };
    if (act.includes('payment')) return { color: 'text-blue-400', bg: 'bg-blue-950', icon: 'payments' };
    return { color: 'text-slate-300', bg: 'bg-slate-800', icon: 'info' };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-slate-700 rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl border border-slate-700"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl border border-slate-700"></div>
      </div>
    );
  }

  const hasPendingVerifications =
    (data?.pending_architect_verifications ?? 0) > 0 ||
    (data?.pending_contractor_verifications ?? 0) > 0;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Admin Command Center</h1>
        <p className="text-slate-400 mt-1">System-wide metrics and user verification oversight.</p>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800/60 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Users */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-sm">
          <div className="w-10 h-10 bg-blue-950 rounded-xl flex items-center justify-center mb-3 border border-blue-800/50">
            <span className="material-symbols-outlined text-blue-400">group</span>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Users</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-0.5">{data?.total_users ?? 0}</p>
        </div>

        {/* Architects */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-sm">
          <div className="w-10 h-10 bg-indigo-950 rounded-xl flex items-center justify-center mb-3 border border-indigo-800/50">
            <span className="material-symbols-outlined text-indigo-400">architecture</span>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Architects</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-0.5">{stats.total_architects}</p>
        </div>

        {/* Contractors */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-sm">
          <div className="w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center mb-3 border border-emerald-800/50">
            <span className="material-symbols-outlined text-emerald-400">construction</span>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Contractors</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-0.5">{stats.total_contractors}</p>
        </div>

        {/* Verifications Pending */}
        <div className={`bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-sm ${hasPendingVerifications ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-950' : ''}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${hasPendingVerifications ? 'bg-amber-950 border border-amber-800/60' : 'bg-slate-800 border border-slate-700'}`}>
            <span className={`material-symbols-outlined ${hasPendingVerifications ? 'text-amber-400' : 'text-slate-500'}`}>verified_user</span>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pending Verif.</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-0.5">
            {(data?.pending_architect_verifications ?? 0) + (data?.pending_contractor_verifications ?? 0)}
          </p>
        </div>

        {/* Active Projects */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-sm">
          <div className="w-10 h-10 bg-purple-950 rounded-xl flex items-center justify-center mb-3 border border-purple-800/50">
            <span className="material-symbols-outlined text-purple-400">folder_special</span>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Active Jobs</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-0.5">{data?.active_projects ?? 0}</p>
        </div>

        {/* Platform Earnings -- OUR money only.
            This is the design commission plus Budz credit sales. It is
            deliberately NOT the gross payment volume: most of what
            clients pay flows through to architects and was never ours.
            Gross is shown separately below as context. */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Our Earnings</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              ₨{(data?.platform_earnings ?? data?.total_platform_fees ?? 0).toLocaleString()}
            </p>
            <p className="text-[9px] text-white/30 mt-1">
              Commission {data?.platform_fee_percent ?? 0}% + Budz sales
            </p>
          </div>
        </div>
      </div>

      {/* Earnings breakdown -- makes it unambiguous which number is ours. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-900/50">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Design Commission
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            ₨{(data?.earnings_breakdown?.design_commission ?? 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-white/30 mt-1">
            Our cut of completed project payments
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-900/50">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Budz Sales
          </p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            ₨{(data?.earnings_breakdown?.budz_sales ?? 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-white/30 mt-1">
            Credits bought by contractors — fully ours
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Gross Volume
          </p>
          <p className="text-lg font-bold text-slate-300 mt-1">
            ₨{(data?.gross_payment_volume ?? data?.total_revenue ?? 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-white/30 mt-1">
            Total processed — not our income
          </p>
        </div>
      </div>

      {/* Actionable Alerts */}
      {hasPendingVerifications && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(data?.pending_architect_verifications ?? 0) > 0 && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-blue-800/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-950/60 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                    <span className="material-symbols-outlined text-white">architecture</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">Architect Verifications</h3>
                    <p className="text-xs text-slate-400">{data?.pending_architect_verifications} pending review</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                  {pendingArchitects.slice(0, 4).map((arch) => (
                    <div key={arch.architect_id} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 shadow-sm" title={arch.full_name}>
                      {arch.full_name.charAt(0)}
                    </div>
                  ))}
                  {pendingArchitects.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                      +{pendingArchitects.length - 4}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/admin/verify-architects')}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition shadow-md shadow-blue-900/30 flex items-center justify-center gap-2"
                >
                  Start Review
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {(data?.pending_contractor_verifications ?? 0) > 0 && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-emerald-800/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-950/60 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
                    <span className="material-symbols-outlined text-white">construction</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">Contractor Verifications</h3>
                    <p className="text-xs text-slate-400">{data?.pending_contractor_verifications} pending review</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  {pendingContractors.slice(0, 4).map((cont) => (
                    <div key={cont.contractor_id} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 shadow-sm" title={cont.full_name}>
                      {cont.full_name.charAt(0)}
                    </div>
                  ))}
                  {pendingContractors.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                      +{pendingContractors.length - 4}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/admin/verify-contractors')}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2"
                >
                  Start Review
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm hover:border-indigo-500 hover:bg-slate-800/80 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-400 text-2xl">manage_accounts</span>
          </div>
          <h3 className="font-bold text-slate-100">Manage Users</h3>
          <p className="text-xs text-slate-400 mt-1">Suspend, activate, or audit account statuses.</p>
        </button>

        <button
          onClick={() => navigate('/admin/analytics')}
          className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm hover:border-purple-500 hover:bg-slate-800/80 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-400 text-2xl">monitoring</span>
          </div>
          <h3 className="font-bold text-slate-100">Deep Analytics</h3>
          <p className="text-xs text-slate-400 mt-1">Review system growth and revenue performance.</p>
        </button>

        <button
          onClick={() => navigate('/admin/logs')}
          className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm hover:border-amber-500 hover:bg-slate-800/80 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-400 text-2xl">history</span>
          </div>
          <h3 className="font-bold text-slate-100">Full Audit Logs</h3>
          <p className="text-xs text-slate-400 mt-1">Track every action taken across the platform.</p>
        </button>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Live Activity Log</h2>
            <p className="text-xs text-slate-400">Real-time system events and admin actions</p>
          </div>
          <Link to="/admin/logs" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 group">
            Full History
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">chevron_right</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-800">
          {data?.recent_logs && data.recent_logs.length > 0 ? (
            data.recent_logs.slice(0, 10).map((log, idx) => {
              const config = getActionConfig(log.action);
              return (
                <div key={log.log_id} className="px-6 py-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 border border-slate-700/50`}>
                      <span className={`material-symbols-outlined ${config.color} text-xl`}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-100 truncate">
                          {log.admin_name || 'System'}{' '}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ml-2 border ${config.color} border-current opacity-70`}>
                            {log.action}
                          </span>
                        </p>
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        Target: <span className="font-semibold">{log.target_table}</span> #{log.target_id} — {log.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-slate-400 text-5xl mb-3">history_toggle_off</span>
              <p className="text-slate-400 text-sm font-medium">No recent logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
