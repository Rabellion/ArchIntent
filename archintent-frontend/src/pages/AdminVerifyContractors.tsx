import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../utils/storage';
import {
  HardHat,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  MapPin,
  Fingerprint
} from 'lucide-react';

interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  profile_image?: string;
}

interface Contractor {
  contractor_id: number;
  user_id: number;
  company_name?: string;
  registration_number?: string;
  company_address?: string;
  work_types?: string[] | null;
  experience_years?: number;
  specialization?: string;
  bio?: string;
  verification_document?: string;
  created_at: string;
  user: User;
}

export default function AdminVerifyContractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveConfirmContractor, setApproveConfirmContractor] = useState<Contractor | null>(null);

  useEffect(() => {
    document.title = 'Audit Queue — Contractors — ArchIntent';
    fetchPendingContractors();
  }, []);

  const fetchPendingContractors = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/contractors/pending');
      setContractors(response.data.data || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to synchronize pending contractor registry.');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contractorId: number) => {
    try {
      setActionLoading(`approve-${contractorId}`);
      await axiosInstance.post(`/admin/contractors/${contractorId}/verify`);
      setContractors(contractors.filter((c) => c.contractor_id !== contractorId));
      setApproveConfirmContractor(null);
      toast.success('Contractor identity activated.');
    } catch (err: any) {
      toast.error('Identity activation failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestApprove = (contractor: Contractor) => {
    if (contractor.verification_document) {
      const url = `${window.location.origin}/admin/verify-contractors/${contractor.contractor_id}/documents`
      window.open(url, '_blank', 'noopener,noreferrer')
      setApproveConfirmContractor(contractor)
      return
    }
    void handleApprove(contractor.contractor_id)
  };

  const handleReject = async (contractorId: number) => {
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      toast.error('Minimum 10 characters required for rejection protocol.');
      return;
    }

    try {
      setActionLoading(`reject-${contractorId}`);
      await axiosInstance.post(`/admin/contractors/${contractorId}/reject`, {
        reason: rejectReason,
      });
      setContractors(contractors.filter((c) => c.contractor_id !== contractorId));
      setRejectingId(null);
      setRejectReason('');
      toast.success('Application rejected and archived.');
    } catch (err: any) {
      toast.error('Rejection protocol failure.');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'C';
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
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Contractor Audit Queue</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-900">
                Contractor <br/><span className="text-indigo-600">Verification</span>
              </h1>
              <p className="text-slate-400 font-medium mt-6 text-lg max-w-xl">
                 Validate entity credentials, company registration parameters, and construction scope records for pending contractor enrollments.
              </p>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 px-8 flex items-center gap-6 shadow-sm">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Queue Status</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{contractors.length} <span className="text-xs uppercase tracking-normal">Pending</span></p>
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
               onClick={fetchPendingContractors}
               className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-200"
             >
               Re-Sync Registry
             </button>
          </div>
        )}

        {contractors.length === 0 && !error && (
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

        <div className="grid grid-cols-1 gap-10">
          {contractors.map((contractor) => (
            <div
              key={contractor.contractor_id}
              className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden group hover:border-indigo-200 transition-all duration-500"
            >
              <div className="p-10 md:p-12">
                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Info Matrix */}
                  <div className="flex-1 space-y-10">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {contractor.user?.profile_image ? (
                          <img
                            src={resolveImageUrl(contractor.user.profile_image)}
                            alt={contractor.user.full_name}
                            className="w-24 h-24 rounded-[2rem] object-cover ring-8 ring-slate-50 shadow-xl group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl font-black shadow-xl group-hover:scale-105 transition-transform">
                            {getInitials(contractor.user.full_name)}
                          </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center border border-slate-100">
                           <Fingerprint className="w-4 h-4 text-indigo-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{contractor.user.full_name}</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mt-1">
                           {contractor.user.email}
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           Applied {new Date(contractor.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Building2 className="w-3.5 h-3.5" /> Entity
                        </p>
                        <p className="text-lg font-black text-slate-900 italic uppercase line-clamp-1">{contractor.company_name || '—'}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> Experience
                        </p>
                        <p className="text-lg font-black text-slate-900 italic uppercase">{contractor.experience_years || 0} Years</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Briefcase className="w-3.5 h-3.5" /> Expertise
                        </p>
                        <p className="text-lg font-black text-slate-900 italic uppercase line-clamp-1">{contractor.specialization || '—'}</p>
                      </div>
                    </div>

                    {contractor.work_types && contractor.work_types.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {contractor.work_types.map((type, i) => (
                          <span key={i} className="px-5 py-2.5 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                            {type}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100">
                      <Link
                        to={`/admin/verify-contractors/${contractor.contractor_id}`}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-2"
                      >
                        Deep Audit Protocol
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                         <MapPin className="w-3.5 h-3.5" />
                         {contractor.company_address || 'Operating Location Undefined'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Matrix */}
                  <div className="flex flex-col gap-4 lg:w-72 shrink-0 border-l border-slate-50 pl-0 lg:pl-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2 mb-2">Protocol Action</p>
                    {contractor.verification_document ? (
                      <Link
                        to={`/admin/verify-contractors/${contractor.contractor_id}/documents`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-between px-8 py-5 bg-white text-slate-900 hover:text-indigo-600 border-2 border-slate-100 hover:border-indigo-600 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest group/doc shadow-sm"
                      >
                        Entity Credentials
                        <FileText className="w-5 h-5 group-hover/doc:scale-110 transition-transform" />
                      </Link>
                    ) : (
                      <div className="w-full py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem]">Identity Record Missing</div>
                    )}

                    {rejectingId === contractor.contractor_id ? (
                      <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Document specific credential failures..."
                          className="w-full px-6 py-4 bg-rose-50 border-2 border-rose-100 rounded-[2rem] focus:outline-none focus:border-rose-500 focus:bg-white transition-all text-xs font-bold text-slate-900 placeholder:text-rose-200 resize-none"
                          rows={3}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest"
                          >
                            Abort
                          </button>
                          <button
                            onClick={() => handleReject(contractor.contractor_id)}
                            disabled={actionLoading === `reject-${contractor.contractor_id}`}
                            className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest shadow-xl shadow-rose-200 disabled:opacity-50"
                          >
                            Execute
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRequestApprove(contractor)}
                          disabled={actionLoading === `approve-${contractor.contractor_id}`}
                          className="w-full inline-flex items-center justify-between px-8 py-5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-100/50 disabled:opacity-50"
                        >
                          Authorize Identity
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setRejectingId(contractor.contractor_id)}
                          className="w-full inline-flex items-center justify-between px-8 py-5 bg-white text-rose-600 hover:bg-rose-50 border-2 border-rose-100 rounded-[2rem] transition-all font-black text-[10px] uppercase tracking-widest"
                        >
                          Reject Protocol
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {approveConfirmContractor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Confirm approval</h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {approveConfirmContractor.verification_document
                ? 'A new tab was opened with the uploaded verification documents. Preview or download them there, then confirm when you are ready to approve this contractor.'
                : 'Approve this contractor application?'}
            </p>
            {approveConfirmContractor.verification_document && (
              <Link
                to={`/admin/verify-contractors/${approveConfirmContractor.contractor_id}/documents`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
              >
                Open document review again
              </Link>
            )}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setApproveConfirmContractor(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleApprove(approveConfirmContractor.contractor_id)}
                disabled={actionLoading === `approve-${approveConfirmContractor.contractor_id}`}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === `approve-${approveConfirmContractor.contractor_id}` ? 'Approving…' : 'Confirm approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
