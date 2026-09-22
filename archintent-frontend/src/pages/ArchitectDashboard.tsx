import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import BankPayoutCard from '../components/payouts/BankPayoutCard';
import StarRating from '../components/reviews/StarRating';
import type { ReviewItem } from '../types/reviews';
import { resolveImageUrl } from '../utils/storage';
import {
  Target,
  Briefcase,
  Trophy,
  ExternalLink,
  UserCircle,
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Layout,
  Star,
  Banknote,
  ArrowRight,
  Zap,
  Image as ImageIcon,
  X
} from 'lucide-react';

interface DashboardStats {
  matched_projects_count: number;
  active_projects_count: number;
  completed_projects_count: number;
  total_earned: number;
}

interface ProfileStatus {
  is_complete: boolean;
  has_license: boolean;
  has_bio: boolean;
  has_portfolio: boolean;
  has_verification_document: boolean;
  experience_years?: number | null;
  specialization?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
}

interface Agreement {
  agreement_id: number;
  project_id: number;
  status: 'draft' | 'pending_signatures' | 'signed';
  project: {
    project_id: number;
    project_title: string;
  };
}

interface PortfolioItem {
  portfolio_id: number;
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  budget_range_min?: number;
  budget_range_max?: number;
  style_tags: string[];
  images: Array<{
    portfolio_image_id: number;
    image_url: string;
  }>;
}

interface Project {
  project_id: number;
  project_title: string;
  project_status: string;
  budget?: number;
  location?: string;
  created_at?: string;
  client?: {
    user_id: number;
    full_name: string;
  };
  client_name?: string;
  pending_revisions_count?: number;
  pending_revisions?: Array<{
    revision_id: number;
    revision_message: string;
    requested_at: string;
  }>;
}

interface ActionItem {
  type: 'agreement' | 'design_upload';
  project_id: number;
  project_title: string;
  label: string;
  action_url: string;
}

interface Payment {
  payment_id: number;
  project_id: number;
  amount: number;
  payment_type: string;
  payment_status: 'pending' | 'held' | 'completed' | 'refunded';
  created_at: string;
  project?: {
    project_title: string;
  };
}

interface DashboardReviews {
  average_rating: number;
  total_reviews: number;
  recent_reviews: ReviewItem[];
}

