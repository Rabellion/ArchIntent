import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import {
  AlertCircle,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Home,
  Building2,
  Factory,
  Trees,
  Search,
  ChevronDown,
  ArrowRight,
  Filter,
  ArrowLeft,
  Briefcase,
  History,
  TrendingUp,
  Check,
} from 'lucide-react';
import StartChatButton from '../components/chat/StartChatButton';

interface ConstructionJob {
  project_id: number;
  project_title: string;
  project_type: 'residential' | 'commercial' | 'industrial' | 'landscape';
  location: string;
  budget: number;
  brief_text: string;
  created_at: string;
  client?: {
    user_id: number;
    full_name: string;
  };
}

interface ContractorBid {
  bid_id: number;
  project_id: number;
  status: 'pending' | 'accepted' | 'rejected';
}

const ConstructionJobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ConstructionJob[]>([]);
  const [bids, setBids] = useState<ContractorBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'budget-high' | 'budget-low'>('newest');

  useEffect(() => {
    document.title = 'Construction Jobs — ArchIntent';
    fetchJobs();
  }, [page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const [jobsRes, bidsRes] = await Promise.all([
        axiosInstance.get('/projects/construction-jobs', { params: { page } }),
        axiosInstance.get('/contractor/bids').catch(() => ({ data: { data: [] } })),
      ]);

      setJobs(jobsRes.data.data || []);
      setBids(
        (bidsRes.data.data || []).map((bid: any) => ({
          bid_id: bid.bid_id,
          project_id: bid.project?.project_id,
          status: bid.bid_status,
        }))
      );
      setHasMore((jobsRes.data.data || []).length === 10);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load construction jobs');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Search filter (client-side)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.project_title.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter((job) => job.project_type === selectedType);
    }

    // Budget filter
    const minBudget = budgetMin ? parseInt(budgetMin) : 0;
    const maxBudget = budgetMax ? parseInt(budgetMax) : Infinity;
    result = result.filter((job) => job.budget >= minBudget && job.budget <= maxBudget);

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'budget-high') {
        return b.budget - a.budget;
      } else {
        return a.budget - b.budget;
      }
    });

    return result;
  }, [jobs, searchQuery, selectedType, budgetMin, budgetMax, sortBy]);

  // Get project type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'residential':
        return <Home className="w-5 h-5" />;
      case 'commercial':
        return <Building2 className="w-5 h-5" />;
      case 'industrial':
        return <Factory className="w-5 h-5" />;
      case 'landscape':
        return <Trees className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  // Get bid status for a project
  const getBidForProject = (projectId: number) => {
    return bids.find((bid) => bid.project_id === projectId);
  };

  // Calculate days since posted
  const getDaysAgo = (dateString: string) => {
    const postedDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - postedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full" />
          <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-slate-500 mt-4 font-medium animate-pulse tracking-widest uppercase text-[10px]">Loading Project Feed...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-100">
                Marketplace
              </span>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {jobs.length} Opportunities Found
              </span>
           </div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
             Bidding <span className="text-indigo-600">Opportunities</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1">
              <button 
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'newest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Newest
              </button>
              <button 
                onClick={() => setSortBy('budget-high')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'budget-high' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Top Budget
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Left Column: Filters */}
        <div className="lg:col-span-1">
          <div className="sticky top-10 space-y-8">
            <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Refine Search
              </h3>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Keyword Search</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Location, Title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-100 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Project Type */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Property Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['all', 'residential', 'commercial', 'industrial', 'landscape'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-left transition-all flex items-center justify-between group ${selectedType === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                      >
                        <span className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${selectedType === type ? 'bg-white/20' : 'bg-white group-hover:bg-slate-200'} transition-colors`}>
                            {getTypeIcon(type)}
                          </div>
                          {type}
                        </span>
                        {selectedType === type && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Budget Range (PKR)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                    />
                    <div className="w-2 h-0.5 bg-slate-200 shrink-0" />
                    <input
                      type="number"
                      placeholder="Max"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Market Stats Card */}
            <section className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
               <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                 <TrendingUp className="w-3.5 h-3.5" /> Market Insights
               </h4>
               <div className="space-y-4 relative z-10">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Average Budget</span>
                    <span className="text-xl font-black italic tracking-tight uppercase">PKR 4.2M</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[11px] text-slate-400 font-bold italic leading-relaxed">
                      Residential projects in Lahore are seeing 15% more bids this week.
                    </p>
                  </div>
               </div>
            </section>
          </div>
        </div>

        {/* Main Column: Feed */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex gap-4 animate-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-red-900 uppercase tracking-widest mb-1">Update Failed</h4>
                <p className="text-xs text-red-600 font-bold italic">{error}</p>
              </div>
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-20 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-2 leading-none">No Results <span className="text-indigo-600">Found</span></h2>
              <p className="text-slate-500 text-sm font-medium mb-8">Try adjusting your filters or expanding your search radius.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setBudgetMin('');
                  setBudgetMax('');
                }}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6">
                {filteredJobs.map((job) => {
                  const existingBid = getBidForProject(job.project_id);

                  return (
                    <article 
                      key={job.project_id} 
                      className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                    >
                      {/* Hover Accent */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Type Icon Container */}
                        <div className="shrink-0 flex flex-col items-center gap-3">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner border border-slate-50 transition-transform group-hover:scale-110 duration-500 ${
                            job.project_type === 'residential' ? 'bg-blue-50 text-blue-500' :
                            job.project_type === 'commercial' ? 'bg-purple-50 text-purple-500' :
                            job.project_type === 'industrial' ? 'bg-amber-50 text-amber-500' :
                            'bg-green-50 text-green-500'
                          }`}>
                            {React.cloneElement(getTypeIcon(job.project_type) as React.ReactElement<{ size?: number }>, { size: 32 })}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getDaysAgo(job.created_at)}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                             <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100">
                                {job.project_type}
                             </span>
                             {existingBid && (
                               <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                                 existingBid.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-100' :
                                 existingBid.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                 'bg-amber-50 text-amber-600 border-amber-100'
                               }`}>
                                 Bid {existingBid.status}
                               </span>
                             )}
                          </div>

                          <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors truncate">
                            {job.project_title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 mb-6">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold uppercase tracking-widest">{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold uppercase tracking-widest">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-2 italic leading-relaxed">
                            "{job.brief_text || 'No project description provided by the client.'}"
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-50">
                             <div>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Project Budget</span>
                               <span className="text-2xl font-black italic tracking-tight uppercase text-slate-900">
                                 PKR {job.budget.toLocaleString('en-PK')}
                               </span>
                             </div>

                             <div className="flex items-center gap-3">
                                {job.client?.user_id && (
                                  <StartChatButton
                                    recipientUserId={job.client.user_id}
                                    projectId={job.project_id}
                                    label="Message Client"
                                    variant="secondary"
                                    allowedRoles={['contractor']}
                                  />
                                )}
                                <button
                                  onClick={() => navigate(`/construction-jobs/${job.project_id}`)}
                                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all flex items-center gap-2 group/btn shadow-xl shadow-slate-100"
                                >
                                  {existingBid ? 'Update Bid' : 'Review & Bid'}
                                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                             </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-10">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                   {[...Array(page + (hasMore ? 1 : 0))].map((_, i) => (
                     <button
                       key={i}
                       onClick={() => setPage(i + 1)}
                       className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                >
                  Next Phase
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConstructionJobs;
