import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { resolveImageUrl } from '../utils/storage';
import {
  Folder,
  Clock,
  CheckCircle2,
  Wallet,
  Plus,
  ChevronRight,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Zap,
  MoreHorizontal,
  Fingerprint,
  TrendingUp,
  Activity,
  ArrowRight,
  Shield
} from 'lucide-react';

interface Project {
  project_id: number;
  project_title: string;
  project_type: string;
  budget: number;
  project_status: string;
  created_at: string;
}

interface Payment {
  payment_id: number;
  project_id: number;
  amount: number;
  status: string;
  created_at: string;
  project?: {
    project_id: number;
    project_title: string;
  };
}

interface Agreement {
  agreement_id: number;
  project_id: number;
  architect_id: number;
  status: string;
  created_at: string;
  project?: {
    project_id: number;
    project_title: string;
  };
  architect?: {
    full_name: string;
  };
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Strategic Hub — ArchIntent';
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectsRes, paymentsRes, agreementsRes] = await Promise.all([
        axiosInstance.get('/projects'),
        axiosInstance.get('/payments').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/agreements/pending').catch(() => ({ data: { data: [] } })),
      ]);

      setProjects(projectsRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
      setAgreements(agreementsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const totalProjects = projects.length;
  const inProgressCount = projects.filter(p =>
    p.project_status !== 'created' && p.project_status !== 'completed'
  ).length;
  const completedCount = projects.filter(p => p.project_status === 'completed').length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'held').length;

  const recentProjects = projects.slice(0, 5);
  const recentPayments = payments.slice(0, 5);
  const pendingAgreementsCount = agreements.filter(a => a.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    const configs: { [key: string]: { color: string, label: string } } = {
      created: { color: 'slate', label: 'INITIALIZED' },
      matched: { color: 'blue', label: 'MATCHED' },
      architect_selected: { color: 'indigo', label: 'ARCHITECT ENGAGED' },
      agreement_pending: { color: 'amber', label: 'SIGNATURE REQ' },
      payment_pending: { color: 'orange', label: 'DEPOSIT REQ' },
      design_in_progress: { color: 'purple', label: 'IN DESIGN' },
      design_delivered: { color: 'teal', label: 'REVIEW READY' },
      design_approved: { color: 'emerald', label: 'MANIFESTED' },
      construction_open: { color: 'cyan', label: 'MARKET OPEN' },
      contractor_selected: { color: 'lime', label: 'BUILDER CHOSEN' },
      in_construction: { color: 'amber', label: 'IN CONSTRUCTION' },
      completed: { color: 'emerald', label: 'FINALIZED' },
    };
    const config = configs[status] || { color: 'slate', label: status.toUpperCase() };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200 italic`}>
        {config.label}
      </span>
    );
  };

  const getProjectAction = (project: Project) => {
    switch (project.project_status) {
      case 'created': return { label: 'EDIT BRIEF', to: `/dashboard/client/create-project?edit=${project.project_id}` };
      case 'matched': return { label: 'VIEW MATCHES', to: `/project/${project.project_id}/matches` };
      case 'agreement_pending': return { label: 'SIGN PROTOCOL', to: `/project/${project.project_id}/agreement` };
      case 'payment_pending': return { label: 'EXECUTE DEPOSIT', to: `/project/${project.project_id}/payment` };
      default: return { label: 'MISSION INTEL', to: `/project/${project.project_id}` };
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Strategic Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter pb-24">
      {/* --- HERO SECTION --- */}
      <section className="bg-slate-950 pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-[2px] bg-indigo-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">CLIENT HUB 01</p>
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.8]">
                Strategic <br />
                <span className="text-outline-white">Hub</span>
              </h1>
            </div>

            <div className="flex flex-col items-end gap-6">
              <Link
                to="/dashboard/client/create-project"
                className="flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-2xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-900/30 group mb-4"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-black uppercase tracking-[0.2em] text-xs italic">Start New Project</span>
              </Link>

              <div className="flex items-center gap-6">
                <div className="hidden lg:block text-right space-y-1">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Identity Protocol</p>
                  <p className="text-xl font-black text-white italic uppercase tracking-tight">{user?.full_name}</p>
                </div>
                <div className="w-20 h-20 bg-slate-800 rounded-3xl p-1 relative shadow-2xl shadow-black/50 group hover:scale-105 transition-transform duration-500 border border-slate-600">
                  <div className="w-full h-full bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl italic">
                    {user?.profile_image ? (
                      <img
                        key={user.profile_image}
                        src={resolveImageUrl(user.profile_image)}
                        alt={user?.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.full_name?.charAt(0)
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center border-2 border-slate-600">
                    <Shield size={16} className="text-indigo-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* LEFT COLUMN: PIPELINE & TIMELINE */}
          <div className="lg:col-span-8 space-y-16">

            {/* Module 01: Project Pipeline */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 01</p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Project Pipeline</h2>
                </div>
                <Activity className="text-slate-400" size={40} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Cases', val: totalProjects, icon: Folder, color: 'text-indigo-300', bg: 'bg-indigo-950/80 border border-indigo-800/50', sub: 'Aggregated' },
                  { label: 'Active Ops', val: inProgressCount, icon: Clock, color: 'text-amber-300', bg: 'bg-amber-950/80 border border-amber-800/50', sub: 'In progress' },
                  { label: 'Finalized', val: completedCount, icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-950/80 border border-emerald-800/50', sub: 'Completed' },
                  { label: 'Escrowed', val: pendingPaymentsCount, icon: Wallet, color: 'text-white', bg: 'bg-slate-800 border border-slate-600 shadow-xl shadow-black/40', sub: 'In holdings' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-[2rem] p-8 space-y-6 transition-all duration-500 hover:-translate-y-2`}>
                    <div className={`w-10 h-10 ${stat.color === 'text-white' ? 'bg-white/10' : 'bg-slate-800'} rounded-xl flex items-center justify-center shadow-sm border border-slate-700/50`}>
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <div className="space-y-1">
                      <p className={`${stat.color === 'text-white' ? 'text-white/40' : 'text-slate-400'} text-[9px] font-black uppercase tracking-widest`}>{stat.label}</p>
                      <p className={`text-4xl font-black italic tracking-tighter uppercase ${stat.color === 'text-white' ? 'text-white' : 'text-slate-100'}`}>{stat.val}</p>
                      <p className={`${stat.color === 'text-white' ? 'text-white/40' : 'text-slate-400'} text-[9px] font-bold italic`}>{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 02: Operational Timeline */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 02</p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Operational Timeline</h2>
                </div>
                <Link to="/dashboard/client/projects" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 group transition-colors">
                  Full Archive <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-600 p-20 text-center">
                   <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-700">
                     <Folder className="w-10 h-10 text-slate-500" />
                   </div>
                   <h3 className="text-xl font-black text-slate-100 italic uppercase tracking-tight mb-2">System Idle</h3>
                   <p className="text-slate-400 text-sm font-medium mb-10">No active cases detected in the pipeline.</p>
                   <Link to="/dashboard/client/create-project" className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-xl shadow-black/30">INITIALIZE PROJECT</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {recentProjects.map((project) => (
                    <article key={project.project_id} className="bg-slate-900 rounded-[2.5rem] border border-slate-700 p-8 shadow-sm hover:shadow-2xl hover:shadow-black/30 transition-all duration-700 group flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                       <div className="flex items-center gap-8 relative z-10">
                          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-indigo-900/30 transition-colors shadow-inner border border-slate-600">
                             <Zap className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                                {getStatusBadge(project.project_status)}
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PROT-{project.project_id}</span>
                             </div>
                             <h4 className="text-2xl font-black text-slate-100 italic uppercase tracking-tighter leading-none group-hover:text-indigo-400 transition-colors">
                               {project.project_title}
                             </h4>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{project.project_type}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">VAL: PKR {(project.budget / 1000000).toFixed(1)}M</span>
                             </div>
                          </div>
                       </div>
                       <Link
                         to={getProjectAction(project).to}
                         className="shrink-0 flex items-center gap-4 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-black/30 group/btn"
                       >
                         <span className="text-[10px] font-black uppercase tracking-widest italic">{getProjectAction(project).label}</span>
                         <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                       </Link>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LEGAL & FINANCIAL */}
          <div className="lg:col-span-4 space-y-12">

            {/* Module 03: Legal & Financial Protocol */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 03</p>
                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Protocols</h2>
              </div>

              {/* Legal Sidebar */}
              <section className="bg-slate-950 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10 space-y-8">
                   <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> Legal Pending
                     </h3>
                     <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-black">{pendingAgreementsCount}</span>
                   </div>

                   {pendingAgreementsCount === 0 ? (
                     <div className="py-10 text-center border-2 border-dashed border-white/10 rounded-[2rem]">
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] italic">Protocols Finalized</p>
                     </div>
                   ) : (
                     <div className="space-y-4">
                        {agreements.map((agreement) => (
                          <div key={agreement.agreement_id} className="p-6 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all group/card">
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">AGREEMENT REQ</p>
                             <p className="text-sm font-black italic uppercase tracking-tight mb-6 truncate">{agreement.project?.project_title}</p>
                             <Link to={`/project/${agreement.project_id}/agreement`} className="w-full py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg">
                               REVIEW PROTOCOL
                             </Link>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </section>

              {/* Financial Registry */}
              <section className="bg-slate-900 rounded-[3rem] border border-slate-700 p-10 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                     <Wallet className="w-4 h-4" /> Financials
                   </h3>
                   <Link to="/dashboard/client/payments" className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-800 pb-0.5">FULL HISTORY</Link>
                </div>

                {recentPayments.length === 0 ? (
                  <div className="py-12 text-center bg-slate-800/80 rounded-[2.5rem] border border-slate-600">
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">No Data Logged</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                     {recentPayments.map((payment) => (
                       <div key={payment.payment_id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-1.5 h-10 bg-slate-600 rounded-full overflow-hidden">
                                <div className={`w-full ${payment.status === 'completed' ? 'h-full bg-emerald-400' : 'h-1/2 bg-amber-400'} transition-all duration-1000`} />
                             </div>
                             <div>
                                <p className="text-xs font-black text-slate-100 italic uppercase tracking-tight truncate max-w-[120px] group-hover:text-indigo-400 transition-colors">{payment.project?.project_title || 'Payment'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">{new Date(payment.created_at).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-slate-100 italic tracking-tighter">PKR {(payment.amount / 1000).toFixed(0)}K</p>
                             <span className={`text-[8px] font-black uppercase tracking-widest italic ${payment.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>{payment.status}</span>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
