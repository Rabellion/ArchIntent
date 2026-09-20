import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { 
  AlertCircle, 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Send, 
  X, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Layers, 
  Activity, 
  ShieldCheck, 
  ChevronRight,
  User,
  MessageSquare,
  ChevronDown,
  Info
} from 'lucide-react';
import StartChatButton from '../components/chat/StartChatButton';

interface ConstructionJob {
  project_id: number;
  project_title: string;
  project_type: string;
  location: string;
  budget: number;
  brief_text: string;
  created_at: string;
  client?: {
    user_id: number;
    full_name: string;
  };
}

interface WalletData {
  balance: number;
}

const ConstructionJobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<ConstructionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBidForm, setShowBidForm] = useState(false);
  const [alreadyBid, setAlreadyBid] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [budzToSpend, setBudzToSpend] = useState(1);
  const [wallet, setWallet] = useState<WalletData>({ balance: 0 });
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const [jobRes, bidsRes, walletRes] = await Promise.all([
        axiosInstance.get(`/projects/${id}`),
        axiosInstance.get('/contractor/bids').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/budz/wallet').catch(() => ({ data: { data: { balance: 0 } } })),
      ]);

      setJob(jobRes.data.data);
      const existingBid = (bidsRes.data.data || []).find((bid: any) => bid.project?.project_id === parseInt(id || '0', 10));
      setAlreadyBid(!!existingBid);

      const balance = walletRes.data?.data?.balance || 0;
      setWallet({ balance });
      setBudzToSpend(balance > 0 ? 1 : 0);
      
      if (jobRes.data.data?.project_title) {
        document.title = `${jobRes.data.data.project_title} — Project Details`;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bidAmount || parseInt(bidAmount, 10) <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    if (!estimatedDuration || parseInt(estimatedDuration, 10) <= 0) {
      alert('Please enter valid estimated duration (days)');
      return;
    }

    if (wallet.balance <= 0) {
      alert('You need Budz to submit a bid');
      return;
    }

    setSubmittingBid(true);
    try {
      await axiosInstance.post(`/projects/${id}/bids`, {
        proposed_cost: parseInt(bidAmount, 10),
        estimated_duration: parseInt(estimatedDuration, 10),
        proposal_text: bidNotes || undefined,
        budz_to_spend: budzToSpend,
      });

      setBidSubmitted(true);
      setAlreadyBid(true);
      setShowBidForm(false);
      window.dispatchEvent(new Event('budz-updated'));

      setTimeout(() => {
        navigate('/dashboard/contractor/bids');
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit bid');
      setSubmittingBid(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-slate-950">
        <div className="w-20 h-20 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-8 animate-pulse">Syncing Project Blueprint...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-slate-100">
         <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-8 mx-auto border border-slate-700">
            <AlertCircle className="w-10 h-10 text-slate-500" />
         </div>
         <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-100 mb-4">Blueprint Lost</h2>
         <p className="text-slate-400 font-medium text-lg mb-8 max-w-md mx-auto">{error || 'This project record has been archived or does not exist in the active registry.'}</p>
         <button onClick={() => navigate(-1)} className="px-10 py-4 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">Return to Browse</button>
      </div>
    );
  }

  const rankingText =
    budzToSpend >= 100
      ? '[TOP] You will appear near the TOP'
      : budzToSpend >= 50
      ? '[MIDDLE] You will appear in the MIDDLE'
      : budzToSpend >= 10
      ? '[LOWER TOP] You will appear below top bids'
      : '[BOTTOM] You will appear at the BOTTOM';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Premium Dynamic Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center text-slate-200 hover:bg-slate-800 hover:text-white transition-all">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div className="hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Project Registry</p>
                <h2 className="text-sm font-black italic uppercase tracking-tight text-slate-100">ID: P-{job.project_id.toString().padStart(5, '0')}</h2>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Status</p>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                   <Activity className="w-3 h-3" /> Accepting Bids
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          
          {/* Main Module: Project Story */}
          <div className="flex-1 space-y-20">
            
            {/* Project Hero Section */}
            <section className="space-y-8">
               <div>
                  <div className="flex items-center gap-4 mb-6">
                     <span className="px-4 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/40">
                        {job.project_type}
                     </span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                     </span>
                  </div>
                  <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] text-slate-100">
                     {job.project_title.split(' ')[0]} <br/>
                     <span className="text-indigo-400">{job.project_title.split(' ').slice(1).join(' ')}</span>
                  </h1>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-800">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Budget</p>
                     <p className="text-2xl font-black italic uppercase tracking-tight text-slate-100">PKR {job.budget.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</p>
                     <p className="text-2xl font-black italic uppercase tracking-tight text-slate-100">{job.location}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Category</p>
                     <p className="text-2xl font-black italic uppercase tracking-tight text-slate-100">{job.project_type}</p>
                  </div>
               </div>
            </section>

            {/* Site Narrative Section */}
            <section className="space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                     <Layers className="w-6 h-6 text-slate-200" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Module 01</p>
                     <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Site Narrative</h3>
                  </div>
               </div>
               
               <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 border border-slate-700">
                  <p className="text-xl text-slate-300 font-medium leading-relaxed italic whitespace-pre-wrap">
                     {job.brief_text}
                  </p>
               </div>
            </section>

            {/* Client Context Section */}
            <section className="space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                     <User className="w-6 h-6 text-slate-200" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Module 02</p>
                     <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Entity Context</h3>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row items-center justify-between gap-8 p-10 rounded-[3rem] border border-slate-700 bg-slate-900 shadow-xl shadow-black/20">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center text-white text-2xl font-black italic">
                        {job.client?.full_name?.charAt(0) || 'U'}
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Identity Verified</p>
                        <h4 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">{job.client?.full_name || 'System User'}</h4>
                     </div>
                  </div>
                  
                  {job.client?.user_id && (
                    <StartChatButton
                      recipientUserId={job.client.user_id}
                      projectId={job.project_id}
                      label="Inquire About Project"
                      variant="primary"
                      allowedRoles={['contractor']}
                    />
                  )}
               </div>
            </section>

          </div>

          {/* Sidebar: Engagement Protocol */}
          <div className="lg:w-[28rem] space-y-8">
             <div className="sticky top-32 space-y-8">
                
                {/* Engagement Protocol Module */}
                <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl shadow-black/30 border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                   
                   {bidSubmitted ? (
                     <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
                           <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tight mb-2">Protocol Active</h4>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-8">Bid Synchronization Complete</p>
                        <p className="text-slate-300 text-sm font-medium italic">Redirecting to bid management...</p>
                     </div>
                   ) : alreadyBid ? (
                     <div className="space-y-8 relative z-10">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-3xl flex items-center justify-center border border-indigo-500/30">
                           <ShieldCheck className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tight mb-2">Bid Record Found</h4>
                           <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-relaxed">
                              You have already established an engagement protocol for this project. Your bid is currently being audited by the client.
                           </p>
                        </div>
                        <button 
                           onClick={() => navigate('/dashboard/contractor/bids')}
                           className="w-full py-5 bg-slate-100 text-slate-900 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-xl"
                        >
                           Manage Active Bids
                        </button>
                     </div>
                   ) : wallet.balance <= 0 ? (
                     <div className="space-y-8 relative z-10">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center border border-amber-500/30">
                           <Info className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tight mb-2">Fiscal Lock</h4>
                           <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-relaxed">
                              Insufficient Budz credits detected in your wallet. A minimum of 1 Budz is required to initiate an engagement protocol.
                           </p>
                        </div>
                        <button 
                           onClick={() => navigate('/dashboard/contractor/buy-budz')}
                           className="w-full py-5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-600 transition-all shadow-xl"
                        >
                           Acquire Credits
                        </button>
                     </div>
                   ) : !showBidForm ? (
                     <div className="space-y-8 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Engagement Protocol</p>
                        <div className="space-y-2">
                           <h4 className="text-3xl font-black italic uppercase tracking-tighter">Initiate <br/><span className="text-indigo-500">Proposal</span></h4>
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-relaxed">
                           Apply to this project by establishing your fiscal and operational terms. Use Budz to boost your ranking in the client's queue.
                        </p>
                        <button 
                           onClick={() => setShowBidForm(true)}
                           className="w-full py-6 bg-slate-100 text-slate-900 rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-2xl group flex items-center justify-center gap-4"
                        >
                           Establish Bid <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                   ) : (
                     <div className="space-y-8 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="text-xl font-black italic uppercase tracking-tight">Bid Definition</h4>
                           <button onClick={() => setShowBidForm(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                              <X className="w-4 h-4" />
                           </button>
                        </div>

                        <form onSubmit={handleSubmitBid} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proposed Cost (PKR)</label>
                              <div className="relative">
                                 <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                 <input 
                                    type="number" 
                                    value={bidAmount} 
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-black focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Days)</label>
                              <div className="relative">
                                 <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                 <input 
                                    type="number" 
                                    value={estimatedDuration} 
                                    onChange={(e) => setEstimatedDuration(e.target.value)}
                                    placeholder="Total Days"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-black focus:border-indigo-500 focus:ring-0 outline-none transition-all"
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proposal Narrative</label>
                              <textarea 
                                 value={bidNotes} 
                                 onChange={(e) => setBidNotes(e.target.value)}
                                 placeholder="Outline your execution strategy..."
                                 rows={3}
                                 className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-sm font-medium focus:border-indigo-500 focus:ring-0 outline-none transition-all italic"
                              />
                           </div>

                           <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6">
                              <div className="flex items-center justify-between">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Boost Tier</p>
                                 <p className="text-xs font-black italic text-amber-400 tracking-tight">{budzToSpend} Budz</p>
                              </div>
                              <input 
                                 type="range" 
                                 min={1} 
                                 max={Math.min(500, wallet.balance)} 
                                 value={budzToSpend} 
                                 onChange={(e) => setBudzToSpend(parseInt(e.target.value, 10))} 
                                 className="w-full accent-indigo-500" 
                              />
                              <div className="p-4 bg-indigo-600/20 rounded-2xl border border-indigo-500/30">
                                 <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Queue Projection</p>
                                 <p className="text-[10px] font-black text-white italic tracking-tight">{rankingText}</p>
                              </div>
                           </div>

                           <button 
                              type="submit" 
                              disabled={submittingBid || !bidAmount || !estimatedDuration}
                              className="w-full py-6 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-4"
                           >
                              {submittingBid ? 'Synchronizing...' : <>Submit Proposal <Send className="w-4 h-4" /></>}
                           </button>
                        </form>
                     </div>
                   )}
                </div>

                {/* Secure Hiring Protocol Widget */}
                <div className="bg-emerald-950/40 rounded-[3rem] p-10 border border-emerald-800/50">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                         <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-black italic uppercase tracking-tight text-slate-100">Secure Protocol</h4>
                   </div>
                   <p className="text-sm text-emerald-200/80 font-medium leading-relaxed mb-6">
                      All bids are protected by the ArchIntent Secure Hiring Protocol. Payments are held in escrow until milestone completion is verified.
                   </p>
                   <ul className="space-y-3">
                      {['Identity Verification', 'Escrow Protection', 'Dispute Resolution'].map(item => (
                        <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                           <div className="w-1 h-1 bg-emerald-400 rounded-full"></div> {item}
                        </li>
                      ))}
                   </ul>
                </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConstructionJobDetail;
