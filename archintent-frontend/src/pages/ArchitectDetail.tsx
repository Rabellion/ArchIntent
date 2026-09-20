import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { 
  CheckCircle2, 
  X, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Briefcase, 
  MessageSquare, 
  Rocket, 
  Star, 
  Layers, 
  Maximize2,
  ChevronLeft,
  Share2,
  ShieldCheck,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StartChatButton from '../components/chat/StartChatButton';
import ReviewSummary from '../components/reviews/ReviewSummary';
import ReviewCard from '../components/reviews/ReviewCard';
import StarRating from '../components/reviews/StarRating';
import type { ReviewItem, ReviewSummaryData } from '../types/reviews';
import { resolveImageUrl } from '../utils/storage';

type ArchitectProject = {
  architect_project_id: number;
  project_ref: string;
  project_title: string;
  project_description?: string;
  project_type: string;
  style_tags?: string[];
  location?: string;
  area_sqft?: number;
  year_completed?: number;
  formatted_budget?: string;
  images: Array<{ image_id: number; image_url: string }>;
  cover_image?: { image_url: string };
};

type ArchitectProfile = {
  architect_id: number;
  average_rating?: number;
  total_reviews?: number;
  user: {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    profile_image?: string;
  };
  specialization?: string;
  bio?: string;
  experience_years?: number;
  verification_status: 'verified' | 'pending' | 'rejected';
  portfolio?: {
    bio_statement?: string;
    total_projects_count: number;
    projects: ArchitectProject[];
  };
};

const ArchitectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [architect, setArchitect] = useState<ArchitectProfile | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryData>({
    average_rating: 0,
    total_reviews: 0,
    rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLastPage, setReviewLastPage] = useState(1);
  const [visibleReviews, setVisibleReviews] = useState(5);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/architect/${id}`);
        setArchitect(res.data?.data || null);

        const reviewRes = await axiosInstance.get(`/reviews/architect/${id}`);
        const reviewData: ReviewItem[] = reviewRes.data?.data || [];
        setReviews(reviewData);
        setReviewSummary(reviewRes.data?.summary || {
          average_rating: 0,
          total_reviews: 0,
          rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        });
        setReviewPage(reviewRes.data?.pagination?.current_page || 1);
        setReviewLastPage(reviewRes.data?.pagination?.last_page || 1);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load architect profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const projects = useMemo(() => {
    const base = architect?.portfolio?.projects || [];
    if (filterType === 'all') return base;
    return base.filter((p) => p.project_type === filterType);
  }, [architect, filterType]);

  const loadMoreReviews = async () => {
    if (visibleReviews < reviews.length) {
      setVisibleReviews((prev) => prev + 5);
      return;
    }

    if (reviewPage >= reviewLastPage || loadingMoreReviews) return;

    try {
      setLoadingMoreReviews(true);
      const nextPage = reviewPage + 1;
      const response = await axiosInstance.get(`/reviews/architect/${id}`, {
        params: { page: nextPage },
      });
      const nextReviews: ReviewItem[] = response.data?.data || [];
      setReviews((prev) => [...prev, ...nextReviews]);
      setReviewPage(response.data?.pagination?.current_page || nextPage);
      setReviewLastPage(response.data?.pagination?.last_page || reviewLastPage);
      setVisibleReviews((prev) => prev + 5);
    } catch (_error) {
      // Keep existing reviews
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-white">
        <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8 animate-pulse">Syncing Portfolio Records...</p>
      </div>
    );
  }

  if (!architect) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">Registry Fault</h2>
        <p className="text-slate-500 font-medium text-lg mb-8">{error || 'Architect identity not found in the global registry.'}</p>
        <button onClick={() => navigate('/architects')} className="px-10 py-4 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Back to Browse</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Dynamic Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/architects')} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" />
             </button>
             <div className="hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Architect Profile</p>
                <h2 className="text-sm font-black italic uppercase tracking-tight text-slate-900">{architect.user.full_name}</h2>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Portoflio Tier</p>
                <p className="text-xs font-black text-slate-900">{architect.portfolio?.total_projects_count || 0} Projects Synchronized</p>
             </div>
             <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          
          {/* Main Content */}
          <div className="flex-1 space-y-24">
            
            {/* Identity Module */}
            <section className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
               <div className="relative shrink-0">
                  {architect.user.profile_image ? (
                    <img 
                      src={resolveImageUrl(architect.user.profile_image)} 
                      alt={architect.user.full_name} 
                      className="w-48 h-48 rounded-[3.5rem] object-cover ring-[12px] ring-slate-50 shadow-2xl"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-[3.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-6xl font-black shadow-2xl">
                       {architect.user.full_name.charAt(0)}
                    </div>
                  )}
                  {architect.verification_status === 'verified' && (
                    <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-emerald-600 rounded-3xl shadow-xl flex items-center justify-center text-white border-4 border-white">
                       <ShieldCheck className="w-7 h-7" />
                    </div>
                  )}
               </div>

               <div className="flex-1 space-y-6">
                  <div>
                     <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.8] text-slate-900 mb-4">
                        {architect.user.full_name.split(' ')[0]} <br/>
                        <span className="text-indigo-600">{architect.user.full_name.split(' ').slice(1).join(' ')}</span>
                     </h1>
                     <div className="flex flex-wrap items-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                           <StarRating rating={Number(architect.average_rating || 0)} size="sm" />
                           <span className="text-xs font-black uppercase tracking-widest text-slate-400">({architect.total_reviews} Reviews)</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                           <MapPin className="w-4 h-4" /> Global Expert
                        </div>
                     </div>
                  </div>

                  <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl">
                     {architect.bio || architect.portfolio?.bio_statement || 'Defining modern architecture through structural excellence and visionary design principles.'}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                     {user?.role === 'client' && (
                       <>
                         <button 
                           onClick={() => navigate(`/dashboard/client/create-project?architect_id=${architect.architect_id}`)} 
                           className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl flex items-center gap-4 group"
                         >
                           Initiate Project
                           <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                         </button>
                         <StartChatButton 
                           recipientUserId={architect.user.user_id} 
                           label="Secure Message" 
                           variant="outline" 
                           allowedRoles={['client']} 
                         />
                       </>
                     )}
                  </div>
               </div>
            </section>

            {/* Expertise Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-8">
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Briefcase className="w-4 h-4" /> Focus Domain
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{architect.specialization}</p>
               </div>
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Clock className="w-4 h-4" /> Tenure
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{architect.experience_years || 0} Years Experience</p>
               </div>
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Layers className="w-4 h-4" /> Catalog Size
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{architect.portfolio?.total_projects_count || 0} Active Projects</p>
               </div>
            </section>

            {/* Portfolio Module */}
            <section className="space-y-12">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                     <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 leading-none">Catalog 01</p>
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Project <br/><span className="text-indigo-600">Masterworks</span></h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['all', 'residential', 'commercial', 'industrial', 'landscape'].map((type) => {
                       const active = filterType === type;
                       return (
                          <button 
                             key={type} 
                             onClick={() => setFilterType(type)} 
                             className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                active 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-600 hover:text-indigo-600'
                             }`}
                          >
                             {type === 'all' ? 'Universal' : type}
                          </button>
                       );
                    })}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {projects.map((p) => (
                   <div key={p.architect_project_id} className="group bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden hover:border-indigo-200 transition-all duration-500">
                     <div className="relative aspect-[16/10] overflow-hidden">
                       {(p.cover_image?.image_url || p.images?.[0]?.image_url) ? (
                         <img 
                           src={resolveImageUrl(p.cover_image?.image_url || p.images?.[0]?.image_url)} 
                           alt={p.project_title} 
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                         />
                       ) : (
                         <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                            <Layers className="w-12 h-12 text-slate-300" />
                         </div>
                       )}
                       <div className="absolute top-6 left-6 flex gap-2">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">{p.project_ref}</span>
                          <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">{p.project_type}</span>
                       </div>
                       <button 
                         onClick={() => setLightbox(resolveImageUrl(p.cover_image?.image_url || p.images?.[0]?.image_url) || null)}
                         className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:bg-slate-900 hover:text-white"
                       >
                          <Maximize2 className="w-5 h-5" />
                       </button>
                     </div>
                     <div className="p-10 space-y-6">
                       <div>
                         <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 mb-2">{p.project_title}</h3>
                         <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {p.location || 'N/A'}</div>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {p.year_completed || 'N/A'}</div>
                         </div>
                       </div>
                       <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 italic">
                         {p.project_description || 'A visionary architectural implementation focused on structural integrity and modern aesthetic principles.'}
                       </p>
                       <div className="flex flex-wrap gap-2">
                         {(p.style_tags || []).slice(0, 3).map((t) => (
                           <span key={t} className="text-[8px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">{t}</span>
                         ))}
                       </div>
                       <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                          <p className="text-lg font-black italic text-slate-900 tracking-tight">{p.formatted_budget || 'Fiscal Request'}</p>
                          <button 
                            onClick={() => navigate(`/architect/projects/${p.project_ref}`)} 
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 hover:text-slate-900 transition-colors"
                          >
                             Full Narrative <ChevronRight className="w-4 h-4" />
                          </button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </section>

            {/* Reviews Module */}
            <section id="reviews" className="space-y-12">
               <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 leading-none">Catalog 02</p>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Client <br/><span className="text-indigo-600">Feedback</span></h2>
               </div>

               {reviewSummary.total_reviews === 0 ? (
                 <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No project reviews synchronized yet.</p>
                 </div>
               ) : (
                 <div className="space-y-12">
                    <div className="bg-white rounded-[3.5rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/50">
                       <ReviewSummary summary={reviewSummary} />
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                      {reviews.slice(0, visibleReviews).map((review) => (
                        <div key={review.review_id} className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-lg shadow-slate-100/50 group hover:border-indigo-100 transition-colors">
                           <ReviewCard review={review} />
                        </div>
                      ))}
                    </div>

                    {visibleReviews < reviews.length || reviewPage < reviewLastPage ? (
                      <div className="flex justify-center">
                         <button
                           type="button"
                           onClick={loadMoreReviews}
                           className="px-10 py-5 bg-white border-2 border-slate-200 rounded-full text-xs font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-xl shadow-slate-100 flex items-center gap-4 group"
                         >
                           {loadingMoreReviews ? (
                             <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                           ) : (
                             <>
                               Explore More Feedback
                               <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                             </>
                           )}
                         </button>
                      </div>
                    ) : null}
                 </div>
               )}
            </section>

          </div>

          {/* Sidebar Protocol */}
          <div className="lg:w-96 space-y-8">
             <div className="sticky top-32 space-y-8">
                {/* Status Card */}
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8">System Status</p>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity</span>
                         <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Verified Entity</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response</span>
                         <span className="text-xs font-black uppercase italic tracking-tight">&lt; 4 Hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Score</span>
                         <span className="text-xs font-black uppercase italic tracking-tight">4.9 / 5.0</span>
                      </div>
                      <div className="pt-6 border-t border-white/10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Skillset</p>
                         <div className="flex flex-wrap gap-2">
                            {['Modernist', 'Sustainable', 'Residential'].map(s => (
                               <span key={s} className="px-3 py-1 bg-white/5 text-[8px] font-black uppercase tracking-widest rounded-full border border-white/10">{s}</span>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Info Widget */}
                <div className="bg-indigo-50 rounded-[3rem] p-10 border border-indigo-100">
                   <ShieldCheck className="w-10 h-10 text-indigo-600 mb-6" />
                   <h4 className="text-lg font-black italic uppercase tracking-tight text-slate-900 mb-4">Secure Hiring</h4>
                   <p className="text-sm text-indigo-900/60 font-medium leading-relaxed">
                      All projects initiated through ArchIntent are protected by our secure project protocol and automated agreement system.
                   </p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Lightbox Overlay */}
      {lightbox && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setLightbox(null)}>
          <button className="absolute top-10 right-10 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur" onClick={() => setLightbox(null)}>
             <X size={24} />
          </button>
          <img src={lightbox} alt="preview" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}
    </div>
  );
};

export default ArchitectDetail;
