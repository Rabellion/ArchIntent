import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { 
  AlertCircle, 
  Calendar, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  Layers, 
  Activity,
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface Bid {
  bid_id: number;
  proposed_cost: number;
  estimated_duration: number;
  proposal_text?: string;
  bid_status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  project: {
    project_id: number;
    title: string;
    type: string;
    status: string;
  };
}

const ContractorBids: React.FC = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    document.title = 'Bid Registry — ArchIntent';
    fetchBids();
  }, []);

  const fetchBids = async () => {
    try {
      const response = await axiosInstance.get('/contractor/bids');
      setBids(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'PENDING REVIEW', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'accepted':
        return { label: 'ACCEPTED', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'rejected':
        return { label: 'REJECTED', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
      default:
        return { label: 'UNKNOWN', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' };
    }
  };

  const filteredBids = filter === 'all' ? bids : bids.filter((bid) => bid.bid_status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Bid Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter pb-20">
      {/* --- HERO SECTION --- */}
      <section className="relative bg-slate-950 pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-[2px] bg-slate-900" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">CONSTRUCTION FLEET</p>
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter leading-none">
                Bid <br />
                <span className="text-outline-white text-transparent">Registry</span>
              </h1>
            </div>

            <div className="flex flex-wrap gap-4">
              {[
                { label: 'ALL', count: bids.length, val: 'all' },
                { label: 'PENDING', count: bids.filter(b => b.bid_status === 'pending').length, val: 'pending' },
                { label: 'ACCEPTED', count: bids.filter(b => b.bid_status === 'accepted').length, val: 'accepted' },
                { label: 'REJECTED', count: bids.filter(b => b.bid_status === 'rejected').length, val: 'rejected' }
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setFilter(tab.val as any)}
                  className={`group relative px-6 py-3 transition-all duration-500 ${
                    filter === tab.val ? 'text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="text-[10px] font-bold tracking-[0.2em]">{tab.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      filter === tab.val ? 'bg-slate-800 text-slate-100' : 'bg-white/10'
                    }`}>
                      {tab.count}
                    </span>
                  </div>
                  {filter === tab.val && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        {error && (
          <div className="mb-8 p-4 bg-rose-950/30 border-l-4 border-rose-500 flex items-center gap-4 text-rose-300">
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* LEFT: BID LIST */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 01</p>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Active Engagements</h2>
              </div>
              <Activity className="text-slate-200" size={32} />
            </div>

            {filteredBids.length === 0 ? (
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-[2rem] p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Layers className="text-slate-300" size={32} />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold italic uppercase text-slate-100">Registry Empty</p>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">No bids found for the current selection. Expand your search or submit new proposals.</p>
                </div>
                <Link 
                  to="/construction-jobs"
                  className="inline-flex items-center gap-3 bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                >
                  Browse Markets <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredBids.map((bid) => {
                  const status = getStatusConfig(bid.bid_status);
                  return (
                    <div 
                      key={bid.bid_id}
                      className="group bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-500"
                    >
                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Status & Date */}
                        <div className="md:w-48 shrink-0 space-y-6">
                          <div className={`inline-flex items-center px-4 py-1.5 rounded-full border ${status.bg} ${status.border} ${status.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${status.color.replace('text-', 'bg-')}`} />
                            <span className="text-[10px] font-black tracking-widest">{status.label}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUBMITTED</p>
                            <div className="flex items-center gap-2 text-slate-100">
                              <Calendar size={14} className="text-slate-300" />
                              <span className="text-sm font-black italic">
                                {new Date(bid.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white rounded uppercase tracking-tighter italic">
                                {bid.project.type}
                              </span>
                            </div>
                            <Link 
                              to={`/construction-jobs/${bid.project.project_id}`}
                              className="block text-2xl font-black italic uppercase tracking-tighter text-slate-100 hover:text-indigo-400 transition-colors group-hover:translate-x-1 duration-500"
                            >
                              {bid.project.title}
                            </Link>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PROPOSED VALUE</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs font-black text-slate-400 italic">PKR</span>
                                <span className="text-lg font-black italic leading-none">
                                  {bid.proposed_cost.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TIMELINE</p>
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-300" />
                                <span className="text-sm font-black italic">{bid.estimated_duration} DAYS</span>
                              </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                              <Link 
                                to={`/construction-jobs/${bid.project.project_id}`}
                                className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                              >
                                <ExternalLink size={20} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: ANALYTICS SIDEBAR */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              {/* Module: Stats */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">MODULE 02</p>
                  <h2 className="text-xl font-black italic uppercase tracking-tight">Fleet Analytics</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Win Rate</p>
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-4xl font-black italic tracking-tighter">
                      {bids.length > 0 
                        ? Math.round((bids.filter(b => b.bid_status === 'accepted').length / bids.length) * 100)
                        : 0}%
                    </p>
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000" 
                        style={{ width: `${bids.length > 0 ? (bids.filter(b => b.bid_status === 'accepted').length / bids.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest text-center">TOTAL VALUE</p>
                      <p className="text-lg font-black italic text-center">PKR {Math.round(bids.reduce((acc, b) => acc + b.proposed_cost, 0) / 1000000)}M</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest text-center">ACTIVE BIDS</p>
                      <p className="text-lg font-black italic text-center">{bids.filter(b => b.bid_status === 'pending').length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module: Protection */}
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="text-emerald-400" size={24} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">SYSTEM STATUS</p>
                    <p className="text-xs font-bold text-emerald-200">ESCROW PROTECTED</p>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-emerald-200/80 font-medium">
                  All active bids and project agreements are secured via ArchIntent's proprietary Escrow Protocol. Funds are only released upon verified milestone completion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorBids;