const ArchitectDashboard: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [pendingAgreements, setPendingAgreements] = useState<Agreement[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem | null>(null);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<DashboardReviews>({
    average_rating: 0,
    total_reviews: 0,
    recent_reviews: [],
  });
  const [publicArchitectId, setPublicArchitectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, agreementsRes, portfolioRes, paymentsRes] = await Promise.all([
        axiosInstance.get('/architect/dashboard').catch(() => ({ data: { data: {} } })),
        axiosInstance.get('/agreements/pending').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/architect/portfolio').catch(() => ({ data: { data: null } })),
        axiosInstance.get('/payments').catch(() => ({ data: { data: [] } })),
      ]);

      const dashboardData = dashboardRes.data.data || {};
      let projectsFromDashboard: Project[] = dashboardData.active_projects || [];

      if (!projectsFromDashboard.length) {
        const projectsRes = await axiosInstance
          .get('/architect/projects')
          .catch(() => ({ data: { data: [] } }));
        projectsFromDashboard = (projectsRes.data.data || []).map((p: any) => ({
          project_id: p.project_id,
          project_title: p.project_title,
          project_status: p.project_status,
          budget: p.budget,
          location: p.location,
          created_at: p.created_at,
          client_name: p.client?.full_name,
          client: p.client,
        }));
      }

      setStats(dashboardData.stats || {});
      setProfileStatus(dashboardData.profile_status || {});
      setActiveProjects(projectsFromDashboard);
      setReviews(dashboardData.reviews || { average_rating: 0, total_reviews: 0, recent_reviews: [] });
      setPublicArchitectId(dashboardData.architect?.architect_id || null);
      setPendingAgreements(agreementsRes.data.data || []);
      setPortfolio(portfolioRes.data.data);
      setPayments(paymentsRes.data.data || []);

      const actions: ActionItem[] = [];
      (agreementsRes.data.data || []).forEach((agr: Agreement) => {
        if (agr.status !== 'signed' && agr.project) {
          actions.push({
            type: 'agreement',
            project_id: agr.project_id,
            project_title: agr.project.project_title,
            label: `Sign agreement: ${agr.project.project_title}`,
            action_url: `/project/${agr.project_id}/agreement`,
          });
        }
      });
      projectsFromDashboard.forEach((proj: Project) => {
        if (proj.project_status === 'design_in_progress') {
          actions.push({
            type: 'design_upload',
            project_id: proj.project_id,
            project_title: proj.project_title,
            label: `Upload design: ${proj.project_title}`,
            action_url: `/project/${proj.project_id}`,
          });
        }
      });
      setActionItems(actions);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard — ArchIntent'
    void fetchAllData()
    // fetchAllData is stable enough for a mount-only run; avoid deps loop
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const getStatusBadge = (status: string) => {
    const configs: { [key: string]: { color: string } } = {
      architect_selected: { color: 'indigo' },
      agreement_pending: { color: 'amber' },
      payment_pending: { color: 'orange' },
      design_in_progress: { color: 'purple' },
      design_delivered: { color: 'teal' },
      design_approved: { color: 'emerald' },
      completed: { color: 'emerald' },
    };
    const color = configs[status]?.color || 'slate';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-${color}-50 text-${color}-600 border border-${color}-100`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
          <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-slate-500 mt-4 font-black tracking-widest uppercase text-[10px] animate-pulse">Syncing Architect Data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {error && (
        <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-800/60 rounded-2xl px-5 py-4">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss"
            className="text-rose-400 hover:text-rose-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-indigo-900/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-800">
                Architect Panel
              </span>
              {profileStatus?.verification_status === 'verified' && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
           </div>
           <h1 className="text-5xl font-black text-slate-100 tracking-tight italic uppercase leading-none">
             Welcome, <br/><span className="text-indigo-400">{user?.full_name?.split(' ')[0]}</span>
           </h1>
        </div>

        <div className="flex items-center gap-4">
           <Link
             to="/dashboard/architect/portfolio"
             className="flex items-center gap-3 bg-slate-800 text-slate-100 border border-slate-600 px-6 py-4 rounded-[1.5rem] hover:bg-slate-700 transition-all shadow-sm"
           >
             <UserCircle className="w-5 h-5 text-indigo-400" />
             <span className="font-black uppercase tracking-widest text-[10px] italic">My Portfolio</span>
           </Link>
           {publicArchitectId && (
             <a
               href={`/architect/${publicArchitectId}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-[1.5rem] hover:bg-indigo-500 transition-all shadow-xl shadow-black/30"
             >
               <ExternalLink className="w-5 h-5" />
               <span className="font-black uppercase tracking-widest text-[10px] italic">View Profile</span>
             </a>
           )}
        </div>
      </div>

      {/* Verification Banners */}
      {profileStatus?.verification_status === 'pending' && (
        <div className="bg-amber-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center border border-amber-500/30">
                 <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tight">Verification Pending</h3>
                 <p className="text-amber-200/70 text-sm font-medium">Our admin team is currently reviewing your professional credentials.</p>
              </div>
           </div>
        </div>
      )}

      {profileStatus?.verification_status === 'rejected' && (
        <div className="bg-rose-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-rose-500/20 rounded-3xl flex items-center justify-center border border-rose-500/30">
                 <ShieldAlert className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tight">Verification Rejected</h3>
                 <p className="text-rose-200/70 text-sm font-medium">{profileStatus.rejection_reason || 'Please review your document submissions.'}</p>
              </div>
           </div>
           <Link to="/dashboard/architect/profile" className="px-8 py-4 bg-rose-950 text-rose-100 border border-rose-800 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-rose-900 transition-colors shadow-lg shrink-0">
             Fix Credentials
           </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Network', val: stats?.matched_projects_count || 0, icon: Target, color: 'indigo', sub: 'Project matches' },
          { label: 'Ongoing', val: stats?.active_projects_count || 0, icon: Briefcase, color: 'blue', sub: 'Active pipeline' },
          { label: 'Milestones', val: stats?.completed_projects_count || 0, icon: Trophy, color: 'emerald', sub: 'Finalized cases' },
          { label: 'Balance', val: `₨${(stats?.total_earned || 0).toLocaleString()}`, icon: Banknote, color: 'amber', sub: 'Total earnings' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800 rounded-[2.5rem] p-8 border border-slate-700 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-950/40 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700`} />
            <div className="relative z-10">
              <div className={`w-12 h-12 bg-${stat.color}-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/30`}>
                <stat.icon className="text-white w-6 h-6" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-100 italic tracking-tight uppercase leading-none">{stat.val}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-2 italic tracking-wide">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Project Pipeline */}
        <div className="lg:col-span-2 space-y-10">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-100 italic uppercase tracking-tight">Active <span className="text-indigo-400">Requests</span></h2>
              <Link to="/dashboard/architect/projects" className="text-[10px] font-black text-slate-400 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-2 group transition-colors">
                Project History <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>

           {activeProjects.length === 0 ? (
             <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-20 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-600">
                  <Layout className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-black text-slate-100 italic uppercase tracking-tight mb-2">Queue Empty</h3>
                <p className="text-slate-400 text-sm font-medium mb-8">You'll receive requests once clients select you from matches.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {activeProjects.map((project) => (
                 <article key={project.project_id} className="bg-slate-800 rounded-[2rem] border border-slate-700 p-6 shadow-sm hover:shadow-xl hover:shadow-black/30 transition-all group flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-slate-700 flex items-center justify-center group-hover:bg-indigo-900/30 transition-colors shadow-inner border border-slate-600">
                          <Zap className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             {getStatusBadge(project.project_status)}
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">#{project.project_id}</span>
                          </div>
                          <h4 className="text-lg font-black text-slate-100 italic uppercase tracking-tight truncate max-w-[200px] sm:max-w-md group-hover:text-indigo-400 transition-colors">
                            {project.project_title}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{project.client_name || 'ArchIntent User'}</span>
                             <span className="w-1 h-1 rounded-full bg-slate-600" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.location || 'Remote'}</span>
                          </div>
                       </div>
                    </div>
                    <Link
                      to={`/project/${project.project_id}`}
                      className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all shadow-lg shadow-black/30 group/btn"
                    >
                      <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </Link>
                 </article>
               ))}
             </div>
           )}

           {/* Portfolio Showcase */}
           <section className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black text-slate-100 italic uppercase tracking-tight">Portfolio <span className="text-indigo-400">Showcase</span></h2>
                 <Link to="/dashboard/architect/portfolio" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 group">
                   Manage Works <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>

              {!portfolio ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-600 rounded-[2rem]">
                   <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                   <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest italic">No Works Published Yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h3 className="text-2xl font-black text-slate-100 italic uppercase tracking-tight">{portfolio.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{portfolio.description}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {portfolio.style_tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-700 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-600">{tag}</span>
                        ))}
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      {portfolio.images?.slice(0, 4).map((img, i) => (
                        <div key={i} className="aspect-square rounded-3xl overflow-hidden border border-slate-600 shadow-sm group/img relative">
                           <img src={resolveImageUrl(img.image_url)} alt="Work" className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
           {/* Action Items Widget */}
           {actionItems.length > 0 && (
             <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10">
                   <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                     <ShieldAlert className="w-4 h-4" /> Priority Tasks
                   </h3>
                   <div className="space-y-4">
                      {actionItems.map((item, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                           <p className="text-xs font-black italic uppercase tracking-tight mb-3 truncate">{item.label}</p>
                           <Link to={item.action_url} className="w-full py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20">
                             Process Task <ArrowRight className="w-3.5 h-3.5" />
                           </Link>
                        </div>
                      ))}
                   </div>
                </div>
             </section>
           )}

           {/* Demo bank-transfer payout path. Self-contained: owns its
               own fetching, so nothing else on this page changes. */}
           <BankPayoutCard />

           {/* Ratings Widget */}
           <section className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-8 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Reputation Score</p>
              <div className="flex items-center justify-center gap-3 mb-2">
                 <span className="text-5xl font-black text-slate-100 italic uppercase tracking-tighter leading-none">{Number(reviews.average_rating || 0).toFixed(1)}</span>
                 <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{reviews.total_reviews} verified reviews</p>

              <div className="space-y-4 text-left">
                 {reviews.recent_reviews.slice(0, 2).map((review) => (
                   <div key={review.review_id} className="p-4 rounded-2xl bg-slate-700 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{review.reviewer_name?.split(' ')[0] || 'Client'}</span>
                         <StarRating rating={review.rating} size="xs" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic line-clamp-2">"{review.comment}"</p>
                   </div>
                 ))}
                 {reviews.recent_reviews.length === 0 && (
                   <div className="py-6 text-center border-2 border-dashed border-slate-600 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">No Reviews Yet</p>
                   </div>
                 )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ArchitectDashboard;
