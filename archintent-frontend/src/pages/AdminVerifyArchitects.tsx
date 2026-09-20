import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../utils/storage';
import {
  ShieldCheck,
  Search,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Fingerprint
} from 'lucide-react';

interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  profile_image?: string;
}

interface PendingArchitect {
  architect_id: number;
  user_id: number;
  license_number?: string;
  experience_years?: number;
  specialization?: string;
  bio?: string;
  verification_document?: string;
  created_at: string;
  user: User;
}

interface ConfirmState {
  isOpen: boolean;
  type: 'approve' | 'reject' | null;
  architect: PendingArchitect | null;
  rejectionReason: string;
}

export default function AdminVerifyArchitects() {
  const [architects, setArchitects] = useState<PendingArchitect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    type: null,
    architect: null,
    rejectionReason: '',
  });
  const [processing, setProcessing] = useState(false);
  const [fadingOut, setFadingOut] = useState<number | null>(null);
  const docTabOpenedForApproveKey = useRef<string | null>(null);

  useEffect(() => {
    document.title = 'Audit Queue — Architects — ArchIntent';
    fetchPendingArchitects();
  }, []);

  useEffect(() => {
    if (!confirm.isOpen) {
      docTabOpenedForApproveKey.current = null
      return
    }
    if (confirm.type !== 'approve' || !confirm.architect?.verification_document) return
    const key = `architect-approve-${confirm.architect.architect_id}`
    if (docTabOpenedForApproveKey.current === key) return
    docTabOpenedForApproveKey.current = key
    const url = `${window.location.origin}/admin/verify-architects/${confirm.architect.architect_id}/documents`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [confirm.isOpen, confirm.type, confirm.architect])

  const fetchPendingArchitects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/architects/pending');
      setArchitects(response.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to synchronize pending architect registry.');
      setArchitects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (architect: PendingArchitect) => {
    try {
      setProcessing(true);
      await axiosInstance.post(`/admin/architects/${architect.architect_id}/verify`);
      
      setFadingOut(architect.architect_id);
      setTimeout(() => {
        setArchitects(architects.filter((a) => a.architect_id !== architect.architect_id));
        setFadingOut(null);
        setConfirm({ isOpen: false, type: null, architect: null, rejectionReason: '' });
      }, 300);
      
      toast.success(`${architect.user.full_name} credentials verified and activated.`);
    } catch (err) {
      toast.error('Identity activation failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (architect: PendingArchitect) => {
    try {
      if (confirm.rejectionReason.trim().length < 10) {
        toast.error('Minimum 10 characters required for rejection protocol.');
        return;
      }

      setProcessing(true);
      await axiosInstance.post(`/admin/architects/${architect.architect_id}/reject`, {
        reason: confirm.rejectionReason,
      });

      setFadingOut(architect.architect_id);
      setTimeout(() => {
        setArchitects(architects.filter((a) => a.architect_id !== architect.architect_id));
        setFadingOut(null);
        setConfirm({ isOpen: false, type: null, architect: null, rejectionReason: '' });
      }, 300);

      toast.success('Application rejected and archived.');
    } catch (err) {
      toast.error('Rejection protocol failure.');
    } finally {
      setProcessing(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8 animate-pulse">Syncing Audit Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Header */}
      <div className="pt-12 pb-16 max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-3 text-slate-400 mb-8">
           <Link to="/dashboard/admin" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Admin Controller</Link>
           <ChevronRight className="w-3 h-3" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Architect Audit Queue</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-900">
                Architect <br/><span className="text-indigo-600">Verification</span>
              </h1>
              <p className="text-slate-400 font-medium mt-6 text-lg max-w-xl">
                 Validate professional credentials, license parameters, and identity records for pending architect enrollments.
              </p>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 px-8 flex items-center gap-6 shadow-sm">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Queue Status</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{architects.length} <span className="text-xs uppercase tracking-normal">Pending</span></p>
                 </div>
                 <div className="w-[1px] h-10 bg-slate-200"></div>
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {error && (
          <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] flex items-center justify-between gap-6 text-rose-700 shadow-xl shadow-rose-200/20 mb-12">
             <div className="flex items-center gap-6">
                <AlertCircle className="w-10 h-10" />
                <div>
                   <h3 className="text-lg font-black uppercase italic tracking-tight">Sync Failure</h3>
                   <p className="font-bold opacity-80 uppercase tracking-wide text-xs">{error}</p>
                </div>
             </div>
             <button
               onClick={fetchPendingArchitects}
               className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-200"
             >
               Re-Sync Registry
             </button>
          </div>
        )}

        {architects.length === 0 && !error && (
          <div className="bg-white rounded-[4rem] border-2 border-dashed border-slate-100 p-32 text-center shadow-inner">
            <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-emerald-100/50">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Registry Clear</h3>
            <p className="text-slate-400 mt-4 max-w-sm mx-auto font-medium text-lg">No pending applications detected in the audit subsystem.</p>
            <Link to="/dashboard/admin" className="mt-12 inline-flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl">
              Back to Controller
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {architects.map((architect) => (
            <div
              key={architect.architect_id}
              className={`bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden transition-all duration-700 group hover:border-indigo-200 ${
                fadingOut === architect.architect_id ? 'opacity-0 scale-95 translate-x-20' : 'opacity-100'
              }`}
            >
              <div className="p-10 md:p-12">
                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Identity Section */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="relative">
                       {architect.user?.profile_image ? (
                         <img
                           src={resolveImageUrl(architect.user.profile_image)}
                           alt={architect.user?.full_name}
                           className="w-40 h-40 rounded-[3rem] object-cover ring-[12px] ring-slate-50 shadow-2xl group-hover:scale-105 transition-transform duration-500"
                         />
                       ) : (
                         <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-5xl font-black shadow-2xl group-hover:scale-105 transition-transform duration-500">
                           {getInitials(architect.user?.full_name)}
                         </div>
                       )}
                       <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100">
                          <Fingerprint className="w-6 h-6 text-indigo-600" />
                       </div>
                    </div>
                    <div className="mt-10 px-6 py-2 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border-2 border-amber-100 shadow-sm">
                      Audit Pending
                    </div>
                  </div>

                  {/* Information Matrix */}
                  <div className="flex-1 space-y-10">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">{architect.user?.full_name}</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                           {architect.user?.email}
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           Applied {new Date(architect.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        to={`/admin/verify-architects/${architect.architect_id}`}
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                      >
                        Deep Audit
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Award className="w-3.5 h-3.5" /> License No.
                        </p>
                        <p className="text-lg font-black text-slate-900">{architect.license_number || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> Experience
                        </p>
                        <p className="text-lg font-black text-slate-900 italic uppercase">{architect.experience_years || 0} Years</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Briefcase className="w-3.5 h-3.5" /> Mastery
                        </p>
                        <p className="text-lg font-black text-slate-900 italic uppercase line-clamp-1">{architect.specialization || 'General'}</p>
                      </div>
                    </div>

                    {architect.bio && (
                      <div className="relative p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100/50">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Professional Statement</p>
                        <p className="text-lg text-slate-600 font-medium italic leading-relaxed">
                          "{architect.bio}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Protocol Actions */}
                  <div className="flex flex-col gap-4 lg:w-72 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2 mb-2">Protocol Action</p>
                    {architect.verification_document && (
                      <Link
                        to={`/admin/verify-architects/${architect.architect_id}/documents`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-between px-8 py-5 bg-white text-slate-900 hover:text-indigo-600 border-2 border-slate-100 hover:border-indigo-600 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest group/doc shadow-sm"
                      >
                        Credential Record
                        <FileText className="w-5 h-5 group-hover/doc:scale-110 transition-transform" />
                      </Link>
                    )}
                    <button
                      onClick={() => setConfirm({ isOpen: true, type: 'approve', architect, rejectionReason: '' })}
                      disabled={processing}
                      className="w-full inline-flex items-center justify-between px-8 py-5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-100/50 disabled:opacity-50"
                    >
                      Authorize Identity
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setConfirm({ isOpen: true, type: 'reject', architect, rejectionReason: '' })}
                      disabled={processing}
                      className="w-full inline-flex items-center justify-between px-8 py-5 bg-white text-rose-600 hover:bg-rose-50 border-2 border-rose-100 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                      Reject Protocol
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Overlay */}
      {confirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] max-w-lg w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500">
            <div className={`p-12 text-center ${confirm.type === 'approve' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${
                confirm.type === 'approve' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'
              }`}>
                {confirm.type === 'approve' ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                {confirm.type === 'approve' ? 'Authorize Identity?' : 'Execute Rejection?'}
              </h3>
              <p className="text-slate-500 mt-3 font-bold uppercase tracking-widest text-[10px]">
                Confirming protocol for <span className="text-slate-900">{confirm.architect?.user?.full_name}</span>
              </p>
            </div>

            <div className="p-12 space-y-8">
              {confirm.type === 'approve' && confirm.architect?.verification_document && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-left">
                  <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                    A separate tab was opened with the uploaded verification document. Preview or download it there, then confirm approval when you are satisfied.
                  </p>
                  <Link
                    to={`/admin/verify-architects/${confirm.architect.architect_id}/documents`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
                  >
                    Open document review again
                  </Link>
                </div>
              )}
              {confirm.type === 'reject' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Reason for rejection protocol</label>
                  <textarea
                    value={confirm.rejectionReason}
                    onChange={(e) => setConfirm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                    placeholder="Document specific credential failures or identity discrepancies..."
                    className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] focus:outline-none focus:border-rose-500 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300 resize-none leading-relaxed"
                    rows={4}
                  />
                  <div className="flex justify-between px-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">MIN 10 CHARACTERS</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${confirm.rejectionReason.length >= 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {confirm.rejectionReason.length} SECURED
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-6">
                <button
                  onClick={() => setConfirm({ isOpen: false, type: null, architect: null, rejectionReason: '' })}
                  disabled={processing}
                  className="flex-1 px-8 py-5 bg-slate-100 text-slate-900 rounded-[2rem] hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Abort
                </button>
                <button
                  onClick={() => confirm.type === 'approve' ? handleApprove(confirm.architect!) : handleReject(confirm.architect!)}
                  disabled={processing || (confirm.type === 'reject' && confirm.rejectionReason.trim().length < 10)}
                  className={`flex-1 px-8 py-5 text-white rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-50 ${
                    confirm.type === 'approve' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  }`}
                >
                  {processing ? 'Processing...' : 'Confirm Protocol'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
