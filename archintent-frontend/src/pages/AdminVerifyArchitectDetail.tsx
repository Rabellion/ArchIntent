import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  FileText, 
  ExternalLink, 
  X, 
  Calendar, 
  ShieldCheck, 
  Mail, 
  Phone,
  Fingerprint,
  Activity,
  Award,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react'
import axiosInstance from '../api/axios'
import toast from 'react-hot-toast'
import { resolveImageUrl } from '../utils/storage'

type User = {
  user_id: number
  full_name: string
  email: string
  phone_number?: string
  profile_image?: string
  profile_completed?: boolean
}

type ArchitectReview = {
  architect_id: number
  user_id: number
  license_number?: string
  experience_years?: number
  specialization?: string
  bio?: string
  verification_document?: string
  verification_status?: string
  created_at: string
  user?: User
}

type ConfirmState = {
  isOpen: boolean
  type: 'approve' | 'reject' | null
  rejectionReason: string
}

const AdminVerifyArchitectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const architectId = id ? Number.parseInt(id, 10) : NaN

  const [architect, setArchitect] = useState<ArchitectReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    type: null,
    rejectionReason: '',
  })
  const docTabOpenedForApproveKey = useRef<string | null>(null)

  useEffect(() => {
    document.title = 'Audit Architect — Registry Control'
  }, [])

  useEffect(() => {
    if (!confirm.isOpen) {
      docTabOpenedForApproveKey.current = null
      return
    }
    if (confirm.type !== 'approve' || !architect?.verification_document) return
    const key = `detail-approve-${architect.architect_id}`
    if (docTabOpenedForApproveKey.current === key) return
    docTabOpenedForApproveKey.current = key
    const url = `${window.location.origin}/admin/verify-architects/${architect.architect_id}/documents`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [confirm.isOpen, confirm.type, architect?.architect_id, architect?.verification_document])

  useEffect(() => {
    if (!Number.isFinite(architectId) || architectId < 1) {
      setError('Invalid architect id')
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const res = await axiosInstance.get(`/admin/architects/${architectId}/review`)
        setArchitect(res.data.data ?? null)
        setError(null)
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load architect application'
        setError(msg)
        setArchitect(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [architectId])

  const getInitials = (name: string | undefined) => {
    if (!name) return 'A'
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  const handleApprove = async () => {
    if (!architect) return
    try {
      setProcessing(true)
      await axiosInstance.post(`/admin/architects/${architect.architect_id}/verify`)
      toast.success(`${architect.user?.full_name ?? 'Architect'} has been approved`)
      navigate('/admin/verify-architects', { replace: true })
    } catch {
      toast.error('Failed to approve architect')
    } finally {
      setProcessing(false)
      setConfirm({ isOpen: false, type: null, rejectionReason: '' })
    }
  }

  const handleReject = async () => {
    if (!architect) return
    if (confirm.rejectionReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters')
      return
    }
    try {
      setProcessing(true)
      await axiosInstance.post(`/admin/architects/${architect.architect_id}/reject`, {
        reason: confirm.rejectionReason,
      })
      toast.success('Architect application has been rejected')
      navigate('/admin/verify-architects', { replace: true })
    } catch {
      toast.error('Failed to reject architect application')
    } finally {
      setProcessing(false)
      setConfirm({ isOpen: false, type: null, rejectionReason: '' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-slate-950">
        <div className="w-20 h-20 border-4 border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-8 animate-pulse">Syncing Audit Registry...</p>
      </div>
    )
  }

  if (error || !architect) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
           <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-4xl font-black text-slate-100 mb-4 tracking-tighter italic uppercase">Audit Fault</h2>
        <p className="text-slate-500 mb-10 text-lg font-medium">{error || 'The requested application record is missing from the registry.'}</p>
        <Link
          to="/admin/verify-architects"
          className="px-10 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Queue
        </Link>
      </div>
    )
  }

  const u = architect.user

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      {/* Header Protocol */}
      <div className="mb-16">
        <Link
          to="/admin/verify-architects"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-300 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Audit Queue</span>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
               <span className="px-4 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/30">
                  Registry Audit
               </span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID: ARC-{architect.architect_id.toString().padStart(5, '0')}
               </span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-100 tracking-tighter italic uppercase leading-[0.85]">
              Verify <br/><span className="text-indigo-300">Architect</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6 pb-2">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                   <Activity className="w-3 h-3" /> Under Review
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
        {/* Main Module: Identity & Evidence */}
        <div className="flex-1 space-y-24">
          
          {/* Entity Profile Section */}
          <section className="space-y-12">
            <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
              <div className="shrink-0 relative">
                {u?.profile_image ? (
                  <img
                    src={resolveImageUrl(u.profile_image)}
                    alt={u.full_name}
                    className="w-48 h-48 rounded-[3.5rem] object-cover ring-[12px] ring-slate-50 shadow-2xl"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-[3.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl italic">
                    {getInitials(u?.full_name)}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white border-4 border-white shadow-xl">
                   <Fingerprint className="w-7 h-7" />
                </div>
              </div>
              
              <div className="flex-1 space-y-6 pt-4">
                <div>
                   <h2 className="text-4xl font-black text-slate-100 italic uppercase tracking-tight mb-2">
                     {u?.full_name || 'System Identity'}
                   </h2>
                   <div className="flex flex-wrap gap-4">
                     <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                       <Mail className="w-4 h-4 text-indigo-400" /> {u?.email}
                     </div>
                     {u?.phone_number && (
                       <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                         <Phone className="w-4 h-4 text-indigo-400" /> {u.phone_number}
                       </div>
                     )}
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">License Record</span>
                    <span className="text-lg font-black text-slate-100 font-mono tracking-wider italic uppercase">{architect.license_number || 'NULL'}</span>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Experience Matrix</span>
                    <span className="text-lg font-black text-slate-100 italic uppercase tracking-tight">{architect.experience_years ? `${architect.experience_years} Years Tenure` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Professional Context Modules */}
          <section className="space-y-16">
            <div className="space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-800">
                     <Layers className="w-6 h-6 text-slate-100" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Module 01</p>
                     <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Expertise Profile</h3>
                  </div>
               </div>
               
               <div className="bg-slate-800 rounded-[3rem] p-10 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Specialization</p>
                     <p className="text-lg font-black italic uppercase text-slate-100 bg-slate-900 px-6 py-4 rounded-2xl border border-slate-800 inline-block">
                        {architect.specialization || 'Architectural Design'}
                     </p>
                  </div>
                  {architect.bio && (
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Statement</p>
                       <p className="text-sm text-slate-400 font-medium leading-relaxed italic">
                          "{architect.bio}"
                       </p>
                    </div>
                  )}
               </div>
            </div>

            {architect.verification_document && (
              <div className="space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-800">
                       <FileText className="w-6 h-6 text-slate-100" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Module 02</p>
                       <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Evidence Archive</h3>
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-600/30 transition-colors duration-700" />
                   
                   <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
                     <div className="flex items-center gap-8">
                       <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl">
                         <FileText className="w-10 h-10 text-indigo-300" />
                       </div>
                       <div>
                         <h4 className="text-2xl font-black italic uppercase tracking-tight mb-2">Registry Evidence</h4>
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Authorized Certification / Credentials</p>
                       </div>
                     </div>
                     
                     <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                       <Link
                         to={`/admin/verify-architects/${architectId}/documents`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="px-10 py-5 bg-slate-900 text-slate-100 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-2xl group text-center"
                       >
                         <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                         Document review page
                         <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden />
                       </Link>
                     </div>
                   </div>
                 </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Protocol: Control & Audit */}
        <div className="lg:w-96 space-y-8">
          <div className="sticky top-32 space-y-8">
            
            {/* Audit Control Module */}
            <div className="bg-slate-900 rounded-[3.5rem] border-2 border-slate-800 p-10 shadow-2xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Terminal</span>
                <div className="flex items-center gap-2">
                   <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Active Review</span>
                </div>
              </div>

              <div className="mb-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registry Timestamp</p>
                <div className="text-3xl font-black text-slate-100 italic uppercase tracking-tighter leading-none mb-1">
                   {new Date(architect.created_at).toLocaleDateString()}
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Application Synchronized</p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setConfirm({ isOpen: true, type: 'approve', rejectionReason: '' })}
                  disabled={processing}
                  className="w-full py-5 bg-emerald-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Verify Entity
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({ isOpen: true, type: 'reject', rejectionReason: '' })}
                  disabled={processing}
                  className="w-full py-5 bg-slate-900 text-red-500 border-2 border-slate-800 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-rose-500/10 hover:border-red-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject Protocol
                </button>
              </div>
            </div>

            {/* Audit Intelligence Widget */}
            <div className="bg-slate-800 rounded-[3rem] p-10 border border-slate-800">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> Audit Directives
               </h4>
               <ul className="space-y-4">
                 {[
                   'Confirm PCATP / Council License',
                   'Verify Experience Matrix Credibility',
                   'Audit Original Document Integrity',
                   'Cross-check Identity Fingerprint'
                 ].map((item, i) => (
                   <li key={i} className="flex items-start gap-4 text-[11px] font-black uppercase italic text-slate-400 tracking-tight leading-relaxed">
                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
                     {item}
                   </li>
                 ))}
               </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Premium Confirm Dialog */}
      {confirm.isOpen && confirm.type === 'approve' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] max-w-md w-full p-12 text-center relative overflow-hidden border border-white">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-emerald-500/30">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-100 italic uppercase tracking-tighter mb-4 leading-none">
              Verify <br/><span className="text-emerald-500">Identity?</span>
            </h3>
            <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed max-w-xs mx-auto italic">
              Synchronizing <span className="font-bold text-slate-100 uppercase">"{u?.full_name}"</span> into the authorized architect registry.
            </p>
            {architect.verification_document && (
              <div className="mb-8 mx-auto max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10/90 px-4 py-3 text-left">
                <p className="text-[11px] font-bold text-emerald-900 leading-relaxed">
                  A separate tab was opened with the uploaded verification document. Review it there, then confirm below.
                </p>
                <Link
                  to={`/admin/verify-architects/${architect.architect_id}/documents`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-indigo-300"
                >
                  Open document review again
                </Link>
              </div>
            )}
            <div className="space-y-4">
              <button
                onClick={() => void handleApprove()}
                disabled={processing}
                className="w-full py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-600 transition-all shadow-2xl"
              >
                {processing ? 'Synchronizing...' : 'Establish Verification'}
              </button>
              <button
                onClick={() => setConfirm({ isOpen: false, type: null, rejectionReason: '' })}
                className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-100 transition-colors"
              >
                Cancel Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Reject Dialog */}
      {confirm.isOpen && confirm.type === 'reject' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] max-w-xl w-full p-12 relative border border-white">
            <div className="flex items-center justify-between mb-10">
              <div>
                 <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Audit Rejection</p>
                 <h3 className="text-3xl font-black text-slate-100 italic uppercase tracking-tighter leading-none">
                   Establish <br/><span className="text-red-500">Fault Protocol</span>
                 </h3>
              </div>
              <button 
                onClick={() => setConfirm({ isOpen: false, type: null, rejectionReason: '' })}
                className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-rose-500/10 hover:text-red-500 transition-all shadow-inner"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-10">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Fault Narrative (Required)</label>
              <textarea
                value={confirm.rejectionReason}
                onChange={(e) => setConfirm((prev) => ({ ...prev, rejectionReason: e.target.value }))}
                placeholder="Outline the reasons for application denial (minimum 10 characters)..."
                rows={5}
                className="w-full px-8 py-6 bg-slate-800 border-2 border-slate-50 rounded-[2.5rem] text-sm focus:ring-8 focus:ring-red-50 focus:border-red-500/30 focus:bg-slate-900 outline-none transition-all placeholder:text-slate-300 font-medium italic"
              />
              <div className="flex justify-between mt-4 px-6">
                <span className={`text-[10px] font-black uppercase tracking-widest ${confirm.rejectionReason.length < 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                   Matrix Sync: {confirm.rejectionReason.length} chars
                </span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Min 10 Required</span>
              </div>
            </div>

            <button
              onClick={() => void handleReject()}
              disabled={processing || confirm.rejectionReason.trim().length < 10}
              className="w-full py-6 bg-red-600 text-white rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-700 transition-all shadow-2xl shadow-red-200 disabled:opacity-30"
            >
              {processing ? 'Processing Fault...' : 'Execute Rejection Protocol'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminVerifyArchitectDetail
