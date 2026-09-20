import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  X,
  Upload,
  Landmark,
  ClipboardList,
  ShieldCheck,
  Zap,
  ChevronRight,
  Sparkles,
  Info,
  MapPin,
  Calendar,
  Layers,
  FileCheck,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchitectData {
  license_number: string;
  cnic: string;
  city: string;
  design_types: string[];
  experience_years: number;
  specialization: string;
  bio: string;
  verification_document: string | null;
  pcatp_number: string;
  pcatp_document: string | null;
  ntn_number: string;
  ntn_document: string | null;
}

const DESIGN_TYPE_OPTIONS = [
  'Residential',
  'Commercial',
  'Industrial',
  'Landscape',
  'Interior Design',
  'Urban Planning',
  'Institutional',
  'Hospitality',
  'Mixed-Use',
  'Renovation / Adaptive Reuse',
  'Sustainable / Green Design',
  'Heritage / Conservation',
];

const SPECIALIZATION_OPTIONS = [
  'Residential Design',
  'Commercial Architecture',
  'Industrial Design',
  'Landscape Architecture',
  'Interior Architecture',
  'Urban Design',
  'Sustainable Design',
  'Conservation Architecture',
  'Hospitality Design',
  'Healthcare Architecture',
];

const DEFAULT_FORM: ArchitectData = {
  license_number: '',
  cnic: '',
  city: '',
  design_types: [],
  experience_years: 0,
  specialization: '',
  bio: '',
  verification_document: null,
  pcatp_number: '',
  pcatp_document: null,
  ntn_number: '',
  ntn_document: null,
};

// ─── File Upload Widget ────────────────────────────────────────────────────────

interface FileUploadProps {
  label: string;
  currentFile: string | null;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  maxMb?: number;
  required?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  currentFile,
  selectedFile,
  onFileChange,
  maxMb = 5,
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      alert('Only PDF, DOC, or DOCX files are allowed.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      alert(`File must be ${maxMb} MB or less.`);
      return;
    }
    onFileChange(file);
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
        {label} {required && !currentFile && <span className="text-rose-500 font-bold">*</span>}
      </label>

