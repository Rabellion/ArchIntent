import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader, MessageSquare } from 'lucide-react';

type AgreementStatus = 'draft' | 'pending_signatures' | 'signed' | 'cancelled';

interface ProjectData {
  project_id: number;
  project_title: string;
  project_status: string;
  budget: number;
  client_id: number;
  agreement_id?: number | null;
  selected_architect?: {
    architect_id: number;
    user?: {
      user_id: number;
      full_name?: string;
    };
  };
  client?: {
    user_id: number;
    full_name: string;
  };
}

interface Signature {
  signature_id: number;
  user_id: number;
  signed_at: string | null;
  user?: {
    user_id: number;
    full_name: string;
  };
}

interface AgreementData {
  agreement_id: number;
  project_id: number;
  status: AgreementStatus;
  scope_of_work: string;
  deliverables: string;
  timeline_days: number;
  payment_terms: string;
  revision_policy: string;
  cancellation_terms: string | null;
  change_request_message?: string | null;
  project?: {
    project_id: number;
    client_id: number;
    project_title: string;
    selected_architect?: {
      architect_id: number;
      user?: {
        user_id: number;
        full_name: string;
      };
    };
  };
  signatures?: Signature[];
}

interface AgreementForm {
  scope_of_work: string;
  deliverables: string;
  timeline_days: number;
  payment_terms: string;
  revision_policy: string;
  cancellation_terms: string;
}

