import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, ArrowRight, Layout, Users, Star, MapPin, Zap } from 'lucide-react';
import axiosInstance from '../api/axios';
import { resolveImageUrl } from '../utils/storage';
import StarRating from '../components/reviews/StarRating';

type ArchitectApi = {
  architect_id: number;
  full_name: string;
  profile_image?: string;
  average_rating?: number;
  total_reviews?: number;
  specialization?: string;
  experience_years?: number;
  verification_status?: string;
  portfolio?: {
    total_projects_count: number;
    projects: Array<{
      architect_project_id: number;
      project_ref: string;
      project_title: string;
      project_type?: string;
      style_tags?: string[];
      location?: string;
      year_completed?: number;
      cover_image?: { image_url?: string };
    }>;
  };
};

type ProjectCard = {
  architect_id: number;
  architect_name: string;
  architect_avatar?: string;
  architect_specialization?: string;
  project_ref: string;
  project_title: string;
  project_type?: string;
  style_tags?: string[];
  location?: string;
  year_completed?: number;
  cover_image?: string;
};

export default function ArchitectsBrowse() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // The term actually sent to the API. Kept separate from `search` so
  // typing does not fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'architect' | 'project'>('project');
  const [architects, setArchitects] = useState<ArchitectApi[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce the search box, and reset to page 1 whenever the term
  // changes -- staying on page 3 of the previous result set would show
  // an empty grid.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Search and paging are both server-side. This page previously
  // requested /architects with no parameters, which returned only the
  // first page of 12, and then filtered those 12 in the browser -- so
  // the 13th architect onward was invisible and unsearchable.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosInstance.get('/architects', {
          params: {
            page,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
        });

        // Laravel paginator arrives as { data: { data: [...], ... } }.
        const payload = res.data?.data;
        const rows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : [];

        if (cancelled) return;

        setArchitects(rows);
        setLastPage(payload?.last_page ?? 1);
        setTotal(payload?.total ?? rows.length);
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load architects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Guard against an earlier slow request resolving after a later one
    // and overwriting newer results.
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page]);

  const projectCards = useMemo(() => {
    const cards: ProjectCard[] = [];
    architects.forEach((a) => {
      (a.portfolio?.projects || []).forEach((p) => {
        cards.push({
          architect_id: a.architect_id,
          architect_name: a.full_name,
          architect_avatar: a.profile_image,
          architect_specialization: a.specialization,
          project_ref: p.project_ref,
          project_title: p.project_title,
          project_type: p.project_type,
          style_tags: p.style_tags,
          location: p.location,
          year_completed: p.year_completed,
          cover_image: p.cover_image?.image_url,
        });
      });
    });
    return cards;
  }, [architects]);

  // The API has already filtered by the search term across the whole
  // catalogue, so the architect list is rendered as returned. Filtering
  // again here would only re-apply the same term to one page.
  const filteredArchitects = architects;

  // Project view is the one place a client-side pass still earns its
  // keep: the API matches whole ARCHITECTS, so a matched architect
  // arrives with their full portfolio attached. Narrowing to the
  // projects that mention the term keeps the project grid relevant.
  //
  // If nothing matches, the architect was matched on a field that is
  // not on a project -- their name, specialisation or bio -- so we show
  // their projects rather than an empty grid.
  const filteredProjects = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return projectCards;

    const narrowed = projectCards.filter((p) =>
      `${p.project_title} ${p.project_type || ''} ${p.location || ''} ${(p.style_tags || []).join(' ')} ${p.architect_name}`
        .toLowerCase()
        .includes(q)
    );

    return narrowed.length > 0 ? narrowed : projectCards;
  }, [projectCards, debouncedSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-800 rounded-full" />
          <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-slate-500 mt-4 font-black tracking-widest uppercase text-[10px] animate-pulse">Scanning Portfolio Network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-24 pb-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
           <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-indigo-500/20 mb-6">
                Discovery Network
              </span>
              <h1 className="text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">
                Find Your <br/><span className="text-indigo-500">Perfect Match</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg mb-12 max-w-xl">
                Browse through verified architectural portfolios or search for specific design styles and locations.
              </p>
              
              <div className="w-full relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={24} />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search architects, projects, styles, or cities..." 
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:bg-white/10 transition-all text-lg font-medium" 
                />
              </div>

              <div className="flex items-center gap-2 mt-10 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setViewMode('project')} 
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'project' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  <Layout className="w-4 h-4" /> By Project
                </button>
                <button 
                  onClick={() => setViewMode('architect')} 
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'architect' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  <Users className="w-4 h-4" /> By Architect
                </button>
              </div>
           </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 pb-24 relative z-20">
        {error && <div className="mb-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-6 py-4 font-bold text-sm text-center">{error}</div>}

        {viewMode === 'architect' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredArchitects.map((a) => (
              <article key={a.architect_id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/20 transition-all group">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-6">
                      {a.profile_image ? (
                        <img src={resolveImageUrl(a.profile_image)} alt={a.full_name} className="w-20 h-20 rounded-3xl object-cover border-4 border-slate-50 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center text-3xl font-black italic uppercase">
                          {a.full_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <button onClick={() => navigate(`/architect/${a.architect_id}`)} className="text-2xl font-black text-slate-100 italic uppercase tracking-tight hover:text-indigo-300 transition-colors">{a.full_name}</button>
                          {a.verification_status === 'verified' && <ShieldCheck className="text-emerald-500 w-5 h-5" />}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{a.specialization} • {a.experience_years || 0} Years Experience</p>
                        <div className="flex items-center gap-3 mt-2">
                           <StarRating rating={Number(a.average_rating || 0)} size="xs" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">({a.total_reviews} Reviews)</span>
                        </div>
                      </div>
                   </div>
                   <button onClick={() => navigate(`/architect/${a.architect_id}`)} className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-all shadow-lg group/btn">
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {(a.portfolio?.projects || []).slice(0, 3).map((p) => (
                    <div key={p.architect_project_id} className="rounded-2xl border border-slate-800 overflow-hidden relative group/img aspect-square">
                      {p.cover_image?.image_url ? (
                        <img src={resolveImageUrl(p.cover_image.image_url)} alt={p.project_title} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full bg-slate-800" />
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-[8px] font-black text-white uppercase tracking-widest">View Project</span>
                      </div>
                    </div>
                  ))}
                  {(a.portfolio?.projects?.length || 0) < 3 && Array.from({length: 3 - (a.portfolio?.projects?.length || 0)}).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-slate-800 border border-slate-800 border-dashed aspect-square flex items-center justify-center text-slate-200">
                       <Zap className="w-6 h-6" />
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate(`/architect/${a.architect_id}`)} className="w-full py-4 rounded-2xl bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                  Browse Detailed Portfolio
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((p) => (
              <article key={`${p.architect_id}-${p.project_ref}`} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl shadow-slate-200/50 overflow-hidden group">
                <div className="relative aspect-[4/3] bg-slate-800 overflow-hidden">
                  {p.cover_image ? (
                    <img src={resolveImageUrl(p.cover_image)} alt={p.project_title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                       <Layout className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                  <div className="absolute bottom-6 left-6 right-6">
                     <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded border border-white/20 mb-3 inline-block">
                       Ref: {p.project_ref}
                     </span>
                     <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{p.project_title}</h3>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-300 text-[10px] font-black italic uppercase">
                            {p.architect_name.charAt(0)}
                         </div>
                         <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest italic">{p.architect_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                         <MapPin className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{p.location || 'N/A'}</span>
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {(p.style_tags || []).slice(0, 3).map((s) => (
                       <span key={s} className="px-3 py-1 bg-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-lg border border-slate-800">{s}</span>
                     ))}
                   </div>
                   <button onClick={() => navigate(`/architect/projects/${p.project_ref}`)} className="w-full py-4 rounded-2xl border-2 border-slate-900 text-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                     View Project Story
                   </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* No results: previously the grid just rendered empty with no
            explanation, which read as a broken page. */}
        {!error && architects.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-slate-100 font-black uppercase tracking-widest text-sm mb-2">
              No architects found
            </p>
            <p className="text-slate-400 text-xs font-bold">
              {debouncedSearch
                ? `Nothing matched "${debouncedSearch}". Try a different style, location or name.`
                : 'No verified architects have published a portfolio yet.'}
            </p>
          </div>
        )}

        {/* Pagination. Without this the browse page could never reach
            past the first 12 architects the API returns. */}
        {lastPage > 1 && (
          <div className="mt-16 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-6 py-3 rounded-2xl border-2 border-slate-900 text-slate-100 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-100"
            >
              Previous
            </button>

            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Page {page} of {lastPage}
              {total > 0 && ` · ${total} architects`}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-6 py-3 rounded-2xl border-2 border-slate-900 text-slate-100 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-100"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
