import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import {
  Plus,
  X,
  Trash2,
  Star,
  Camera,
  MapPin,
  Calendar,
  Maximize2,
  Layout,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { resolveImageUrl } from '../utils/storage';

type ArchitectProject = {
  architect_project_id: number;
  project_ref: string;
  project_title: string;
  project_description?: string;
  project_type: 'residential' | 'commercial' | 'industrial' | 'landscape';
  style_tags?: string[];
  location?: string;
  year_completed?: number;
  area_sqft?: number;
  budget_range_min?: number;
  budget_range_max?: number;
  is_featured: boolean;
  visibility: 'public' | 'private';
  images: Array<{ image_id: number; image_url: string; is_cover: boolean }>;
  cover_image?: { image_url: string };
};

type Portfolio = {
  architect_portfolio_id: number;
  bio_statement?: string;
  total_projects_count: number;
  projects: ArchitectProject[];
};

const STYLE_TAGS = ['Modern', 'Minimalist', 'Contemporary', 'Traditional', 'Industrial', 'Sustainable', 'Luxury', 'Classic', 'Landscape', 'Commercial'];

const ArchitectPortfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [bioStatement, setBioStatement] = useState('');

  const [projectForm, setProjectForm] = useState({
    project_title: '',
    project_description: '',
    project_type: 'residential',
    style_tags: [] as string[],
    location: '',
    year_completed: '',
    area_sqft: '',
    budget_range_min: '',
    budget_range_max: '',
    visibility: 'public',
    is_featured: false,
  });
  const [images, setImages] = useState<File[]>([]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/architect/portfolio');
      const p = res.data?.portfolio || null;
      setPortfolio(p);
      setBioStatement(p?.bio_statement || '');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Masterworks Catalog — ArchIntent';
    loadPortfolio();
  }, []);

  const saveBio = async () => {
    setSaving(true);
    setError('');
    try {
      await axiosInstance.post('/architect/portfolio/setup', { bio_statement: bioStatement });
      setSuccess('Portfolio statement saved');
      await loadPortfolio();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save statement');
    } finally {
      setSaving(false);
    }
  };

  const toggleStyle = (tag: string) => {
    setProjectForm((prev) => ({
      ...prev,
      style_tags: prev.style_tags.includes(tag)
        ? prev.style_tags.filter((t) => t !== tag)
        : [...prev.style_tags, tag],
    }));
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('project_title', projectForm.project_title);
      fd.append('project_description', projectForm.project_description);
      fd.append('project_type', projectForm.project_type);
      fd.append('visibility', projectForm.visibility);
      fd.append('is_featured', String(projectForm.is_featured));
      if (projectForm.location) fd.append('location', projectForm.location);
      if (projectForm.year_completed) fd.append('year_completed', projectForm.year_completed);
      if (projectForm.area_sqft) fd.append('area_sqft', projectForm.area_sqft);
      if (projectForm.budget_range_min) fd.append('budget_range_min', projectForm.budget_range_min);
      if (projectForm.budget_range_max) fd.append('budget_range_max', projectForm.budget_range_max);
      projectForm.style_tags.forEach((tag) => fd.append('style_tags[]', tag));
      images.forEach((img) => fd.append('images[]', img));

      await axiosInstance.post('/architect/portfolio/projects', fd);

      setSuccess('Project added');
      setShowModal(false);
      setProjectForm({
        project_title: '',
        project_description: '',
        project_type: 'residential',
        style_tags: [],
        location: '',
        year_completed: '',
        area_sqft: '',
        budget_range_min: '',
        budget_range_max: '',
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

  const deleteProject = async (projectId: number) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axiosInstance.delete(`/architect/portfolio/projects/${projectId}`);
      setSuccess('Project deleted');
      await loadPortfolio();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete project');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Accessing Archive...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter pb-24">
      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col items-stretch justify-between gap-8 md:flex-row md:items-center md:gap-10">
            <div className="min-w-0 flex-1 space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[2px] w-10 shrink-0 bg-white sm:w-12" />
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/60 sm:tracking-[0.4em]">
                  IDENTITY PROTOCOL
                </p>
              </div>
              <h1 className="mb-2 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-white sm:text-5xl sm:leading-[0.9] md:text-6xl lg:text-7xl xl:text-8xl">
                Masterworks <br />
                <span className="text-outline-white text-transparent">Catalog</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="group flex w-full shrink-0 items-center justify-center gap-4 self-start rounded-full bg-slate-100 py-4 pl-8 pr-4 text-slate-900 transition-all duration-500 hover:pr-8 active:scale-95 sm:w-auto md:self-center"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New Entry</span>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:rotate-90">
                <Plus size={20} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <main className="relative z-20 mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 -mt-14 sm:-mt-16 md:-mt-20">
        {success && (
          <div
            className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-emerald-200 sm:mb-8 sm:px-5"
            role="status"
          >
            <p className="text-xs font-bold uppercase tracking-wider">{success}</p>
            <button
              type="button"
              onClick={() => setSuccess('')}
              className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-100"
              aria-label="Dismiss message"
            >
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="mb-8 flex items-center gap-4 border-l-4 border-rose-500 bg-rose-950/30 p-4 text-rose-300">
            <AlertCircle size={20} className="shrink-0" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* LEFT: BIO & ADD */}
          <div className="lg:col-span-4 space-y-12">
            {/* Module 01: Manifesto */}
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 01</p>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Design Manifesto</h2>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 space-y-6">
                <textarea
                  value={bioStatement}
                  onChange={(e) => setBioStatement(e.target.value)}
                  placeholder="Define your architectural philosophy..."
                  className="w-full h-40 bg-transparent border-none focus:ring-0 text-sm font-medium leading-relaxed text-slate-300 placeholder:text-slate-500 p-0"
                />
                <button 
                  onClick={saveBio}
                  disabled={saving}
                  className="w-full bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  {saving ? 'UPDATING...' : 'SAVE PHILOSOPHY'}
                </button>
              </div>
            </div>

            {/* Module 02: Stats */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">MODULE 02</p>
                <h2 className="text-xl font-black italic uppercase tracking-tight">Catalog Metrics</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TOTAL ENTRIES</p>
                  <p className="text-4xl font-black italic">{portfolio?.total_projects_count || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2 text-amber-400">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">FEATURED</p>
                  <p className="text-4xl font-black italic">{portfolio?.projects.filter(p => p.is_featured).length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: PROJECT GRID */}
          <div className="lg:col-span-8 space-y-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">MODULE 03</p>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-100 sm:text-3xl">
                  Project Archive
                </h2>
              </div>
              <Layout className="shrink-0 text-slate-200" size={36} aria-hidden />
            </div>

            {(!portfolio?.projects || portfolio.projects.length === 0) ? (
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-[3rem] p-24 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="text-slate-300" size={40} />
                </div>
                <p className="text-slate-400 font-medium italic">Archive is currently empty. Begin adding your portfolio entries.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {portfolio.projects.map((p) => (
                  <div key={p.architect_project_id} className="group relative bg-slate-900 border border-slate-700 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-700">
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {(p.cover_image?.image_url || p.images?.[0]?.image_url) ? (
                        <img 
                          src={resolveImageUrl(p.cover_image?.image_url || p.images?.[0]?.image_url)} 
                          alt={p.project_title} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Camera className="text-slate-200" size={48} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="absolute top-6 left-6">
                        <span className="text-[10px] font-black bg-black/80 text-white px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest italic">
                          REF #{p.project_ref}
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
                            onClick={() => deleteProject(p.architect_project_id)}
                            className="flex-1 bg-rose-500/20 hover:bg-rose-500 text-white border border-rose-500/30 backdrop-blur-md py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Delete Entry
                          </button>
                          <button type="button" className="w-12 h-12 bg-white/20 hover:bg-slate-100 text-white hover:text-slate-900 border border-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-all">
                            <Eye size={20} />
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
                            <Calendar size={10} /> COMPLETED
                          </p>
                          <p className="text-xs font-black italic text-slate-200">{p.year_completed || 'PENDING'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(p.style_tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-tighter border border-slate-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- ADD PROJECT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-modal-enter">
            <div className="p-10 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CATALOG PROTOCOL</p>
                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-100">New Project Entry</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-12 h-12 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-2xl flex items-center justify-center transition-all duration-300"
              >
                <X size={24} />
              </button>
            </div>

            <form
              id="portfolio-project-form"
              onSubmit={createProject}
              className="flex-1 space-y-10 overflow-y-auto p-6 sm:p-10"
            >
              {/* Module: Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Project Title</label>
                  <input 
                    required 
                    value={projectForm.project_title} 
                    onChange={(e) => setProjectForm({ ...projectForm, project_title: e.target.value })} 
                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-bold italic text-slate-100 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Classification</label>
                  <select 
                    value={projectForm.project_type} 
                    onChange={(e) => setProjectForm({ ...projectForm, project_type: e.target.value as any })} 
                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-bold italic text-slate-100 focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="residential" className="text-slate-900">
                      RESIDENTIAL
                    </option>
                    <option value="commercial" className="text-slate-900">
                      COMMERCIAL
                    </option>
                    <option value="industrial" className="text-slate-900">
                      INDUSTRIAL
                    </option>
                    <option value="landscape" className="text-slate-900">
                      LANDSCAPE
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Narrative Description</label>
                <textarea 
                  value={projectForm.project_description} 
                  onChange={(e) => setProjectForm({ ...projectForm, project_description: e.target.value })} 
                  rows={4} 
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-2xl p-4 font-medium text-sm text-slate-100 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'LOCATION', key: 'location', type: 'text' },
                  { label: 'YEAR', key: 'year_completed', type: 'number' },
                  { label: 'AREA (SQFT)', key: 'area_sqft', type: 'number' },
                  { label: 'VISIBILITY', key: 'visibility', type: 'select', options: ['public', 'private'] }
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{field.label}</label>
                    {field.type === 'select' ? (
                      <select 
                        value={(projectForm as any)[field.key]} 
                        onChange={(e) => setProjectForm({ ...projectForm, [field.key]: e.target.value })}
                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-3 font-bold italic uppercase text-xs text-slate-100"
                      >
                        {field.options?.map(opt => <option key={opt} value={opt} className="text-black">{opt.toUpperCase()}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={field.type} 
                        value={(projectForm as any)[field.key]} 
                        onChange={(e) => setProjectForm({ ...projectForm, [field.key]: e.target.value })}
                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-3 font-bold italic text-xs text-slate-100"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Style Signatures</label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.map((tag) => (
                    <button 
                      type="button" 
                      key={tag} 
                      onClick={() => toggleStyle(tag)} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                        projectForm.style_tags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-[2rem] p-12 text-center space-y-4 group transition-colors hover:border-indigo-500/50">
                <input 
                  type="file" 
                  multiple 
                  id="file-upload"
                  accept="image/jpeg,image/png,image/jpg" 
                  onChange={(e) => setImages(Array.from(e.target.files || []))} 
                  className="hidden" 
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-4 block">
                  <div className="w-16 h-16 bg-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="text-slate-400" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black italic uppercase tracking-tighter">
                      {images.length > 0 ? `${images.length} FILES STAGED` : 'ARCHIVE VISUALS'}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">Drag or select project photography (MAX 10MB)</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-between p-6 bg-slate-800 border border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-700 transition-colors text-slate-200">
                  <div className="flex items-center gap-3">
                    <Star size={20} className={projectForm.is_featured ? 'text-amber-500' : 'text-slate-300'} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Mark as Featured Work</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={projectForm.is_featured} 
                    onChange={(e) => setProjectForm({ ...projectForm, is_featured: e.target.checked })} 
                    className="w-5 h-5 rounded-md border-slate-500 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </form>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-700 p-6 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:p-10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-100 sm:px-8"
              >
                CANCEL
              </button>
              <button
                type="submit"
                form="portfolio-project-form"
                disabled={saving}
                className="rounded-2xl bg-indigo-600 px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-indigo-900/30 transition-transform hover:scale-[1.02] disabled:opacity-50 sm:px-12"
              >
                {saving ? 'COMMITTING...' : 'COMMIT TO ARCHIVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectPortfolio;


