import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import BudzWallet from '../components/BudzWallet';
import StarRating from '../components/reviews/StarRating';
import { 
  Construction, 
  Send, 
  ShieldCheck, 
  TrendingUp, 
  MapPin, 
  Banknote, 
  ArrowUpRight, 
  ChevronRight,
  Zap,
  Star,
  User,
  Image as ImageIcon,
  Coins,
  ShieldAlert,
  Layout,
  Briefcase,
  Activity,
  ArrowRight,
  Fingerprint
} from 'lucide-react';

interface DashboardData {
  contractor_id?: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_reject_reason?: string;
  available_projects_count: number;
  submitted_bids_count: number;
  accepted_bids_count: number;
  reviews?: {
    average_rating: number;
    total_reviews: number;
    recent_reviews: any[];
  };
}

interface Bid {
  bid_id: number;
  project_id: number;
  project_title: string;
  proposed_cost: number;
  bid_date: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Job {
  project_id: number;
  project_title: string;
  project_type: string;
  project_status: string;
  location: string;
  budget: number;
  brief_text: string;
  created_at: string;
}

const ContractorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [budzBalance, setBudzBalance] = useState<number>(0);

  useEffect(() => {
    document.title = 'Builder Control Center — ArchIntent';
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dRes, bRes, jRes, wRes] = await Promise.all([
          axiosInstance.get('/contractor/dashboard').catch(() => ({ data: { data: null } })),
          axiosInstance.get('/contractor/bids').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/projects/construction-jobs').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/budz/wallet').catch(() => ({ data: { data: { balance: 0 } } }))
        ]);

        setDashboard(dRes.data.data || {
          verification_status: 'pending',
          available_projects_count: 0,
          submitted_bids_count: 0,
          accepted_bids_count: 0,
          reviews: { average_rating: 0, total_reviews: 0, recent_reviews: [] }
        });
        setBids(bRes.data.data || []);
        setJobs(jRes.data.data || []);
        setBudzBalance(wRes.data?.data?.balance || 0);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const winRate = dashboard && dashboard.submitted_bids_count > 0 
    ? Math.round((dashboard.accepted_bids_count / dashboard.submitted_bids_count) * 100) 
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Builder Profile...</p>
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
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">CONTRACTOR SUITE 01</p>
              </div>
              <h1 className="text-7xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.8]">
                Builder <br />
                <span className="text-outline-white text-transparent">Control</span>
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:block text-right space-y-1">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Ranking Status</p>
                <p className="text-xl font-black text-emerald-400 italic uppercase tracking-tight">Master Builder</p>
              </div>
              <div className="w-20 h-20 bg-slate-800 rounded-3xl p-1 relative shadow-2xl shadow-black/50 group hover:scale-105 transition-transform duration-500 border border-slate-600">
                <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic">
                  {dashboard?.contractor_id ? 'MB' : 'UC'}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center border-2 border-slate-600">
                  <Fingerprint size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        {/* Verification Warning */}
        {dashboard?.verification_status === 'pending' && (
          <div className="mb-12 bg-amber-950/80 border border-amber-800/60 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-amber-900/20">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-900 text-amber-100 rounded-2xl flex items-center justify-center border border-amber-700">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black italic uppercase tracking-tight text-amber-100">Credentials Under Audit</h3>
                <p className="text-amber-200/80 text-sm font-medium">Bidding is restricted during the verification phase. Protocol active.</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-amber-600 text-amber-950 rounded-xl text-[10px] font-black uppercase tracking-widest">AWAITING CLEARANCE</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* LEFT COLUMN: METRICS & OPS */}
          <div className="lg:col-span-8 space-y-16">
            
            {/* Module 01: Fleet Analytics */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 01</p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Fleet Analytics</h2>
                </div>
                <Activity className="text-slate-600" size={40} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Market Ops', val: dashboard?.available_projects_count || 0, icon: Construction, color: 'text-indigo-300', bg: 'bg-indigo-950/80 border border-indigo-800/50' },
                  { label: 'Proposals', val: dashboard?.submitted_bids_count || 0, icon: Send, color: 'text-blue-300', bg: 'bg-blue-950/80 border border-blue-800/50' },
                  { label: 'Secured', val: dashboard?.accepted_bids_count || 0, icon: ShieldCheck, color: 'text-emerald-300', bg: 'bg-emerald-950/80 border border-emerald-800/50' },
                  { label: 'Win Rate', val: `${winRate}%`, icon: TrendingUp, color: 'text-white', bg: 'bg-slate-800 border border-slate-600 shadow-xl shadow-black/40' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-[2rem] p-8 space-y-6 transition-all duration-500 hover:-translate-y-2`}>
                    <div className={`w-10 h-10 ${stat.color === 'text-white' ? 'bg-white/10' : 'bg-slate-800'} rounded-xl flex items-center justify-center shadow-sm border border-slate-700/50`}>
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <div className="space-y-1">
                      <p className={`${stat.color === 'text-white' ? 'text-white/40' : 'text-slate-400'} text-[9px] font-black uppercase tracking-widest`}>{stat.label}</p>
                      <p className={`text-3xl font-black italic tracking-tighter uppercase ${stat.color === 'text-white' ? 'text-white' : 'text-slate-100'}`}>{stat.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 02: Active Engagements */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 02</p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Fleet Engagements</h2>
                </div>
                <Link to="/dashboard/contractor/bids" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 group">
                  Full Registry <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-700">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valuation</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Phase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bids.slice(0, 5).map(bid => (
                      <tr key={bid.bid_id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black italic uppercase tracking-tight text-slate-100 group-hover:text-indigo-400 transition-colors">{bid.project_title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">LOGGED: {new Date(bid.bid_date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-black italic tracking-tighter text-slate-200">PKR {(bid.proposed_cost / 1000).toFixed(0)}K</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${
                            bid.status === 'accepted' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 
                            bid.status === 'rejected' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {bid.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {bids.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center text-slate-400 italic text-sm">No active engagements logged in registry.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Module 03: Market Intelligence */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 03</p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Market Intelligence</h2>
                </div>
                <Link to="/construction-jobs" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 group">
                  Mission Board <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {jobs.slice(0, 4).map(job => (
                  <article key={job.project_id} className="group bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-black/30 transition-all duration-700 relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-indigo-950 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-lg italic border border-indigo-800">
                          {job.project_type}
                        </span>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID {job.project_id}</p>
                      </div>
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-none line-clamp-1 text-slate-100 group-hover:text-indigo-400 transition-colors">
                        {job.project_title}
                      </h4>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                          <MapPin size={12} className="text-slate-500" /> {job.location}
                        </div>
                        <p className="text-xs font-black italic text-emerald-400">PKR {(job.budget / 1000000).toFixed(1)}M+</p>
                      </div>
                      <Link to={`/construction-jobs/${job.project_id}`} className="block w-full py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-indigo-600 transition-all">
                        ANALYZE BRIEF
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REPUTATION & FINANCE */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Reputation Audit */}
            <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-10 space-y-10 text-center">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">REPUTATION AUDIT</p>
                <div className="flex items-center justify-center gap-4">
                  <h3 className="text-6xl font-black italic uppercase tracking-tighter leading-none text-slate-100">{Number(dashboard?.reviews?.average_rating || 0).toFixed(1)}</h3>
                  <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-400/50">
                    <Star size={24} fill="black" />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Based on {dashboard?.reviews?.total_reviews || 0} reviews</p>
              </div>

              <div className="space-y-4">
                {dashboard?.reviews?.recent_reviews?.slice(0, 2).map((review, i) => (
                  <div key={i} className="bg-slate-800/80 p-6 rounded-[2rem] border border-slate-700 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black italic uppercase tracking-widest">Stakeholder Log</p>
                      <StarRating rating={review.rating} size="xs" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 italic leading-relaxed line-clamp-2">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Protocol */}
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">FINANCIAL PROTOCOL</p>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight">Budz Liquidity</h3>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AVAILABLE CREDITS</p>
                    <p className="text-3xl font-black italic text-emerald-400">{budzBalance}</p>
                  </div>
                  <Coins size={32} className="text-white/10" />
                </div>

                <Link to="/dashboard/contractor/buy-budz" className="flex items-center justify-between w-full bg-indigo-600 hover:bg-indigo-500 py-5 px-8 rounded-2xl transition-all shadow-2xl shadow-indigo-600/20">
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Infect Liquidity</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </div>

            {/* Quick Link Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/dashboard/contractor/profile" className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 flex flex-col items-center justify-center hover:bg-slate-800 transition-all group">
                <User size={24} className="text-slate-500 group-hover:text-indigo-400 mb-4 transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-400 group-hover:text-slate-100">Profile</span>
              </Link>
              <Link to="/dashboard/contractor/portfolio" className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 flex flex-col items-center justify-center hover:bg-slate-800 transition-all group">
                <Layout size={24} className="text-slate-500 group-hover:text-indigo-400 mb-4 transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-400 group-hover:text-slate-100">Works</span>
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorDashboard;