const ProjectAgreement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const [showSignModal, setShowSignModal] = useState(false);
  const [signName, setSignName] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangeMessage, setRequestChangeMessage] = useState('');
  const [requestingChanges, setRequestingChanges] = useState(false);

  const [form, setForm] = useState<AgreementForm>({
    scope_of_work: '',
    deliverables: '',
    timeline_days: 14,
    payment_terms: '',
    revision_policy: '',
    cancellation_terms: '',
  });

  const isArchitect = user?.role === 'architect';
  const isClient = user?.role === 'client';

  const architectSignature = useMemo(() => {
    if (!agreement?.signatures) return null;
    // Get architect user_id from project data
    const architectUserId = project?.selected_architect?.user?.user_id 
      || (agreement.project as any)?.selected_architect?.user?.user_id
      || (agreement.project as any)?.selectedArchitect?.user?.user_id;
    if (!architectUserId) return null;
    return agreement.signatures.find((s) => s.user_id === architectUserId) ?? null;
  }, [agreement, project]);

  const clientSignature = useMemo(() => {
    if (!agreement?.signatures || !project?.client_id) return null;
    return agreement.signatures.find((s) => s.user_id === project.client_id) ?? null;
  }, [agreement, project]);

  const canCurrentUserSign = useMemo(() => {
    if (!agreement || agreement.status !== 'pending_signatures' || !user?.user_id) return false;
    const ownSig = agreement.signatures?.find((s) => s.user_id === user.user_id);
    return !!ownSig && ownSig.signed_at === null;
  }, [agreement, user])

  const canRequestAgreementChanges = useMemo(() => {
    if (!isClient || !agreement || agreement.status !== 'pending_signatures' || !user?.user_id) return false
    const ownSig = agreement.signatures?.find((s) => s.user_id === user.user_id)
    return !!ownSig && ownSig.signed_at === null
  }, [agreement, user, isClient])

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const projectRes = await axiosInstance.get(`/projects/${id}`);
      const projectData: ProjectData = projectRes.data.data;
      setProject(projectData);

      if (projectData.agreement_id) {
        const agreementRes = await axiosInstance.get(`/agreements/${projectData.agreement_id}`);
        const agreementData: AgreementData = agreementRes.data.data;
        setAgreement(agreementData);
        setForm({
          scope_of_work: agreementData.scope_of_work || '',
          deliverables: agreementData.deliverables || '',
          timeline_days: agreementData.timeline_days || 14,
          payment_terms: agreementData.payment_terms || '',
          revision_policy: agreementData.revision_policy || '',
          cancellation_terms: agreementData.cancellation_terms || '',
        });
      } else {
        setAgreement(null);
        setForm((prev) => ({
          ...prev,
          payment_terms: prev.payment_terms || `Project fee of PKR ${Number(projectData.budget || 0).toLocaleString('en-PK')} will be paid as per agreed milestones and held in escrow until deliverables are approved.`,
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agreement page');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      if (agreement) {
        await axiosInstance.put(`/agreements/${agreement.agreement_id}`, form);
      } else {
        await axiosInstance.post(`/projects/${id}/agreement`, form);
      }
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save agreement');
    } finally {
      setSaving(false);
    }
  };

  const finalizeDraft = async () => {
    if (!agreement) return;
    setSaving(true);
    setError('');
    try {
      await axiosInstance.post(`/agreements/${agreement.agreement_id}/finalize`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize agreement');
    } finally {
      setSaving(false);
    }
  };

  const signAgreement = async () => {
    if (!signName.trim() || !confirmChecked) return;
    if (signName.trim().toLowerCase() !== (user?.full_name || '').trim().toLowerCase()) {
      setError('Typed name must match your account full name.');
      return;
    }

    if (!agreement) return;

    setSigning(true);
    setError('');
    try {
      await axiosInstance.post(`/agreements/${agreement.agreement_id}/sign`);
      setShowSignModal(false);
      setSignName('');
      setConfirmChecked(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign agreement');
    } finally {
      setSigning(false);
    }
  }

  const submitRequestChanges = async () => {
    const trimmed = requestChangeMessage.trim()
    if (trimmed.length < 10 || !agreement) return
    setRequestingChanges(true)
    setError('')
    try {
      await axiosInstance.post(`/agreements/${agreement.agreement_id}/request-changes`, {
        change_request_message: trimmed,
      })
      setShowRequestChangesModal(false)
      setRequestChangeMessage('')
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send change request')
    } finally {
      setRequestingChanges(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="mx-auto mb-4 text-indigo-300 animate-spin" />
          <p className="text-slate-400">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-300 hover:text-indigo-300 mb-6 font-semibold">
            <ArrowLeft size={20} /> Back
          </button>
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg">Project not found</div>
        </div>
      </div>
    );
  }

  const showCreateForm = isArchitect && !agreement && project.project_status === 'architect_selected'
  const showEditForm = isArchitect && agreement?.status === 'draft'
  const showReadOnly =
    !!agreement &&
    (agreement.status === 'pending_signatures' ||
      agreement.status === 'signed' ||
      (agreement.status === 'draft' && isClient))

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(`/project/${id}`)} className="flex items-center gap-2 text-indigo-300 hover:text-indigo-300 mb-6 font-semibold">
          <ArrowLeft size={20} /> Back to Project
        </button>

        <div className="bg-slate-900 rounded-lg shadow p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Project Agreement</h1>
          <p className="text-slate-400">{project.project_title}</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {(showCreateForm || showEditForm) && (
          <div className="bg-slate-900 rounded-lg shadow p-8 mb-8 space-y-5">
            <h2 className="text-2xl font-bold text-slate-100">{showCreateForm ? 'Create Agreement Draft' : 'Edit Agreement Draft'}</h2>

            {showEditForm && agreement?.change_request_message && (
              <div
                className="rounded-lg border border-amber-300 bg-amber-500/10 px-4 py-3 text-amber-950"
                role="region"
                aria-label="Client change request"
              >
                <p className="text-sm font-semibold text-amber-900 mb-1">Client requested changes</p>
                <p className="text-sm whitespace-pre-wrap">{agreement.change_request_message}</p>
              </div>
            )}

            <Field label="Scope of Work" value={form.scope_of_work} onChange={(v) => setForm({ ...form, scope_of_work: v })} rows={4} />
            <Field label="Deliverables" value={form.deliverables} onChange={(v) => setForm({ ...form, deliverables: v })} rows={4} />

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Timeline (days)</label>
              <input
                type="number"
                min={1}
                value={form.timeline_days}
                onChange={(e) => setForm({ ...form, timeline_days: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100"
              />
            </div>

            <Field label="Payment Terms" value={form.payment_terms} onChange={(v) => setForm({ ...form, payment_terms: v })} rows={3} />
            <Field label="Revision Policy" value={form.revision_policy} onChange={(v) => setForm({ ...form, revision_policy: v })} rows={3} />
            <Field label="Cancellation Terms" value={form.cancellation_terms} onChange={(v) => setForm({ ...form, cancellation_terms: v })} rows={3} />

            <div className="flex gap-3">
              <button onClick={saveDraft} disabled={saving} className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 font-semibold">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {agreement && (
                <button onClick={finalizeDraft} disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold">
                  Finalize for Signing
                </button>
              )}
            </div>
          </div>
        )}

        {isClient && !agreement && (
          <div className="bg-slate-900 rounded-lg shadow p-8 mb-8">
            <p className="text-slate-300">No agreement yet. Waiting for the selected architect to create and finalize the agreement.</p>
          </div>
        )}

        {showReadOnly && agreement && (
          <div className="bg-slate-900 rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-4">Agreement Document</h2>
            <StatusBadge status={agreement.status} />

            {isClient && agreement.status === 'draft' && agreement.change_request_message && (
              <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-900 text-sm">
                You asked for updates below. The architect is revising the agreement. You will be notified when it is ready to sign again.
              </div>
            )}

            <ReadOnlyBlock title="Scope of Work" text={agreement.scope_of_work} />
            <ReadOnlyBlock title="Deliverables" text={agreement.deliverables} />
            <ReadOnlyBlock title="Timeline" text={`${agreement.timeline_days} days`} />
            <ReadOnlyBlock title="Payment Terms" text={agreement.payment_terms} />
            <ReadOnlyBlock title="Revision Policy" text={agreement.revision_policy} />
            <ReadOnlyBlock title="Cancellation Terms" text={agreement.cancellation_terms || 'Not specified'} />

            {canRequestAgreementChanges && (
              <div className="mt-8 border-t border-slate-700 pt-6">
                <p className="text-sm text-slate-400 mb-3">
                  Need edits before you sign? Send a message to the architect. The agreement will return to draft and signatures will reset.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRequestChangeMessage('')
                    setShowRequestChangesModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 font-semibold text-sm"
                  aria-label="Request changes to agreement before signing"
                >
                  <MessageSquare size={18} aria-hidden />
                  Request agreement changes
                </button>
              </div>
            )}
          </div>
        )}

        {agreement && agreement.status !== 'draft' && (
          <div className="bg-slate-900 rounded-lg shadow p-8">
            <h3 className="text-xl font-bold text-slate-100 mb-4">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignatureCard
                roleLabel="Architect"
                signature={architectSignature}
                canSign={isArchitect && canCurrentUserSign}
                onSign={() => setShowSignModal(true)}
              />
              <SignatureCard
                roleLabel="Client"
                signature={clientSignature}
                canSign={isClient && canCurrentUserSign}
                onSign={() => setShowSignModal(true)}
              />
            </div>

            {/* Client's alternative to signing: send the agreement back
                for changes. The modal, the submit handler and the API
                endpoint all already existed, but nothing ever opened the
                modal -- setShowRequestChangesModal(true) was never called
                anywhere, so the feature was unreachable.

                Shown under exactly the same condition that lets the
                client sign: the agreement is awaiting signatures and
                this client has not signed yet. The backend enforces the
                same rule and returns 422 once they have signed. */}
            {isClient && canCurrentUserSign && (
              <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">
                      Not happy with these terms?
                    </p>
                    <p className="text-sm text-amber-300 mt-1">
                      You can ask the architect to revise the agreement before you sign.
                      This clears both signatures and returns the agreement to draft.
                    </p>
                    <button
                      onClick={() => setShowRequestChangesModal(true)}
                      className="mt-3 px-5 py-2.5 rounded-lg border-2 border-amber-600 text-amber-300 font-semibold text-sm hover:bg-amber-600 hover:text-white transition-colors"
                    >
                      Request Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {agreement.status === 'signed' && (
              <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                <CheckCircle2 size={18} className="mt-0.5" />
                <span>Agreement is fully signed. Project status will proceed to payment.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showRequestChangesModal && agreement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg shadow-lg max-w-lg w-full p-6">
            <h4 className="text-xl font-bold text-slate-100 mb-2">Request agreement changes</h4>
            <p className="text-sm text-slate-400 mb-4">
              Describe what should be updated (at least 10 characters). The architect will revise the draft and re-finalize for signing.
            </p>
            <textarea
              value={requestChangeMessage}
              onChange={(e) => setRequestChangeMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100 placeholder:text-slate-500 mb-4"
              placeholder="e.g. Please clarify milestone dates and add a second revision round."
              aria-label="Change request details"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRequestChangesModal(false)
                  setRequestChangeMessage('')
                }}
                className="flex-1 px-4 py-2 border border-slate-700 rounded-lg font-semibold"
                disabled={requestingChanges}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRequestChanges}
                disabled={requestingChanges || requestChangeMessage.trim().length < 10}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 font-semibold"
              >
                {requestingChanges ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignModal && agreement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h4 className="text-xl font-bold text-slate-100 mb-3">Sign Agreement</h4>
            <p className="text-sm text-slate-400 mb-4">Type your full name and confirm to sign this agreement.</p>

            <input
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100 placeholder:text-slate-500 mb-3"
            />

            <label className="flex items-start gap-2 text-sm text-slate-300 mb-4">
              <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="mt-1" />
              <span>I confirm I have read and agree to the terms of this agreement.</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSignName('');
                  setConfirmChecked(false);
                }}
                className="flex-1 px-4 py-2 border border-slate-700 rounded-lg font-semibold"
                disabled={signing}
              >
                Cancel
              </button>
              <button
                onClick={signAgreement}
                disabled={signing || !confirmChecked || !signName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
              >
                {signing ? 'Signing...' : 'Sign Agreement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) => (
  <div>
    <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100"
    />
  </div>
);

const ReadOnlyBlock = ({ title, text }: { title: string; text: string }) => (
  <div className="mb-5">
    <h4 className="font-semibold text-slate-100 mb-1">{title}</h4>
    <p className="text-slate-300 whitespace-pre-wrap">{text}</p>
  </div>
);

const StatusBadge = ({ status }: { status: AgreementStatus }) => {
  const styles: Record<AgreementStatus, string> = {
    draft: 'bg-slate-800 text-slate-200',
    pending_signatures: 'bg-amber-500/15 text-amber-300',
    signed: 'bg-emerald-500/15 text-emerald-300',
    cancelled: 'bg-rose-500/15 text-rose-300',
  };
  return <span className={`inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
};

const SignatureCard = ({
  roleLabel,
  signature,
  canSign,
  onSign,
}: {
  roleLabel: string;
  signature: Signature | null;
  canSign: boolean;
  onSign: () => void;
}) => (
  <div className="border border-slate-700 rounded-lg p-4">
    <p className="text-sm font-semibold text-slate-300 mb-2">{roleLabel}</p>
    {signature?.signed_at ? (
      <div className="text-emerald-300">
        <p className="font-semibold">Signed</p>
        <p className="text-sm">{signature.user?.full_name || 'User'}</p>
        <p className="text-xs">{new Date(signature.signed_at).toLocaleString()}</p>
      </div>
    ) : (
      <div className="text-amber-300">
        <p className="font-semibold">Pending</p>
      </div>
    )}

    {canSign && !signature?.signed_at && (
      <button onClick={onSign} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
        Sign Agreement
      </button>
    )}
  </div>
);

export default ProjectAgreement;
