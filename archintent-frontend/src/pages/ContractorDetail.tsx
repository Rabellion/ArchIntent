import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { getContractorProjectImageUrl, resolveImageUrl } from '../utils/storage';
import { 
  Briefcase, 
  CheckCircle2, 
  X, 
  ZoomIn, 
  ChevronLeft, 
  Share2, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Award, 
  Layers, 
  ChevronRight, 
  MessageSquare,
  Maximize2,
  Calendar,
  Building2,
  Trophy,
  Activity,
  HardHat,
  ChevronDown
} from 'lucide-react';
import ReviewSummary from '../components/reviews/ReviewSummary';
import ReviewCard from '../components/reviews/ReviewCard';
import StarRating from '../components/reviews/StarRating';
import type { ReviewItem, ReviewSummaryData } from '../types/reviews';

interface ContractorDetailData {
  contractor_id: number;
  company_name: string;
  registration_number?: string;
  company_address?: string;
  experience_years: number;
  specialization?: string;
  bio?: string;
  verification_status: 'verified' | 'pending' | 'rejected';
  won_bids_count: number;
  average_rating?: number;
  total_reviews?: number;
  user?: {
    full_name?: string;
    email?: string;
    phone_number?: string;
    profile_image?: string;
  };
  portfolio?: {
    company_bio?: string;
    years_in_business?: number;
    total_projects_count?: number;
    projects?: Array<{
      contractor_project_id: number;
      project_ref: string;
      project_title: string;
      project_description?: string;
      project_type?: string;
      location?: string;
      area_sqft?: number;
      completion_date?: string;
      project_value_pkr?: number;
      duration_days?: number;
      client_feedback?: string;
      images: Array<{
        image_id: number;
        image_path?: string;
        image_url?: string;
      }>;
    }>;
  };
}

const ContractorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [contractor, setContractor] = useState<ContractorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
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
    fetchContractor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContractor = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(`/contractor/${id}/portfolio`);
      const contractorData = response.data?.data || null;
      setContractor(contractorData);

      const reviewsResponse = await axiosInstance.get(`/reviews/contractor/${id}`);
      setReviews(reviewsResponse.data?.data || []);
      setReviewSummary(reviewsResponse.data?.summary || {
        average_rating: 0,
        total_reviews: 0,
        rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
      setReviewPage(reviewsResponse.data?.pagination?.current_page || 1);
      setReviewLastPage(reviewsResponse.data?.pagination?.last_page || 1);
      
      if (contractorData?.company_name) {
        document.title = `${contractorData.company_name} — Contractor Profile`;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load contractor profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (visibleReviews < reviews.length) {
      setVisibleReviews((prev) => prev + 5);
      return;
    }

    if (reviewPage >= reviewLastPage || loadingMoreReviews) return;

    try {
      setLoadingMoreReviews(true);
      const nextPage = reviewPage + 1;
      const response = await axiosInstance.get(`/reviews/contractor/${id}`, {
        params: { page: nextPage },
      });
      const nextReviews: ReviewItem[] = response.data?.data || [];
      setReviews((prev) => [...prev, ...nextReviews]);
      setReviewPage(response.data?.pagination?.current_page || nextPage);
      setReviewLastPage(response.data?.pagination?.last_page || reviewLastPage);
      setVisibleReviews((prev) => prev + 5);
    } catch (_error) {
      // Keep current reviews
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-white">
        <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8 animate-pulse">Syncing Entity Registry...</p>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">Registry Fault</h2>
        <p className="text-slate-500 font-medium text-lg mb-8">{error || 'Contractor identity not found in the global registry.'}</p>
        <button onClick={() => navigate(-1)} className="px-10 py-4 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Back to Browse</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Dynamic Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" />
             </button>
             <div className="hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Contractor Entity</p>
                <h2 className="text-sm font-black italic uppercase tracking-tight text-slate-900">{contractor.company_name}</h2>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Fiscal Tier</p>
                <p className="text-xs font-black text-slate-900">{contractor.won_bids_count} Project Wins</p>
             </div>
             <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          
          {/* Main Module */}
          <div className="flex-1 space-y-24">
            
            {/* Entity Identity Section */}
            <section className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
               <div className="relative shrink-0">
                  {contractor.user?.profile_image ? (
                    <img 
                      src={resolveImageUrl(contractor.user.profile_image)} 
                      alt={contractor.company_name} 
                      className="w-48 h-48 rounded-[3.5rem] object-cover ring-[12px] ring-slate-50 shadow-2xl"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-[3.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-6xl font-black shadow-2xl">
                       {contractor.company_name?.charAt(0) || 'C'}
                    </div>
                  )}
                  {contractor.verification_status === 'verified' && (
                    <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-emerald-600 rounded-3xl shadow-xl flex items-center justify-center text-white border-4 border-white">
                       <ShieldCheck className="w-7 h-7" />
                    </div>
                  )}
               </div>

               <div className="flex-1 space-y-6">
                  <div>
                     <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.8] text-slate-900 mb-4">
                        {contractor.company_name.split(' ')[0]} <br/>
                        <span className="text-indigo-600">{contractor.company_name.split(' ').slice(1).join(' ')}</span>
                     </h1>
                     <div className="flex flex-wrap items-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                           <StarRating rating={Number(contractor.average_rating || 0)} size="sm" />
                           <span className="text-xs font-black uppercase tracking-widest text-slate-400">({contractor.total_reviews} Reviews)</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                           <MapPin className="w-4 h-4" /> Regional Operations
                        </div>
                     </div>
                  </div>

                  <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl italic">
                     "{contractor.portfolio?.company_bio || contractor.bio || 'Executing high-fidelity construction projects with engineering precision and fiscal transparency.'}"
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-black uppercase tracking-widest text-slate-400 pt-4">
                    {contractor.user?.email && <div className="flex items-center gap-2"><span className="text-slate-900">Email:</span> {contractor.user.email}</div>}
                    {contractor.company_address && <div className="flex items-center gap-2"><span className="text-slate-900">Entity HQ:</span> {contractor.company_address}</div>}
                  </div>
               </div>
            </section>

            {/* Performance Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-8">
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Briefcase className="w-4 h-4" /> Tenure
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{contractor.experience_years}+ Years Experience</p>
               </div>
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Trophy className="w-4 h-4" /> Market Cap
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{contractor.won_bids_count} Project Wins</p>
               </div>
               <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col justify-between h-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Activity className="w-4 h-4" /> Reliability Score
                  </p>
                  <p className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Tier A Expert</p>
               </div>
            </section>

            {/* Portfolio Module */}
            <section className="space-y-12">
               <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2 leading-none">Catalog 01</p>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Construction <br/><span className="text-indigo-600">Chronicles</span></h2>
               </div>

               {!contractor.portfolio?.projects?.length ? (
                 <div className="p-20 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-100 text-center">
                    <HardHat className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No construction projects synchronized in the portfolio subsystem.</p>
                 </div>
               ) : (
                 <div className="space-y-12">
                   {contractor.portfolio.projects.map((project) => (
                     <div key={project.contractor_project_id} className="group bg-white rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden hover:border-indigo-200 transition-all duration-500">
                       <div className="p-10 md:p-12 space-y-10">
                         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-50 pb-8">
                            <div>
                               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{project.project_ref}</p>
                               <h3 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">{project.project_title}</h3>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                               <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {project.completion_date ? new Date(project.completion_date).toLocaleDateString() : 'N/A'}</div>
                               <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                               <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {project.location || 'Regional'}</div>
                            </div>
                         </div>

                         <p className="text-lg text-slate-600 font-medium leading-relaxed italic">
                           "{project.project_description || 'High-fidelity implementation focused on structural integrity and engineering precision.'}"
                         </p>

                         {!!project.images?.length && (
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                             {project.images.map((image) => {
                               const imageUrl = image.image_url
                                 ? resolveImageUrl(image.image_url)
                                 : (image.image_path ? getContractorProjectImageUrl(project.contractor_project_id, image.image_path) : '');
                               if (!imageUrl) return null;

                               return (
                                 <div key={image.image_id} className="relative group/img cursor-pointer aspect-square overflow-hidden rounded-[2.5rem] shadow-xl">
                                   <img
                                     src={imageUrl}
                                     alt={project.project_title}
                                     className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                                     onClick={() => setEnlargedImage(imageUrl)}
                                   />
                                   <div 
                                     onClick={() => setEnlargedImage(imageUrl)}
                                     className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/40 transition-colors flex items-center justify-center"
                                   >
                                      <Maximize2 className="text-white opacity-0 group-hover/img:opacity-100 transition-all scale-50 group-hover/img:scale-100" size={32} />
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         )}

                         <div className="pt-8 flex flex-wrap gap-10">
                            {project.project_value_pkr && (
                               <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Valuation</p>
                                  <p className="text-xl font-black italic text-slate-900 tracking-tight">PKR {project.project_value_pkr.toLocaleString()}</p>
                               </div>
                            )}
                            {project.duration_days && (
                               <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Period</p>
                                  <p className="text-xl font-black italic text-slate-900 tracking-tight">{project.duration_days} Operating Days</p>
                               </div>
                            )}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </section>

            {/* Reviews Module */}
            <section id="reviews" className="space-y-12">
               <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 leading-none">Catalog 02</p>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Client <br/><span className="text-indigo-600">Testimonials</span></h2>
               </div>

               {reviewSummary.total_reviews === 0 ? (
                 <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No project feedback synchronized yet.</p>
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
                {/* Identity Protocol Card */}
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8">Identity Protocol</p>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Status</span>
                         <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Verified Entity</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registration</span>
                         <span className="text-xs font-black uppercase italic tracking-tight">{contractor.registration_number || 'Internal Record'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Score</span>
                         <span className="text-xs font-black uppercase italic tracking-tight">4.9 / 5.0</span>
                      </div>
                      <div className="pt-6 border-t border-white/10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Specialization</p>
                         <div className="flex flex-wrap gap-2">
                            {contractor.specialization?.split(',').map(s => (
                               <span key={s} className="px-3 py-1 bg-white/5 text-[8px] font-black uppercase tracking-widest rounded-full border border-white/10">{s.trim()}</span>
                            )) || <span className="px-3 py-1 bg-white/5 text-[8px] font-black uppercase tracking-widest rounded-full border border-white/10">General Construction</span>}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Fiscal Tier Widget */}
                <div className="bg-indigo-50 rounded-[3rem] p-10 border border-indigo-100">
                   <Award className="w-10 h-10 text-indigo-600 mb-6" />
                   <h4 className="text-lg font-black italic uppercase tracking-tight text-slate-900 mb-4">Fiscal Tier: A</h4>
                   <p className="text-sm text-indigo-900/60 font-medium leading-relaxed">
                      This entity has been authorized for high-budget construction projects based on fiscal transparency and past performance records.
                   </p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Lightbox Protocol */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-6 animate-in fade-in duration-300"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute right-10 top-10 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur"
          >
            <X size={24} />
          </button>
          <img src={enlargedImage} alt="Portfolio" className="max-h-full max-w-full object-contain rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}
    </div>
  );
};

export default ContractorDetail;