      <div className="relative group">
        <div className={`rounded-3xl border-2 border-dashed p-6 transition-all ${selectedFile || currentFile ? 'border-indigo-600/60 bg-indigo-950/40' : 'border-slate-600 bg-slate-800/50 hover:border-indigo-500'}`}>
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-4 overflow-hidden">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selectedFile || currentFile ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                   {selectedFile || currentFile ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                <div className="overflow-hidden">
                   <p className="truncate text-sm font-black italic uppercase text-slate-100">
                      {selectedFile ? selectedFile.name : currentFile ? currentFile : 'No file selected'}
                   </p>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : currentFile ? 'System record active' : 'PDF, DOC, DOCX • MAX 5MB'}
                   </p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                {selectedFile && (
                  <button 
                    type="button" 
                    onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = ''; }}
                    className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-200 shadow-sm transition-all hover:border-indigo-500 hover:text-indigo-300"
                >
                  {selectedFile || currentFile ? 'Change' : 'Upload'}
                </button>
             </div>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ArchitectProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<ArchitectData>(DEFAULT_FORM);
  const [files, setFiles] = useState<Record<string, File | null>>({
    verification_document: null,
    pcatp_document: null,
    ntn_document: null,
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    document.title = 'Professional Identity — ArchIntent';
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await axiosInstance.get('/architect/profile');
      const d = res.data.data || {};
      setForm({
        license_number: d.license_number || '',
        cnic: d.cnic || '',
        city: d.city || '',
        design_types: Array.isArray(d.design_types) ? d.design_types : [],
        experience_years: d.experience_years ?? 0,
        specialization: d.specialization || '',
        bio: d.bio || '',
        verification_document: d.verification_document || null,
        pcatp_number: d.pcatp_number || '',
        pcatp_document: d.pcatp_document || null,
        ntn_number: d.ntn_number || '',
        ntn_document: d.ntn_document || null,
      });
      if (d.pcatp_number || d.ntn_number) {
        setShowVerification(true);
      }
    } catch {
      // New
    } finally {
      setPageLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'experience_years' ? parseInt(value) || 0 : value,
    }));
  };

  const toggleDesignType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      design_types: prev.design_types.includes(type)
        ? prev.design_types.filter((t) => t !== type)
        : [...prev.design_types, type],
    }));
  };

  const setFile = (field: string) => (file: File | null) =>
    setFiles((prev) => ({ ...prev, [field]: file }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.design_types.length === 0) {
      setError('At least one architectural design type must be specified.');
      return;
    }

    if (!files.verification_document && !form.verification_document) {
      setError('A professional verification document is mandatory for credential validation.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('license_number', form.license_number);
      fd.append('cnic', form.cnic);
      fd.append('city', form.city);
      form.design_types.forEach((t) => fd.append('design_types[]', t));
      fd.append('experience_years', String(form.experience_years));
      fd.append('specialization', form.specialization);
      fd.append('bio', form.bio);

      if (form.pcatp_number) fd.append('pcatp_number', form.pcatp_number);
      if (form.ntn_number) fd.append('ntn_number', form.ntn_number);

      if (files.verification_document) fd.append('verification_document', files.verification_document);
      if (files.pcatp_document) fd.append('pcatp_document', files.pcatp_document);
      if (files.ntn_document) fd.append('ntn_document', files.ntn_document);

      const res = await axiosInstance.post('/architect/profile', fd);

      const updated = res.data.data || {};
      setForm((prev) => ({
        ...prev,
        verification_document: updated.verification_document || prev.verification_document,
        pcatp_document: updated.pcatp_document || prev.pcatp_document,
        ntn_document: updated.ntn_document || prev.ntn_document,
      }));
      setFiles({ verification_document: null, pcatp_document: null, ntn_document: null });
      setSuccess('Professional identity parameters synchronized.');

      if (!user?.profile_completed) {
        await axiosInstance.post('/architect/mark-profile-complete');
      }
      await refreshUser();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors;
      setError(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : (msg || 'Synchronization failure.'));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-20 h-20 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8 animate-pulse">Decrypting Identity Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="pt-12 pb-16 max-w-5xl mx-auto px-4">
        <nav className="flex items-center gap-3 text-slate-400 mb-8">
           <Link to="/dashboard/architect" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-300 transition-colors">Workspace</Link>
           <ChevronRight className="w-3 h-3" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Professional Identity</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-100">
                Architectural <br/><span className="text-indigo-400">Identity</span>
              </h1>
              <p className="text-slate-400 font-medium mt-6 text-lg max-w-xl">
                 Define your professional presence, specialize your design domain, and verify your credentials for client matching.
              </p>
           </div>
           
           {!user?.profile_completed && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl shadow-amber-200/20 max-w-sm">
                 <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 leading-none mb-1">Activation Required</p>
                    <p className="text-xs font-bold text-amber-900 leading-tight">Complete identity setup to go live in the marketplace.</p>
                 </div>
              </div>
           )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-12">
        {error && (
          <div className="p-6 bg-rose-500/10 border-2 border-rose-500/30 rounded-[2.5rem] flex items-center gap-4 text-rose-300 shadow-xl shadow-rose-200/20">
             <AlertCircle className="w-6 h-6" />
             <p className="font-bold text-sm uppercase tracking-wide">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-6 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-[2.5rem] flex items-center gap-4 text-emerald-300 shadow-xl shadow-emerald-200/20">
             <CheckCircle2 className="w-6 h-6" />
             <p className="font-bold text-sm uppercase tracking-wide">{success}</p>
          </div>
        )}

        <div className="rounded-[3rem] border border-slate-800 bg-slate-900 p-8 flex flex-col sm:flex-row sm:items-center gap-8 shadow-xl shadow-black/20">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-800 border-2 border-slate-700 shrink-0 flex items-center justify-center text-2xl font-black italic text-indigo-400">
            {user?.profile_image ? (
              <img
                src={resolveImageUrl(user.profile_image)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              user?.full_name?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Public portrait</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your profile photo is saved under Identity settings. It appears here, in the header, and when clients see you in search and messages.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-colors"
            >
              Update portrait
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
           {/* Section 1: Core Credentials */}
           <div className="rounded-[3.5rem] border border-slate-800 bg-slate-900 p-12 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-4 mb-12 pb-6 border-b border-slate-800">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1 leading-none">Module 01</p>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Core Credentials</h3>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Professional License No.</label>
                    <div className="relative group">
                       <input
                          name="license_number"
                          value={form.license_number}
                          onChange={handleChange}
                          placeholder="e.g. A-12345"
                          required
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                       />
                       <Landmark className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">National ID (CNIC)</label>
                    <div className="relative group">
                       <input
                          name="cnic"
                          value={form.cnic}
                          onChange={handleChange}
                          placeholder="00000-0000000-0"
                          required
                          maxLength={20}
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                       />
                       <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Operating Domain (City)</label>
                    <div className="relative group">
                       <input
                          name="city"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="Karachi, Lahore, etc."
                          required
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                       />
                       <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Professional Experience</label>
                    <div className="relative group">
                       <input
                          type="number"
                          name="experience_years"
                          value={form.experience_years}
                          onChange={handleChange}
                          min="0"
                          required
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                       />
                       <History className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                       <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Years</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-8 mb-12">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Primary Specialization Domain</label>
                    <select
                      name="specialization"
                      value={form.specialization}
                      onChange={handleChange}
                      required
                      className="w-full appearance-none rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800"
                    >
                      <option value="">Select Domain...</option>
                      {SPECIALIZATION_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Design Categories (Multi-select)</label>
                    <div className="flex flex-wrap gap-3">
                       {DESIGN_TYPE_OPTIONS.map((type) => {
                          const active = form.design_types.includes(type);
                          return (
                             <button
                                key={type}
                                type="button"
                                onClick={() => toggleDesignType(type)}
                                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
                                   active 
                                   ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' 
                                   : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-500 hover:text-indigo-300'
                                }`}
                             >
                                {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {type}
                             </button>
                          );
                       })}
                    </div>
                 </div>
              </div>

              <div className="space-y-2 mb-12">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Professional Bio (Design Philosophy)</label>
                 <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Describe your architectural vision and strategic approach..."
                    rows={6}
                    required
                    maxLength={1000}
                    className="w-full resize-none rounded-[2rem] border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold leading-relaxed text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800"
                 />
                 <div className="flex justify-end">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{form.bio.length} / 1000 Characters</span>
                 </div>
              </div>

              <FileUpload
                 label="Base Verification Document (Identity/Degree)"
                 currentFile={form.verification_document}
                 selectedFile={files.verification_document}
                 onFileChange={setFile('verification_document')}
                 required={!form.verification_document}
              />
           </div>

           {/* Section 2: Extended Verification */}
           <div className="overflow-hidden rounded-[3.5rem] border border-slate-800 bg-slate-900/70 shadow-inner">
              <button
                 type="button"
                 onClick={() => setShowVerification(!showVerification)}
                 className="w-full p-12 text-left flex items-center justify-between group"
              >
                 <div className="flex items-center gap-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-emerald-400 shadow-sm transition-transform group-hover:scale-110">
                       <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                       <div className="flex items-center gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1 leading-none">Module 02</p>
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 text-[8px] font-black uppercase tracking-widest rounded">Optional</span>
                       </div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Professional Credentials</h3>
                    </div>
                 </div>
                 <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${showVerification ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-600 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-200'}`}>
                    {showVerification ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                 </div>
              </button>

              {showVerification && (
                 <div className="px-12 pb-12 space-y-10 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4 rounded-[2rem] border-2 border-indigo-800/80 bg-indigo-950/40 p-6">
                       <Info className="mt-1 h-6 w-6 shrink-0 text-indigo-400" />
                       <p className="text-sm font-medium leading-relaxed text-indigo-100">
                          Synchronizing PCATP registration and NTN details establishes a higher tier of professional trust. Verified profiles receive priority matching in the ArchIntent algorithm.
                       </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                             <Landmark className="w-5 h-5 text-slate-400" />
                             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">PCATP Registration</h4>
                          </div>
                          <input
                            type="text"
                            name="pcatp_number"
                            value={form.pcatp_number}
                            onChange={handleChange}
                            placeholder="PCATP Sequence No."
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500"
                          />
                          <FileUpload
                            label="PCATP Certification Record"
                            currentFile={form.pcatp_document}
                            selectedFile={files.pcatp_document}
                            onFileChange={setFile('pcatp_document')}
                          />
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                             <ClipboardList className="w-5 h-5 text-slate-400" />
                             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">FBR Fiscal Identity</h4>
                          </div>
                          <input
                            type="text"
                            name="ntn_number"
                            value={form.ntn_number}
                            onChange={handleChange}
                            placeholder="National Tax Number (NTN)"
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500"
                          />
                          <FileUpload
                            label="NTN Certification Record"
                            currentFile={form.ntn_document}
                            selectedFile={files.ntn_document}
                            onFileChange={setFile('ntn_document')}
                          />
                       </div>
                    </div>
                 </div>
              )}
           </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group"
           >
             {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : (
               <>
                 Synchronize Identity Parameters
                 <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
               </>
             )}
           </button>
        </form>
      </div>
    </div>
  );
};

export default ArchitectProfile;
