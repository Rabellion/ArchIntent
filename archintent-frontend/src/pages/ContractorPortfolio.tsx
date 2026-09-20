import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import {
  Plus,
  X,
  Trash2,
  Star,
  Building2,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Layout,
  AlertCircle,
} from 'lucide-react';
import { resolveImageUrl } from '../utils/storage';

type ContractorProject = {
  contractor_project_id: number;
  project_ref: string;
  project_title: string;
  project_description?: string;
  project_type: string;
  location?: string;
  completion_date?: string;
  project_value_pkr?: number;
  duration_days?: number;
  client_feedback?: string;
  is_featured: boolean;
  visibility: 'public' | 'private';
  images: Array<{ image_id: number; image_url: string; is_cover: boolean }>;
  cover_image?: { image_url: string };
};

type Portfolio = {
  contractor_portfolio_id: number;
  company_bio?: string;
  years_in_business?: number;
  total_projects_count: number;
  projects: ContractorProject[];
};

const ContractorPortfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [companyBio, setCompanyBio] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');

  const [form, setForm] = useState({
    project_title: '',
    project_description: '',
    project_type: 'residential',
    location: '',
    completion_date: '',
    project_value_pkr: '',
    duration_days: '',
    client_feedback: '',
    visibility: 'public',
    is_featured: false,
  });
  const [images, setImages] = useState<File[]>([]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/contractor/portfolio');
      const p = res.data?.portfolio || null;
      setPortfolio(p);
      setCompanyBio(p?.company_bio || '');
      setYearsInBusiness(p?.years_in_business ? String(p.years_in_business) : '');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Construction Chronicles — ArchIntent';
    loadPortfolio();
  }, []);

  const saveContainer = async () => {
    setSaving(true);
    setError('');
    try {
      await axiosInstance.post('/contractor/portfolio/setup', {
        company_bio: companyBio,
        years_in_business: yearsInBusiness ? Number(yearsInBusiness) : null,
      });
      setSuccess('Portfolio profile saved');
      await loadPortfolio();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save portfolio profile');
    } finally {
      setSaving(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('project_title', form.project_title);
      fd.append('project_description', form.project_description);
      fd.append('project_type', form.project_type);
      fd.append('visibility', form.visibility);
      fd.append('is_featured', String(form.is_featured));
      if (form.location) fd.append('location', form.location);
      if (form.completion_date) fd.append('completion_date', form.completion_date);
      if (form.project_value_pkr) fd.append('project_value_pkr', form.project_value_pkr);
      if (form.duration_days) fd.append('duration_days', form.duration_days);
      if (form.client_feedback) fd.append('client_feedback', form.client_feedback);
      images.forEach((img) => fd.append('images[]', img));

      await axiosInstance.post('/contractor/portfolio/projects', fd);

      setSuccess('Project added');
      setShowModal(false);
      setForm({
        project_title: '',
        project_description: '',
        project_type: 'residential',
        location: '',
        completion_date: '',
        project_value_pkr: '',
        duration_days: '',
        client_feedback: '',
        visibility: 'public',
        is_featured: false,
      });
      setImages([]);
      await loadPortfolio();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: number) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axiosInstance.delete(`/contractor/portfolio/projects/${id}`);
      setSuccess('Project deleted');
      await loadPortfolio();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete project');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Fleet Records...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter pb-24">
      {/* --- HERO SECTION --- */}
      <section className="relative bg-slate-950 pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-[2px] bg-slate-900" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">CONSTRUCTION FLEET</p>
              </div>
              <h1 className="text-7xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.8] mb-4">
                Construction <br />
                <span className="text-outline-white">Chronicles</span>
              </h1>
            </div>

            <button 
              onClick={() => setShowModal(true)}
              className="group flex items-center gap-4 bg-slate-800 text-slate-100 pl-8 pr-4 py-4 rounded-full transition-all duration-500 hover:pr-8 active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Log New Mission</span>
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
                <Plus size={20} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <main className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        {error && (
          <div className="mb-8 p-4 bg-rose-950/30 border-l-4 border-rose-500 flex items-center gap-4 text-rose-300">
            <AlertCircle size={20} />
            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* LEFT: COMPANY PROFILE */}
          <div className="lg:col-span-4 space-y-12">
            {/* Module 01: Fleet Identity */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 01</p>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Fleet Identity</h2>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Company Narrative</label>
                  <textarea
                    value={companyBio}
                    onChange={(e) => setCompanyBio(e.target.value)}
                    placeholder="Describe your fleet's capabilities..."
                    className="w-full h-32 bg-transparent border-none focus:ring-0 text-sm font-medium leading-relaxed text-slate-300 placeholder:text-slate-500 p-0"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Legacy (Years)</label>
                  <input
                    type="number"
                    value={yearsInBusiness}
                    onChange={(e) => setYearsInBusiness(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 font-bold italic text-slate-100"
                  />
                </div>
                <button 
                  onClick={saveContainer}
                  disabled={saving}
                  className="w-full bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  {saving ? 'UPDATING...' : 'SAVE FLEET PROFILE'}
                </button>
              </div>
            </div>

            {/* Module 02: Fleet Stats */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">MODULE 02</p>
                <h2 className="text-xl font-black italic uppercase tracking-tight">Fleet Metrics</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">MISSIONS</p>
                    <p className="text-3xl font-black italic">{portfolio?.total_projects_count || 0}</p>
                  </div>
                  <Briefcase size={32} className="text-white/10" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TOTAL VALUE</p>
                    <p className="text-2xl font-black italic">PKR {Math.round((portfolio?.projects.reduce((acc, p) => acc + (p.project_value_pkr || 0), 0) || 0) / 1000000)}M+</p>
                  </div>
                  <TrendingUp size={32} className="text-emerald-500/20" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: MISSION GRID */}
          <div className="lg:col-span-8 space-y-12">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 03</p>
                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">Fleet Missions</h2>
              </div>
              <Layout className="text-slate-200" size={40} />
            </div>

            {(!portfolio?.projects || portfolio.projects.length === 0) ? (
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-[3rem] p-24 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="text-slate-300" size={40} />
                </div>
                <p className="text-slate-400 font-medium italic">No missions logged. Begin documenting your construction history.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {portfolio.projects.map((p) => (
                  <div key={p.contractor_project_id} className="group relative bg-slate-900 border border-slate-700 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-700">
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {(p.cover_image?.image_url || p.images?.[0]?.image_url) ? (
                        <img 
                          src={resolveImageUrl(p.cover_image?.image_url || p.images?.[0]?.image_url)} 
                          alt={p.project_title} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Building2 className="text-slate-200" size={48} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="absolute top-6 left-6">
                        <span className="text-[10px] font-black bg-black/80 text-white px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest italic">
                          MISSION #{p.project_ref}
                        </span>
                      </div>

                      {p.is_featured && (
                        <div className="absolute top-6 right-6">
                          <div className="w-10 h-10 bg-amber-400 text-black rounded-full flex items-center justify-center shadow-xl shadow-amber-400/50">
                            <Star size={18} fill="currentColor" />
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="flex items-center justify-between gap-4">
                          <button 
                            onClick={() => deleteProject(p.contractor_project_id)}
                            className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Delete Mission
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{p.project_type}</p>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none truncate text-slate-100 group-hover:text-indigo-400 transition-colors">
                          {p.project_title}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin size={10} /> LOCATION
                          </p>
                          <p className="text-xs font-black italic text-slate-200">{p.location || 'UNDISCLOSED'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 justify-end">
                            <DollarSign size={10} /> VALUE
                          </p>
                          <p className="text-xs font-black italic text-slate-200">PKR {Math.round((p.project_value_pkr || 0) / 1000000)}M</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">{p.duration_days || '?'} DAYS</span>
                        </div>
                        <div className="w-[1px] h-3 bg-slate-700" />
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- MISSION LOG MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-modal-enter">
            <div className="p-10 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LOG PROTOCOL</p>
                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">New Mission Log</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-12 h-12 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-2xl flex items-center justify-center transition-all duration-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={createProject} className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Mission Title</label>
                  <input required value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-bold italic text-slate-100 focus:border-indigo-500 focus:ring-0 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Operation Type</label>
                  <select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-bold italic text-slate-100 appearance-none">
                    <option value="residential">RESIDENTIAL</option>
                    <option value="commercial">COMMERCIAL</option>
                    <option value="industrial">INDUSTRIAL</option>
                    <option value="landscape">LANDSCAPE</option>
                    <option value="renovation">RENOVATION</option>
                    <option value="infrastructure">INFRASTRUCTURE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Execution Brief</label>
                <textarea value={form.project_description} onChange={(e) => setForm({ ...form, project_description: e.target.value })} rows={4} className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-medium text-sm text-slate-100" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'LOCATION', key: 'location', type: 'text' },
                  { label: 'COMPLETION', key: 'completion_date', type: 'date' },
                  { label: 'VALUE (PKR)', key: 'project_value_pkr', type: 'number' },
                  { label: 'DURATION (DAYS)', key: 'duration_days', type: 'number' }
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{field.label}</label>
                    <input type={field.type} value={(form as any)[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-3 font-bold italic text-xs text-slate-100" />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Client Testimonial</label>
                <textarea value={form.client_feedback} onChange={(e) => setForm({ ...form, client_feedback: e.target.value })} rows={3} className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-medium text-sm italic text-slate-100" placeholder="Copy feedback from project completion report..." />
              </div>

              <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-[2rem] p-12 text-center group transition-colors hover:border-indigo-500/50">
                <input type="file" multiple id="file-upload" accept="image/jpeg,image/png,image/jpg" onChange={(e) => setImages(Array.from(e.target.files || []))} className="hidden" />
                <label htmlFor="file-upload" className="cursor-pointer space-y-4 block">
                  <div className="w-16 h-16 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="text-slate-400" size={32} />
                  </div>
                  <p className="text-sm font-black italic uppercase tracking-tighter">{images.length > 0 ? `${images.length} VISUALS STAGED` : 'STAKEHOLDER VISUALS'}</p>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center justify-between p-6 bg-slate-800 rounded-2xl cursor-pointer border border-slate-600 text-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-widest">Featured Mission</span>
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="w-5 h-5 rounded-md text-black" />
                </label>
                <div className="space-y-2">
                  <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })} className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-bold italic text-slate-100 appearance-none">
                    <option value="public">PUBLIC RECORD</option>
                    <option value="private">INTERNAL ONLY</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="p-10 border-t border-slate-700 flex items-center justify-end gap-4 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-100">CANCEL</button>
              <button onClick={createProject} disabled={saving} className="bg-black text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-105 transition-transform">
                {saving ? 'COMMITTING...' : 'COMMIT MISSION LOG'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorPortfolio;


