import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, ChevronRight, MessageSquare, CheckCircle2, Star, Target, Sparkles } from 'lucide-react';
import axiosInstance from '../api/axios';
import { resolveImageUrl } from '../utils/storage';
import StartChatButton from '../components/chat/StartChatButton';

interface PortfolioImage {
  image_id: number;
  image_url: string;
}

interface Match {
  architect_id: number;
  architect_user_id?: number;
  full_name: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  match_score: number;
  portfolio_images?: PortfolioImage[];
  style_tags?: string[];
  budget_range_min?: number;
  budget_range_max?: number;
  profile_photo_url?: string;
  portfolio_photo_url?: string;
}

interface Project {
  project_id: number;
  project_title: string;
}

const MatchedArchitects: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArchitectId, setSelectedArchitectId] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const itemsPerPage = 8;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatches = matches.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(matches.length / itemsPerPage);

  useEffect(() => {
    fetchProjectAndMatches();
  }, [id]);

  const normalizeMatches = (raw: any): Match[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw) as Match[];
    return [];
  };

  const fetchProjectAndMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const [mRes, pRes] = await Promise.all([
        axiosInstance.get(`/projects/${id}/matches`),
        axiosInstance.get(`/projects/${id}`)
      ]);
      setMatches(normalizeMatches(mRes.data?.data).sort((a, b) => b.match_score - a.match_score));
      setProject(pRes.data?.data ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const getScoreConfig = (score: number) => {
    if (score >= 90) return { color: 'text-emerald-300', bg: 'bg-emerald-950', border: 'border-emerald-700', label: 'OPTIMAL MATCH' };
    if (score >= 75) return { color: 'text-indigo-300', bg: 'bg-indigo-950', border: 'border-indigo-700', label: 'RECOMMENDED' };
    if (score >= 60) return { color: 'text-amber-300', bg: 'bg-amber-950', border: 'border-amber-700', label: 'STRONG FIT' };
    return { color: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-600', label: 'COMPATIBLE' };
  };

  const handleSelectArchitect = async () => {
    if (!selectedArchitectId) return;
    setConfirmLoading(true);
    try {
      await axiosInstance.post(`/projects/${id}/select-architect`, { architect_id: selectedArchitectId });
      setShowSuccess(true);
      setConfirmModalOpen(false);
      setTimeout(() => navigate(`/project/${id}`), 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Selection failed');
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative mb-8">
           <div className="w-20 h-20 border-4 border-slate-700 rounded-full" />
           <div className="w-20 h-20 border-4 border-t-indigo-500 rounded-full animate-spin absolute top-0 left-0" />
           <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-black italic uppercase tracking-widest text-slate-100">ArchIntent AI Engine</h2>
        <p className="text-slate-400 mt-2 font-bold text-[10px] uppercase tracking-[0.3em]">Synthesizing Portfolio Matrix...</p>
      </div>
    );
  }

  const selectedMatch = matches.find(m => m.architect_id === selectedArchitectId);

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4">
      {/* Premium Header */}
      <div className="pt-12 pb-16">
        <nav className="flex items-center gap-3 text-slate-400 mb-8">
          <Link to="/client/dashboard" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Matches</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-100 mb-6">
                Your Curated <br/><span className="text-indigo-400">Architect Pool</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg leading-relaxed">
                Our AI has analyzed thousands of data points to find professionals perfectly aligned with <span className="text-indigo-400 font-black italic">"{project?.project_title}"</span>.
              </p>
           </div>
           <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                 <Target className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">Total Candidates</p>
                 <p className="text-3xl font-black italic uppercase leading-none">{matches.length}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Matches Grid */}
      {matches.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {paginatedMatches.map((match) => {
            const config = getScoreConfig(match.match_score);
            return (
              <article key={match.architect_id} className="bg-slate-900 rounded-[3rem] border border-slate-700 shadow-2xl shadow-black/30 overflow-hidden group hover:shadow-indigo-500/20 transition-all flex flex-col">
                {/* Visual Preview */}
                <div className="h-72 relative overflow-hidden bg-slate-800">
                   {match.portfolio_images && match.portfolio_images.length > 0 ? (
                      <img 
                        src={resolveImageUrl(match.portfolio_images[0].image_url)} 
                        alt="Project Preview" 
                        className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                         <Sparkles className="w-16 h-16" />
                      </div>
                   )}
                   
                   {/* Match Score Badge */}
                   <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <div className={`px-4 py-2 ${config.bg} ${config.color} ${config.border} border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md`}>
                        {config.label}
                      </div>
                   </div>

                   <div className="absolute bottom-6 right-6 p-1 bg-slate-950/60 backdrop-blur-xl rounded-[2rem] border border-slate-600 shadow-2xl overflow-hidden">
                      <div className="bg-slate-900 rounded-[1.8rem] px-6 py-4 flex flex-col items-center border border-slate-700">
                         <span className={`text-4xl font-black italic ${config.color} leading-none mb-1`}>{match.match_score}%</span>
                         <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">Match Factor</span>
                      </div>
                   </div>
                </div>

                <div className="p-10 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                         <h3 className="text-3xl font-black text-slate-100 italic uppercase tracking-tight leading-none">{match.full_name}</h3>
                         <ShieldCheck className="text-indigo-400 w-5 h-5" />
                      </div>
                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">{match.specialization || 'Strategic Design Lead'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-3xl font-black italic text-slate-200 leading-none">{match.experience_years}+</span>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Years XP</span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-base leading-relaxed mb-8 font-medium line-clamp-3">
                    {match.bio || 'Synthesizing architectural excellence with project intent to deliver unparalleled spatial experiences.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-10">
                    {match.style_tags?.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-widest group-hover:bg-indigo-950 group-hover:text-indigo-300 transition-colors">
                        {tag}
                      </span>
                    ))}
                    {match.budget_range_max && (
                       <span className="px-4 py-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" /> Budget Aligned
                       </span>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-5">
                    <button 
                      onClick={() => setSelectedArchitectId(match.architect_id) || setConfirmModalOpen(true)}
                      className="py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl flex items-center justify-center gap-3 group/btn"
                    >
                      Hire Expert
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    {match.architect_user_id && (
                       <StartChatButton 
                         recipientUserId={match.architect_user_id}
                         projectId={project?.project_id}
                         label="Consult Now"
                         variant="secondary"
                         className="!py-5 !rounded-[1.5rem] !text-[10px] !font-black !uppercase !tracking-[0.2em] !bg-slate-800 !border-2 !border-slate-600 !text-slate-100 hover:!border-indigo-500 !transition-all !shadow-sm !justify-center !gap-3"
                         allowedRoles={['client']}
                       />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-[3rem] border border-slate-700 p-32 text-center shadow-xl">
          <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-600">
            <Target className="text-slate-500 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black italic uppercase text-slate-100 mb-4">No Optimized Matches</h2>
          <p className="text-slate-400 font-medium max-w-md mx-auto text-lg">Our AI is still scanning the candidate pool for professionals that meet your exact specifications. Please check back shortly.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-16">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="w-12 h-12 rounded-2xl border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-slate-400 transition-all"
          >
             <ArrowLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all ${
                currentPage === p 
                  ? 'bg-slate-900 text-white shadow-2xl scale-110' 
                  : 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 shadow-sm'
              }`}
            >
              {String(p).padStart(2, '0')}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="w-12 h-12 rounded-2xl border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-slate-400 transition-all"
          >
             <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Premium Confirmation Modal */}
      {confirmModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-[3rem] shadow-2xl max-w-lg w-full p-12 border border-slate-600 relative overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
            
            <div className="text-center mb-10">
               <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-950 border-8 border-slate-700 shadow-2xl mx-auto mb-8 overflow-hidden flex items-center justify-center">
                  {selectedMatch.profile_photo_url ? (
                    <img src={resolveImageUrl(selectedMatch.profile_photo_url)} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="text-indigo-400 w-12 h-12" />
                  )}
               </div>
               <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-100 mb-2">{selectedMatch.full_name}</h2>
               <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Confirm Selection</p>
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-6 mb-10 border border-slate-700">
               <p className="text-slate-300 text-center text-base font-medium leading-relaxed">
                 By selecting this professional, you initiate the formal engagement process. They will be notified to review your "ArchIntent" and generate a project agreement.
               </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="py-5 rounded-[1.5rem] border-2 border-slate-600 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-700 hover:text-slate-100 transition-all"
              >
                Abort
              </button>
              <button
                onClick={handleSelectArchitect}
                disabled={confirmLoading}
                className="py-5 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-3"
              >
                {confirmLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                  <>
                    Initialize <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Success Notification */}
      {showSuccess && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-6 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[60] animate-in slide-in-from-bottom-12 border border-white/10">
           <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">Match Finalized</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Redirecting to project environment...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default MatchedArchitects;
