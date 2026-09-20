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
  Upload,
  X,
  Landmark,
  Building2,
  ClipboardList,
  ShieldCheck,
  Zap,
  ChevronRight,
  Info,
  MapPin,
  History,
  HardHat,
  FileCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractorData {
  company_name: string;
  cnic: string;
  city: string;
  work_types: string[];
  company_address: string;
  experience_years: number;
  specialization: string;
  bio: string;
  registration_number: string;
  verification_document: string | null;
  pec_registration: string;
  pec_document: string | null;
  secp_number: string;
  secp_document: string | null;
  ntn_number: string;
  ntn_document: string | null;
}

const WORK_TYPE_OPTIONS = [
  'Grey Structure',
  'Finishing Works',
  'Renovation',
  'Full Construction',
  'Plumbing',
  'Electrical',
  'Tiling & Flooring',
  'Painting',
  'Roof Works',
  'Interior Fit-Out',
  'Landscaping',
  'Civil Works',
];

const DEFAULT_FORM: ContractorData = {
  company_name: '',
  cnic: '',
  city: '',
  work_types: [],
  company_address: '',
  experience_years: 0,
  specialization: '',
  bio: '',
  registration_number: '',
  verification_document: null,
  pec_registration: '',
  pec_document: null,
  secp_number: '',
  secp_document: null,
  ntn_number: '',
  ntn_document: null,
};

// ─── File Upload Widget ────────────────────────────────────────────────────────

interface FileUploadProps {
  label: string;
  currentFile: string | null;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  currentFile,
  selectedFile,
  onFileChange,
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
      alert('Only PDF, DOC, or DOCX files allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be 10 MB or less.');
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
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : currentFile ? 'System record active' : 'PDF, DOC, DOCX • MAX 10MB'}
                   </p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                {selectedFile && (
                  <button 
                    type="button" 
                    onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = ''; }}
                    className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-colors"
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

const ContractorProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<ContractorData>(DEFAULT_FORM);
  const [files, setFiles] = useState<Record<string, File | null>>({
    verification_document: null,
    pec_document: null,
    secp_document: null,
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
      const res = await axiosInstance.get('/contractor/profile');
      const d = res.data.data || {};
      setForm({
        company_name: d.company_name || '',
        cnic: d.cnic || '',
        city: d.city || '',
        work_types: Array.isArray(d.work_types) ? d.work_types : [],
        company_address: d.company_address || '',
        experience_years: d.experience_years ?? 0,
        specialization: d.specialization || '',
        bio: d.bio || '',
        registration_number: d.registration_number || '',
        verification_document: d.verification_document || null,
        pec_registration: d.pec_registration || '',
        pec_document: d.pec_document || null,
        secp_number: d.secp_number || '',
        secp_document: d.secp_document || null,
        ntn_number: d.ntn_number || '',
        ntn_document: d.ntn_document || null,
      });
      if (d.pec_registration || d.secp_number || d.ntn_number) {
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

  const toggleWorkType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      work_types: prev.work_types.includes(type)
        ? prev.work_types.filter((t) => t !== type)
        : [...prev.work_types, type],
    }));
  };

  const setFile = (field: string) => (file: File | null) =>
    setFiles((prev) => ({ ...prev, [field]: file }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.work_types.length === 0) {
      setError('At least one construction work type must be specified.');
      return;
    }

    if (!files.verification_document && !form.verification_document) {
      setError('A professional verification document is mandatory for identity validation.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('company_name', form.company_name);
      fd.append('cnic', form.cnic);
      fd.append('city', form.city);
      form.work_types.forEach((t) => fd.append('work_types[]', t));
      fd.append('company_address', form.company_address);
      fd.append('experience_years', String(form.experience_years));
      fd.append('bio', form.bio);
      if (form.specialization) fd.append('specialization', form.specialization);
      if (form.registration_number) fd.append('registration_number', form.registration_number);

      if (form.pec_registration) fd.append('pec_registration', form.pec_registration);
      if (form.secp_number) fd.append('secp_number', form.secp_number);
      if (form.ntn_number) fd.append('ntn_number', form.ntn_number);

      if (files.verification_document) fd.append('verification_document', files.verification_document);
      if (files.pec_document) fd.append('pec_document', files.pec_document);
      if (files.secp_document) fd.append('secp_document', files.secp_document);
      if (files.ntn_document) fd.append('ntn_document', files.ntn_document);

      const res = await axiosInstance.post('/contractor/profile', fd);

      const updated = res.data.data || {};
      setForm((prev) => ({
        ...prev,
        verification_document: updated.verification_document || prev.verification_document,
        pec_document: updated.pec_document || prev.pec_document,
        secp_document: updated.secp_document || prev.secp_document,
        ntn_document: updated.ntn_document || prev.ntn_document,
      }));
      setFiles({ verification_document: null, pec_document: null, secp_document: null, ntn_document: null });
      setSuccess('Professional construction identity synchronized.');

      if (!user?.profile_completed) {
        await axiosInstance.post('/contractor/mark-profile-complete');
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
           <Link to="/contractor/dashboard" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Workspace</Link>
           <ChevronRight className="w-3 h-3" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Professional Identity</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-100">
                Construction <br/><span className="text-indigo-400">Identity</span>
              </h1>
              <p className="text-slate-400 font-medium mt-6 text-lg max-w-xl">
                 Define your company presence, specify your construction domain, and verify your fiscal credentials for bidding.
              </p>
           </div>
           
           {!user?.profile_completed && (
              <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-6 flex items-center gap-4 shadow-xl shadow-amber-200/20 max-w-sm">
                 <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 leading-none mb-1">Activation Required</p>
                    <p className="text-xs font-bold text-amber-900 leading-tight">Complete identity setup to go live in the marketplace.</p>
                 </div>
              </div>
           )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-12">
        {error && (
          <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] flex items-center gap-4 text-rose-700 shadow-xl shadow-rose-200/20">
             <AlertCircle className="w-6 h-6" />
             <p className="font-bold text-sm uppercase tracking-wide">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex items-center gap-4 text-emerald-700 shadow-xl shadow-emerald-200/20">
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
              user?.full_name?.charAt(0).toUpperCase() || 'C'
            )}
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Public portrait</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your company portrait is saved under Identity settings. It appears here, in the header, and when clients see your firm in search and messages.
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
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Entity Credentials</h3>
                 </div>
              </div>

              <div className="space-y-2 mb-10">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Company / Business Identity</label>
                 <div className="relative group">
                    <input
                       name="company_name"
                       value={form.company_name}
                       onChange={handleChange}
                       placeholder="e.g. Ali Brothers Construction"
                       required
                       className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                    />
                    <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
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
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Personal Identity (CNIC)</label>
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
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Specialization</label>
                    <div className="relative group">
                       <input
                          name="specialization"
                          value={form.specialization}
                          onChange={handleChange}
                          placeholder="e.g. Residential Construction"
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 pr-12"
                       />
                       <HardHat className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                    </div>
                 </div>
              </div>

              <div className="space-y-4 mb-12">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Construction Scopes (Multi-select)</label>
                 <div className="flex flex-wrap gap-3">
                    {WORK_TYPE_OPTIONS.map((type) => {
                       const active = form.work_types.includes(type);
                       return (
                          <button
                             key={type}
                             type="button"
                             onClick={() => toggleWorkType(type)}
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

              <div className="space-y-2 mb-12">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Business Operations Address</label>
                 <textarea
                    name="company_address"
                    value={form.company_address}
                    onChange={handleChange}
                    placeholder="Full address of your business or office..."
                    rows={2}
                    required
                    className="w-full resize-none rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800"
                 />
              </div>

              <div className="space-y-2 mb-12">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Business Bio (Capabilities)</label>
                 <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Describe your construction expertise and core capabilities..."
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
                 label="Base Verification Document (Identity/Business Record)"
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
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded">Optional</span>
                       </div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-100">Fiscal Credentials</h3>
                    </div>
                 </div>
                 <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${showVerification ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-600 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-200'}`}>
                    {showVerification ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                 </div>
              </button>

              {showVerification && (
                 <div className="px-12 pb-12 space-y-12 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4 rounded-[2rem] border-2 border-indigo-800/80 bg-indigo-950/40 p-6">
                       <Info className="mt-1 h-6 w-6 shrink-0 text-indigo-400" />
                       <p className="text-sm font-medium leading-relaxed text-indigo-100">
                          Synchronizing PEC, SECP, and NTN details establishes a verified tier of professional trust. Bidding eligibility for high-budget jobs is restricted to verified entities.
                       </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       {/* PEC */}
                       <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                             <Landmark className="w-5 h-5 text-slate-400" />
                             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">PEC Registration</h4>
                          </div>
                          <input
                            type="text"
                            name="pec_registration"
                            value={form.pec_registration}
                            onChange={handleChange}
                            placeholder="PEC Sequence No."
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500"
                          />
                          <FileUpload
                            label="PEC Certification Record"
                            currentFile={form.pec_document}
                            selectedFile={files.pec_document}
                            onFileChange={setFile('pec_document')}
                          />
                       </div>

                       {/* SECP */}
                       <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                             <Building2 className="w-5 h-5 text-slate-400" />
                             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">SECP Identity</h4>
                          </div>
                          <input
                            type="text"
                            name="secp_number"
                            value={form.secp_number}
                            onChange={handleChange}
                            placeholder="SECP Registration / Incorporation No."
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all focus:border-indigo-500"
                          />
                          <FileUpload
                            label="SECP Certificate of Incorporation"
                            currentFile={form.secp_document}
                            selectedFile={files.secp_document}
                            onFileChange={setFile('secp_document')}
                          />
                       </div>
                    </div>

                    {/* NTN */}
                    <div className="space-y-6 border-t border-slate-800 pt-6">
                       <div className="flex items-center gap-3 mb-2">
                          <ClipboardList className="w-5 h-5 text-slate-400" />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-200">FBR Fiscal Identity (NTN)</h4>
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

export default ContractorProfile;
