import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import StartChatButton from '../components/chat/StartChatButton';
import StarRating from '../components/reviews/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import LeaveReviewModal from '../components/reviews/LeaveReviewModal';
import type { CanReviewResponse, ReviewItem, RevieweeType } from '../types/reviews';
import { resolveImageUrl } from '../utils/storage';

interface Project {
  project_id: number;
  project_title: string;
  brief_text: string;
  budget: number;
  location: string;
  project_type: string;
  project_status: string;
  created_at: string;
  mda_verification_deadline?: string;
  design_file_path?: string;
  project_description?: string;
  additional_notes?: string;
  // NOTE: the render below reads `rev.timestamp` and `rev.feedback`, but the
  // design_revisions table stores `requested_at` and `revision_message`.
  // Typed here to match what the component actually consumes -- verify the
  // API returns this shape, or the revision history will render blank.
  revision_requests?: Array<{
    timestamp: string;
    feedback: string;
  }>;
  selected_architect?: {
    architect_id: number;
    user_id: number;          // Direct FK column on architects table — the architect's user_id
    full_name?: string;       // May be absent; real name is at user.full_name
    specialization?: string;
    experience_years?: number;
    bio?: string;
    portfolio_photo_url?: string;
    average_rating?: number;
    total_reviews?: number;
    user?: {
      user_id: number;
      full_name: string;
      email?: string;
    };
  };
  client?: {
    full_name: string;
    user_id: number;
  };
  selected_contractor?: {
    contractor_id: number;
    user_id: number;          // Direct FK column on contractors table
    company_name?: string;
    average_rating?: number;
    total_reviews?: number;
    user?: {
      user_id: number;
      full_name?: string;
      email?: string;
    };
  };

  selected_contractor_id?: number;
  revisions?: Array<{
    revision_id: number;
    revision_message: string;
    revision_status: 'pending' | 'addressed' | 'completed';
    requested_at: string;
  }>;
}

interface Bid {
  bid_id: number;
  contractor: {
    contractor_id: number;
    company_name: string;
    experience_years: number;
    won_bids_count: number;
    average_rating?: number;
    total_reviews?: number;
    contractor_portfolio?: {
      company_bio?: string;
      years_in_business?: number;
      total_projects_count: number;
      projects: Array<{
      contractor_project_id: number;
      project_ref: string;
      project_title: string;
      project_type?: string;
      location?: string;
      completion_date: string;
      project_value_pkr?: number;
      duration_days?: number;
      client_feedback?: string;
      cover_image?: { image_url?: string };
      images: Array<{ image_id: number; image_url: string }>;
    }>;
    };
  };
  proposed_cost: number;
  estimated_duration: number;
  proposal_text?: string;
  bid_status: string;
  budz_spent?: number;
}

// Helper function to extract file extension
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || 'bin';
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [constructionBusy, setConstructionBusy] = useState(false);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [expandedBidId, setExpandedBidId] = useState<number | null>(null);

  // Modals
  const [modals, setModals] = useState<{ [key: string]: boolean }>({});
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
  const [revisionMessage, setRevisionMessage] = useState('');
  const [reviewModalConfig, setReviewModalConfig] = useState<{
    isOpen: boolean;
    revieweeType: RevieweeType;
    revieweeId: number;
    revieweeName: string;
  } | null>(null);
  const [architectCanReview, setArchitectCanReview] = useState<CanReviewResponse | null>(null);
  const [contractorCanReview, setContractorCanReview] = useState<CanReviewResponse | null>(null);
  const [loadingReviewEligibility, setLoadingReviewEligibility] = useState(false);

  // Review received by architect on this project (architect view)
  const [architectReceivedReview, setArchitectReceivedReview] = useState<ReviewItem | null>(null);
  const [loadingArchitectReview, setLoadingArchitectReview] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    document.title = 'Project Details — ArchIntent';
    fetchData();
  }, [id]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!project || user?.role !== 'client') {
        setArchitectCanReview(null);
        setContractorCanReview(null);
        return;
      }

      const reviewableArchitectStatuses = [
        'design_approved',
        'construction_open',
        'contractor_selected',
        'in_construction',
        'completed',
      ];

      setLoadingReviewEligibility(true);
      try {
        if (project.selected_architect && reviewableArchitectStatuses.includes(project.project_status)) {
          const response = await axiosInstance.get('/reviews/can-review', {
            params: {
              project_id: project.project_id,
              reviewee_type: 'architect',
            },
          });
          setArchitectCanReview(response.data);
        } else {
          setArchitectCanReview(null);
        }

        if (project.selected_contractor && project.project_status === 'completed') {
          const response = await axiosInstance.get('/reviews/can-review', {
            params: {
              project_id: project.project_id,
              reviewee_type: 'contractor',
            },
          });
          setContractorCanReview(response.data);
        } else {
          setContractorCanReview(null);
        }
      } catch (_err) {
        setArchitectCanReview(null);
        setContractorCanReview(null);
      } finally {
        setLoadingReviewEligibility(false);
      }
    };

    checkEligibility();
  }, [
    project?.project_id,
    project?.project_status,
    project?.selected_architect?.architect_id,
    project?.selected_contractor?.contractor_id,
    user?.role,
  ]);

  // Fetch review left for the architect on this project (architect role only)
  useEffect(() => {
    if (!project || user?.role !== 'architect') {
      setArchitectReceivedReview(null);
      return;
    }

    const reviewableStatuses = [
      'design_approved',
      'construction_open',
      'contractor_selected',
      'in_construction',
      'completed',
    ];

    if (!reviewableStatuses.includes(project.project_status)) {
      setArchitectReceivedReview(null);
      return;
    }

    const fetchReceivedReview = async () => {
      setLoadingArchitectReview(true);
      try {
        const res = await axiosInstance.get(`/projects/${project.project_id}/reviews`);
        const reviews: ReviewItem[] = res.data?.data || [];
        setArchitectReceivedReview(reviews[0] || null);
      } catch (_err) {
        setArchitectReceivedReview(null);
      } finally {
        setLoadingArchitectReview(false);
      }
    };

    fetchReceivedReview();
  }, [project?.project_id, project?.project_status, user?.role]);



  // MDA Timer effect
  useEffect(() => {
    if (!project?.mda_verification_deadline) return;

    const interval = setInterval(() => {
      const now = new Date();
      const deadline = new Date(project.mda_verification_deadline!);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        setTimeRemaining({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [project?.mda_verification_deadline]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(`/projects/${id}`);
      const projectData = response.data.data;
      setProject(projectData);

      // Fetch revisions
      try {
        const revisionsResponse = await axiosInstance.get(`/projects/${id}/revisions`);
        setProject((prev) => ({
          ...prev!,
          revisions: revisionsResponse.data.data || [],
        }));
      } catch (err) {
        console.error('Failed to fetch revisions');
      }

      // Fetch bids if status is construction_open or later
      if (['construction_open', 'contractor_selected', 'in_construction', 'completed'].includes(projectData.project_status)) {
        try {
          const bidsResponse = await axiosInstance.get(`/projects/${id}/bids`);
          setBids(bidsResponse.data.data || []);
        } catch (err) {
          console.error('Failed to fetch bids');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepNumber = (status: string): number => {
    const steps: { [key: string]: number } = {
      created: 1,
      matched: 2,
      architect_selected: 3,
      agreement_pending: 4,
      payment_pending: 5,
      design_in_progress: 6,
      design_delivered: 7,
      design_approved: 8,
      construction_open: 9,
      contractor_selected: 10,
      in_construction: 11,
      completed: 12,
    };
    return steps[status] || 1;
  };

  const getStatusBadgeStyles = (status: string) => {
    const styles: { [key: string]: string } = {
      created: 'bg-slate-800 text-slate-300 border-slate-600',
      matched: 'bg-indigo-950 text-indigo-300 border-indigo-800',
      architect_selected: 'bg-violet-950 text-violet-300 border-violet-800',
      agreement_pending: 'bg-amber-950 text-amber-300 border-amber-800',
      payment_pending: 'bg-orange-950 text-orange-300 border-orange-800',
      design_in_progress: 'bg-purple-950 text-purple-300 border-purple-800',
      design_delivered: 'bg-teal-950 text-teal-300 border-teal-800',
      design_approved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      construction_open: 'bg-sky-950 text-sky-300 border-sky-800',
      contractor_selected: 'bg-lime-950 text-lime-300 border-lime-800',
      in_construction: 'bg-amber-950 text-amber-300 border-amber-800',
      completed: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    };
    return styles[status] || 'bg-slate-800 text-slate-300 border-slate-600';
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      residential: 'home',
      commercial: 'corporate_fare',
      industrial: 'factory',
      landscape: 'park',
    };
    return icons[type] || 'architecture';
  };

  const handleDesignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Selecting a file re-uses the same <input>, so it has to be
    // cleared here -- otherwise choosing the same file twice in a row
    // fires no change event the second time.
    e.target.value = '';
    if (!file) return;

    setDesignFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('design_file', file);
      await axiosInstance.post(`/projects/${id}/deliver-design`, formData);
      alert('Design uploaded successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload design');
    } finally {
      setUploading(false);
      setDesignFile(null);
    }
  };

  /**
   * Download the delivered design package.
   *
   * The "Download Package" button referenced this handler but it was
   * never defined, so clicking it threw a ReferenceError and nothing
   * downloaded.
   *
   * GET /projects/{id}/design is an authenticated endpoint that streams
   * the file with a Content-Disposition header, so it cannot simply be
   * opened as a link -- the bearer token would not be sent. It is
   * fetched as a blob through the configured axios instance instead,
   * and saved via a temporary object URL.
   */
  const downloadDesign = async () => {
    try {
      const res = await axiosInstance.get(`/projects/${id}/design`, {
        responseType: 'blob',
      });

      // Prefer the filename the server chose.
      const disposition = res.headers?.['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `${project?.project_title || 'design'}`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // An error response to a blob request arrives as a Blob, so the
      // JSON message has to be read back out of it.
      let message = 'Failed to download design';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          message = JSON.parse(text)?.message || message;
        } else {
          message = err.response?.data?.message || message;
        }
      } catch {
        // Keep the default message if the body is not JSON.
      }
      alert(message);
    }
  };

  const handleStartConstruction = async () => {
    setConstructionBusy(true);
    try {
      await axiosInstance.post(`/projects/${id}/start-construction`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start construction');
    } finally {
      setConstructionBusy(false);
    }
  };

  const handleCompleteConstruction = async () => {
    setConstructionBusy(true);
    try {
      await axiosInstance.post(`/projects/${id}/complete-construction`);
      alert('Construction marked complete!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark construction complete');
    } finally {
      setConstructionBusy(false);
    }
  };

  const handleApproveDesign = async () => {
    try {
      await axiosInstance.post(`/projects/${id}/approve-design`);
      alert('Design approved! Payment released to architect.');
      setModals({ ...modals, approveDesign: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve design');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionMessage || revisionMessage.length < 20) {
      alert('Please provide at least 20 characters for revision request');
      return;
    }
    try {
      await axiosInstance.post(`/projects/${id}/request-revision`, {
        revision_message: revisionMessage,
      });
      alert('Revision request sent to architect');
      setModals({ ...modals, requestRevision: false });
      setRevisionMessage('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request revision');
    }
  };

  const handleAcceptBid = async (bidId: number) => {
    try {
      await axiosInstance.post(`/bids/${bidId}/accept`);
      alert('Bid accepted! Contractor has been selected.');
      setModals({ ...modals, acceptBid: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept bid');
    }
  };

  const handleRejectBid = async (bidId: number) => {
    try {
      await axiosInstance.post(`/bids/${bidId}/reject`);
      alert('Bid rejected');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject bid');
    }
  };

  const handlePostConstruction = async () => {
    try {
      await axiosInstance.post(`/projects/${id}/post-construction`);
      alert('Project posted for construction bidding!');
      setModals({ ...modals, postConstruction: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post construction');
    }
  };

  const openReviewModal = (revieweeType: RevieweeType) => {
    if (!project) {
      return;
    }

    if (revieweeType === 'architect') {
      // user_id is a direct FK column on the architect record AND also under .user.user_id
      const revieweeId =
        project.selected_architect?.user_id ||
        project.selected_architect?.user?.user_id;
      // full_name lives on the nested user object (not directly on the architect record)
      const revieweeName =
        project.selected_architect?.user?.full_name ||
        project.selected_architect?.full_name ||
        '';
      if (!revieweeId) {
        console.warn('[ReviewModal] Could not resolve architect user_id', project.selected_architect);
        return;
      }
      setReviewModalConfig({
        isOpen: true,
        revieweeType,
        revieweeId,
        revieweeName: revieweeName || 'Architect',
      });
      return;
    }

    // contractor
    const revieweeId =
      project.selected_contractor?.user_id ||
      project.selected_contractor?.user?.user_id;
    const revieweeName = project.selected_contractor?.company_name || 'Contractor';
    if (!revieweeId) {
      console.warn('[ReviewModal] Could not resolve contractor user_id', project.selected_contractor);
      return;
    }
    setReviewModalConfig({
      isOpen: true,
      revieweeType,
      revieweeId,
      revieweeName,
    });
  };

  const formatSubmittedDate = (value?: string): string => {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <div className="w-16 h-16 bg-indigo-950 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-indigo-400 text-3xl animate-spin">progress_activity</span>
        </div>
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading Architecture...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-300 hover:text-indigo-300 mb-8 font-semibold">
            <ArrowLeft size={20} /> Go Back
          </button>
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>{error || 'Project not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  const isClient = user?.role === 'client';
  const isArchitect = user?.role === 'architect';
  const isContractor = user?.role === 'contractor';
  const architectRecipientUserId =
    project.selected_architect?.user?.user_id || project.selected_architect?.user_id;
  const contractorRecipientUserId =
    project.selected_contractor?.user?.user_id || project.selected_contractor?.user_id;
  const clientRecipientUserId = project.client?.user_id;
  const isSelectedContractor = isContractor && !!user?.user_id && user.user_id === contractorRecipientUserId;
  const chatRecipientUserId = isClient
    ? architectRecipientUserId || contractorRecipientUserId
    : isArchitect || isContractor
    ? clientRecipientUserId
    : undefined;
  const currentStep = getStatusStepNumber(project.project_status);
  const stepLabels = [
    'Created', 'Matched', 'Architect\nSelected', 'Agreement',
    'Payment', 'Design\nIn Progress', 'Design\nDelivered', 'Design\nApproved',
    'Construction\nOpen', 'Contractor\nSelected', 'In\nConstruction', 'Completed'
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="group flex items-center gap-2 text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-indigo-950 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to list</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadgeStyles(project.project_status)}`}>
            {project.project_status.replace(/_/g, ' ')}
          </span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project ID: #{project.project_id}</p>
        </div>
      </div>

      {/* Project Header Card */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-700 p-8 sm:p-12 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950 flex items-center justify-center text-indigo-400">
                  <span className="material-symbols-outlined text-[28px] font-fill">
                    {getTypeIcon(project.project_type)}
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-100 leading-[1.1]">
                  {project.project_title}
                </h1>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="px-5 py-3 bg-slate-800/60 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">location_on</span>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                    <p className="text-sm font-bold text-slate-100">{project.location}</p>
                  </div>
                </div>
                <div className="px-5 py-3 bg-indigo-950/60 rounded-2xl border border-indigo-800/50 flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-[20px]">payments</span>
                  <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Budget</p>
                    <p className="text-sm font-black text-indigo-300">PKR {project.budget.toLocaleString()}</p>
                  </div>
                </div>
                <div className="px-5 py-3 bg-slate-800/60 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">calendar_today</span>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Created</p>
                    <p className="text-sm font-bold text-slate-100">{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[240px]">
              {chatRecipientUserId && (
                <StartChatButton
                  recipientUserId={chatRecipientUserId}
                  projectId={project.project_id}
                  label={isClient ? 'Contact Professional' : 'Message Client'}
                  variant="primary"
                  allowedRoles={['client', 'architect', 'contractor']}
                />
              )}
              {isClient && (
                <button
                  onClick={() => navigate(`/dashboard/client/create-project?edit=${id}`)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 border border-slate-600 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-400 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit Brief
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isClient && (
        <div className="bg-slate-900 rounded-[2rem] border border-slate-700 p-8 shadow-sm">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {stepLabels.map((label, index) => {
              const stepNum = index + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;

              return (
                <div key={index} className="flex flex-col items-center min-w-[80px] flex-1 relative group">
                  {index < stepLabels.length - 1 && (
                    <div className={`absolute h-[2px] top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] z-0 ${isCompleted ? 'bg-indigo-600' : 'bg-slate-700'}`} />
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black z-10 transition-all duration-500 ${
                    isCompleted ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' :
                    isCurrent ? 'bg-slate-800 text-indigo-400 border-2 border-indigo-500 shadow-xl shadow-indigo-900/30 scale-110' :
                    'bg-slate-800/60 text-slate-300 border border-slate-800'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    ) : (
                      stepNum
                    )}
                  </div>

                  <span className={`mt-3 text-[9px] font-black text-center uppercase tracking-widest transition-colors duration-500 whitespace-pre ${
                    isCurrent ? 'text-indigo-400' :
                    isCompleted ? 'text-slate-100' : 'text-slate-300'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

        {/* Project Brief */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">Project Brief</h3>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Project Description</p>
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {project.project_description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-800/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Structure Type</p>
                    <p className="text-sm font-bold text-slate-100 capitalize">{project.project_type}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-800/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Location Context</p>
                    <p className="text-sm font-bold text-slate-100">{project.location}</p>
                  </div>
                </div>

                {project.additional_notes && (
                  <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-800/40">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Additional Notes</p>
                    <p className="text-sm italic text-slate-300">"{project.additional_notes}"</p>
                  </div>
                )}
              </div>
            </div>

          {/* Revision Requests - Premium Alert */}
          {project.revision_requests && project.revision_requests.length > 0 && (
            <div className="bg-amber-950/40 rounded-[2rem] border border-amber-800/60 overflow-hidden shadow-sm shadow-amber-900/20">
              <div className="p-6 border-b border-amber-800/50 flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-400">history_edu</span>
                <h3 className="text-sm font-black text-amber-200 uppercase tracking-widest">Revision History</h3>
              </div>
              <div className="p-8 space-y-4">
                {project.revision_requests.map((rev: any, idx: number) => (
                  <div key={idx} className="p-5 bg-slate-900/80 rounded-2xl border border-amber-800/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Revision #{idx + 1}</span>
                      <span className="text-[10px] text-amber-400/90 font-bold">{new Date(rev.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">{rev.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area: Status Specific Deliverables */}
          {isClient && project.project_status === 'design_delivered' && (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-800 bg-emerald-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900/60 flex items-center justify-center text-emerald-300">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <h3 className="text-lg font-black text-emerald-200 uppercase tracking-tight">Design Ready for Review</h3>
                </div>
                <div className="px-4 py-2 bg-emerald-900/50 rounded-full text-[10px] font-black text-emerald-200 uppercase tracking-widest animate-pulse border border-emerald-700/50">
                  Action Required
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="p-8 rounded-3xl bg-slate-800/60 border border-slate-800 text-center">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Review Time Remaining</p>
                  <div className="flex justify-center gap-4">
                    {[
                      { l: 'Days', v: timeRemaining.days },
                      { l: 'Hrs', v: timeRemaining.hours },
                      { l: 'Min', v: timeRemaining.minutes }
                    ].map(t => (
                      <div key={t.l} className="w-20">
                        <div className="text-3xl font-black text-slate-100">{String(t.v).padStart(2, '0')}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={downloadDesign}
                    className="flex-1 flex items-center justify-center gap-3 p-6 bg-slate-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all shadow-xl"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Download Package
                  </button>
                  <button
                    onClick={() => setModals({ ...modals, approveDesign: true })}
                    className="flex-1 flex items-center justify-center gap-3 p-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/40"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Approve Design
                  </button>
                  <button
                    onClick={() => setModals({ ...modals, requestRevision: true })}
                    className="flex-1 flex items-center justify-center gap-3 p-6 bg-slate-800 border border-slate-600 text-slate-300 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
                  >
                    <span className="material-symbols-outlined">undo</span>
                    Request Revision
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Construction Bids Area */}
          {isClient && project.project_status === 'construction_open' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Construction Bids ({bids.length})</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Ranked by Budz Spent
                </div>
              </div>
              
              {bids.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 rounded-[2rem] border border-slate-700 border-dashed">
                  <div className="w-16 h-16 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <span className="material-symbols-outlined text-3xl">construction</span>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awaiting Bids</p>
                  <p className="text-xs text-slate-300 mt-1">Verified contractors are being notified</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {bids.map((bid, idx) => (
                    <div key={bid.bid_id} className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-black/30 transition-all group">
                      <div className="p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center justify-center text-slate-400 text-2xl font-black">
                              {bid.contractor.company_name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-100 group-hover:text-indigo-300 transition-colors cursor-pointer" 
                                  onClick={() => navigate(`/contractor/${bid.contractor.contractor_id}`)}>
                                {bid.contractor.company_name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <StarRating rating={Number(bid.contractor.average_rating || 0)} size="xs" />
                                <span className="text-[10px] font-bold text-slate-400">({bid.contractor.total_reviews} reviews)</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {idx < 3 && (
                              <div className="px-3 py-1 bg-amber-500/15 text-amber-300 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] font-fill">bolt</span>
                                Boosted
                              </div>
                            )}
                            <div className="px-3 py-1 bg-indigo-950 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-800">
                              {bid.bid_status}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-800/50">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Proposed Cost</p>
                            <p className="text-lg font-black text-indigo-400">PKR {bid.proposed_cost.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-lg font-black text-slate-100">{bid.estimated_duration} Days</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Past Wins</p>
                            <p className="text-lg font-black text-slate-100">{bid.contractor.won_bids_count}</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => { setSelectedBidId(bid.bid_id); setModals({ ...modals, acceptBid: true }); }}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                          >
                            Accept Bid
                          </button>
                          <button 
                            onClick={() => handleRejectBid(bid.bid_id)}
                            className="flex-1 py-4 bg-slate-800 border border-slate-600 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-red-500/60 hover:text-red-400 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completion banner. The actual review prompts live in the
              "Professional Reviews Section" further down -- this used
              to also have a "Leave Project Review" button with no
              onClick, which did nothing when clicked. */}
          {project.project_status === 'completed' && (
             <div className="p-8 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-900/40">
               <div className="flex items-center gap-4">
                 <span className="material-symbols-outlined text-4xl">celebration</span>
                 <div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Project Completed</h3>
                   <p className="text-indigo-100 text-sm">Congratulations on finishing your journey with ArchIntent.</p>
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Dynamic Action Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden shadow-xl shadow-black/25">
              <div className="p-8">
                {isClient && (
                  <div className="space-y-6">
                    {project.project_status === 'created' && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-indigo-950 rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="material-symbols-outlined text-indigo-400 text-3xl font-fill">hub</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-100 mb-2">Matching Architects</h4>
                        <p className="text-sm text-slate-400">Our AI is analyzing your brief to find the perfect architectural partners.</p>
                        <div className="mt-8 flex justify-center gap-1">
                          <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    )}

                    {project.project_status === 'matched' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-indigo-600 rounded-[1.5rem] text-white">
                          <h4 className="text-lg font-black mb-2">Matches Ready</h4>
                          <p className="text-indigo-100 text-xs">We've found professional architects who match your requirements.</p>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${project.project_id}/matches`)}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                        >
                          View Architects
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {project.project_status === 'architect_selected' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-amber-950/50 rounded-[1.5rem] border border-amber-800/60">
                          <h4 className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-2">Next Step</h4>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">The architect is drafting your service agreement. We'll notify you when it's ready.</p>
                        </div>
                      </div>
                    )}

                    {project.project_status === 'agreement_pending' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-indigo-950/50 rounded-[1.5rem] border border-indigo-800/60">
                          <h4 className="text-lg font-black text-indigo-200 mb-2">Legal Review</h4>
                          <p className="text-xs text-indigo-300">Please review and sign the project agreement to proceed to payment.</p>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${id}/agreement`)}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                        >
                          Review & Sign
                        </button>
                      </div>
                    )}

                    {project.project_status === 'payment_pending' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-orange-950/50 rounded-[1.5rem] border border-orange-800/60">
                          <h4 className="text-lg font-black text-orange-200 mb-2">Escrow Fund</h4>
                          <p className="text-[11px] text-orange-300 mb-4">Deposit PKR {project.budget.toLocaleString()} to begin the design phase.</p>
                          <div className="flex items-center gap-2 text-[10px] font-black text-orange-400">
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                            Secured by ArchIntent
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${id}/payment`)}
                          className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg"
                        >
                          Pay Now
                        </button>
                      </div>
                    )}

                    {project.project_status === 'design_approved' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-emerald-950/50 rounded-[1.5rem] border border-emerald-800/60">
                          <h4 className="text-lg font-black text-emerald-200 mb-2">Ready to Build?</h4>
                          <p className="text-xs text-emerald-300">Your design is approved. Now, find the best construction company.</p>
                        </div>
                        <button
                          onClick={() => setModals({ ...modals, postConstruction: true })}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                        >
                          Post Construction Job
                        </button>
                      </div>
                    )}

                    {project.project_status === 'construction_open' && (
                      <div className="p-6 bg-sky-950/50 rounded-[1.5rem] border border-sky-800/60">
                        <h4 className="text-lg font-black text-sky-200 mb-2">Reviewing Bids</h4>
                        <p className="text-xs text-sky-300">Compare the construction bids below and accept one to hire your contractor.</p>
                      </div>
                    )}

                    {project.project_status === 'contractor_selected' && (
                      <div className="p-6 bg-lime-950/50 rounded-[1.5rem] border border-lime-800/60">
                        <h4 className="text-lg font-black text-lime-200 mb-2">Contractor Hired</h4>
                        <p className="text-xs text-lime-300">
                          {project.selected_contractor?.company_name || 'Your contractor'} has been hired and will start construction shortly.
                        </p>
                      </div>
                    )}

                    {project.project_status === 'in_construction' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-amber-950/50 rounded-[1.5rem] border border-amber-800/60">
                          <h4 className="text-lg font-black text-amber-200 mb-2">Construction Underway</h4>
                          <p className="text-xs text-amber-300">
                            {project.selected_contractor?.company_name || 'Your contractor'} is building your project. There's no
                            in-app milestone tracker for this phase yet -- coordinate directly with them via chat for updates.
                            Once the work is actually finished, either of you can mark it complete.
                          </p>
                        </div>
                        <button
                          onClick={handleCompleteConstruction}
                          disabled={constructionBusy}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg"
                        >
                          {constructionBusy ? 'Submitting...' : 'Mark Project Complete'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isContractor && (
                  <div className="space-y-6">
                    {project.project_status === 'construction_open' && (
                      <div className="p-6 bg-sky-950/50 rounded-[1.5rem] border border-sky-800/60">
                        <h4 className="text-lg font-black text-sky-200 mb-2">Awaiting Client Decision</h4>
                        <p className="text-xs text-sky-300">The client is reviewing bids from you and other contractors. Check "My Bids" for your bid's status.</p>
                      </div>
                    )}

                    {project.project_status === 'contractor_selected' && isSelectedContractor && (
                      <div className="space-y-6">
                        <div className="p-6 bg-lime-950/50 rounded-[1.5rem] border border-lime-800/60">
                          <h4 className="text-lg font-black text-lime-200 mb-2">You Won This Job</h4>
                          <p className="text-xs text-lime-300">Let the client know when you're ready to break ground.</p>
                        </div>
                        <button
                          onClick={handleStartConstruction}
                          disabled={constructionBusy}
                          className="w-full py-4 bg-lime-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-lime-500 disabled:opacity-50 transition-all shadow-lg"
                        >
                          {constructionBusy ? 'Starting...' : 'Start Construction'}
                        </button>
                      </div>
                    )}

                    {project.project_status === 'contractor_selected' && !isSelectedContractor && (
                      <div className="p-6 bg-slate-800/60 rounded-[1.5rem] border border-slate-800">
                        <h4 className="text-lg font-black text-slate-200 mb-2">Bid Not Selected</h4>
                        <p className="text-xs text-slate-400">The client chose a different contractor for this project.</p>
                      </div>
                    )}

                    {project.project_status === 'in_construction' && isSelectedContractor && (
                      <div className="space-y-6">
                        <div className="p-6 bg-amber-950/50 rounded-[1.5rem] border border-amber-800/60">
                          <h4 className="text-lg font-black text-amber-200 mb-2">Construction In Progress</h4>
                          <p className="text-xs text-amber-300">
                            Coordinate with the client via chat as you work. Mark it complete once the job is finished.
                          </p>
                        </div>
                        <button
                          onClick={handleCompleteConstruction}
                          disabled={constructionBusy}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg"
                        >
                          {constructionBusy ? 'Submitting...' : 'Mark Construction Complete'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isArchitect && (
                  <div className="space-y-6">
                    {project.project_status === 'architect_selected' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-indigo-600 rounded-[1.5rem] text-white">
                          <h4 className="text-lg font-black mb-2">Project Won</h4>
                          <p className="text-indigo-100 text-xs">Congratulations! Create the service agreement to start work.</p>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${id}/agreement`)}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                        >
                          Create Agreement
                        </button>
                      </div>
                    )}

                    {['agreement_pending', 'pending_signatures'].includes(project.project_status) && (
                      <div className="space-y-6">
                        <div className="p-6 bg-amber-950/50 rounded-[1.5rem] border border-amber-800/60">
                          <h4 className="text-lg font-black text-amber-200 mb-2">Signing Phase</h4>
                          <p className="text-xs text-amber-300">Waiting for both parties to sign the agreement.</p>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${id}/agreement`)}
                          className="w-full py-4 bg-slate-800 border border-slate-600 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-400 transition-all"
                        >
                          View Agreement
                        </button>
                      </div>
                    )}

                    {project.project_status === 'design_in_progress' && (
                      <div className="space-y-6">
                        <div className="p-6 bg-violet-950/50 rounded-[1.5rem] border border-violet-800/60">
                          <h4 className="text-lg font-black text-violet-200 mb-2">Submit Design</h4>
                          <p className="text-xs text-violet-300">Once your drawings are ready, upload them for client approval.</p>
                        </div>
                        <label className={uploading ? 'block' : 'block cursor-pointer'}>
                          <div className={`p-8 border-2 border-dashed rounded-[1.5rem] text-center transition-colors group ${uploading ? 'border-slate-700 opacity-60' : 'border-slate-700 hover:border-indigo-400'}`}>
                            <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-indigo-300 mb-4 transition-colors">
                              {uploading ? 'progress_activity' : 'cloud_upload'}
                            </span>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                              {uploading ? `Uploading ${designFile?.name ?? 'file'}...` : 'Upload Final Package'}
                            </p>
                            <input type="file" className="hidden" onChange={handleDesignUpload} disabled={uploading} />
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Support Widget */}
            <div className="p-6 bg-slate-800/60 rounded-[1.5rem] border border-slate-800">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Concierge Support</h5>
              <p className="text-[11px] text-slate-500 mb-4">Need help with this phase?</p>
              <button className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                Contact Agent
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

            {/* Available as soon as the design is approved -- lets the
                client review the architect before construction even
                starts. Excludes 'completed': the fuller "Professional
                Reviews Section" below covers both architect and
                contractor once the whole project is done, so showing
                this one too would just duplicate it. Client-only: the
                backend already rejects a non-client's attempt to
                review, but showing this prompt to the architect or
                contractor themselves (previously ungated here) looked
                broken rather than simply inapplicable. */}
            {isClient && project.selected_architect && ['design_approved', 'construction_open', 'contractor_selected', 'in_construction'].includes(project.project_status) && (
              <div className="mb-8">
                {loadingReviewEligibility && !architectCanReview ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-sm text-slate-400">Checking architect review eligibility...</div>
                ) : architectCanReview?.already_reviewed && architectCanReview.review ? (
                  <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-emerald-100">Your Review for {project.selected_architect.user?.full_name || project.selected_architect.full_name || 'Architect'}</h3>
                      <span className="rounded-full bg-emerald-900/80 px-2.5 py-1 text-xs font-semibold text-emerald-200 border border-emerald-700/50">Review Submitted</span>
                    </div>
                    <StarRating rating={architectCanReview.review.rating} size="sm" />
                    {architectCanReview.review.review_title ? (
                      <p className="mt-3 font-semibold text-slate-100">{architectCanReview.review.review_title}</p>
                    ) : null}
                    {architectCanReview.review.review_text ? (
                      <p className="mt-2 text-sm text-slate-300">{architectCanReview.review.review_text}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-400">Submitted on {formatSubmittedDate(architectCanReview.review.created_at)}</p>
                  </div>
                ) : architectCanReview?.can_review ? (
                  <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-amber-100">Rate Your Architect</h3>
                        <p className="mt-1 text-sm text-amber-200/90">How was your experience with {project.selected_architect.user?.full_name || project.selected_architect.full_name || 'your architect'}'s design work?</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openReviewModal('architect')}
                        className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
                      >
                        Leave a Review
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
                )}

          {/* Professional Reviews Section */}
          {isClient && project.project_status === 'completed' && (
            <div className="space-y-6">
              {/* Architect Review */}
              {project.selected_architect && (
                <div className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden shadow-sm">
                   <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-indigo-300">architecture</span>
                       <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Architectural Service Review</h3>
                     </div>
                   </div>
                   <div className="p-8">
                     {loadingReviewEligibility && !architectCanReview ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                     ) : architectCanReview?.already_reviewed ? (
                        <div className="bg-indigo-950/50 rounded-2xl p-6 border border-indigo-800/60">
                          <div className="flex items-center gap-2 mb-4">
                            <StarRating rating={architectCanReview.review?.rating || 0} size="sm" />
                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-auto">Submitted</span>
                          </div>
                          <p className="text-sm text-slate-200 font-medium italic">"{architectCanReview.review?.review_text}"</p>
                        </div>
                     ) : architectCanReview?.can_review ? (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 mb-6">How would you rate {project.selected_architect.full_name}'s design work?</p>
                          <button 
                            onClick={() => openReviewModal('architect')}
                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                          >
                            Write Review
                          </button>
                        </div>
                     ) : (
                        <p className="text-xs text-slate-400 text-center italic">{architectCanReview?.reason || 'Review phase not yet available'}</p>
                     )}
                   </div>
                </div>
              )}

              {/* Contractor Review */}
              {project.selected_contractor && (
                <div className="bg-slate-900 rounded-[2rem] border border-slate-700 overflow-hidden shadow-sm">
                   <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-emerald-600">construction</span>
                       <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Contractor Execution Review</h3>
                     </div>
                   </div>
                   <div className="p-8">
                     {loadingReviewEligibility && !contractorCanReview ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                     ) : contractorCanReview?.already_reviewed ? (
                        <div className="bg-emerald-950/50 rounded-2xl p-6 border border-emerald-800/60">
                          <div className="flex items-center gap-2 mb-4">
                            <StarRating rating={contractorCanReview.review?.rating || 0} size="sm" />
                            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest ml-auto">Submitted</span>
                          </div>
                          <p className="text-sm text-slate-200 font-medium italic">"{contractorCanReview.review?.review_text}"</p>
                        </div>
                     ) : contractorCanReview?.can_review ? (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 mb-6">How would you rate {project.selected_contractor.company_name}'s construction work?</p>
                          <button 
                            onClick={() => openReviewModal('contractor')}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                          >
                            Write Review
                          </button>
                        </div>
                     ) : (
                        <p className="text-xs text-slate-400 text-center italic">{contractorCanReview?.reason || 'Review phase not yet available'}</p>
                     )}
                   </div>
                </div>
              )}
            </div>
          )}


      {/* PREMIUM MODALS */}

      {/* Approve Design Modal */}
      {modals.approveDesign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-800">
                <span className="material-symbols-outlined text-4xl font-fill">verified</span>
              </div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mb-4">Approve Design?</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-10">
                This will finalize the design phase and release <span className="font-bold text-slate-100">PKR {project!.budget.toLocaleString()}</span> from escrow to the architect.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleApproveDesign}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/40"
                >
                  Confirm & Release Funds
                </button>
                <button
                  onClick={() => setModals({ ...modals, approveDesign: false })}
                  className="w-full py-5 bg-slate-900/80 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-slate-100 transition-all border border-slate-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {modals.requestRevision && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-10">
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight mb-6">Request Revision</h2>
              <textarea
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
                placeholder="Details of required changes..."
                className="w-full p-6 bg-slate-900 border border-slate-600 rounded-2xl focus:ring-4 focus:ring-indigo-900/50 focus:border-indigo-500 text-slate-100 placeholder:text-slate-500 transition-all text-sm mb-6 outline-none"
                rows={5}
              />
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRequestRevision}
                  disabled={revisionMessage.length < 20}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 transition-all shadow-xl"
                >
                  Submit Revision Request
                </button>
                <button
                  onClick={() => { setModals({ ...modals, requestRevision: false }); setRevisionMessage(''); }}
                  className="w-full py-5 bg-slate-900 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-100 border border-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Bid Modal */}
      {modals.acceptBid && selectedBidId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-indigo-950 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-800">
                <span className="material-symbols-outlined text-4xl font-fill">handshake</span>
              </div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight mb-4">Accept This Bid?</h2>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed">
                Selecting this contractor will officially award them the project and notify other bidders of your decision.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleAcceptBid(selectedBidId!)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl"
                >
                  Award Project
                </button>
                <button
                  onClick={() => setModals({ ...modals, acceptBid: false })}
                  className="w-full py-5 bg-slate-900 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-100 border border-slate-700 transition-all"
                >
                  Not Yet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Construction Modal */}
      {modals.postConstruction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-slate-700 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600">
                <span className="material-symbols-outlined text-4xl">construction</span>
              </div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight mb-4">Start Construction Phase?</h2>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed">
                This will open your approved design to our verified contractor network for competitive bidding.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePostConstruction}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl"
                >
                  Post to Network
                </button>
                <button
                  onClick={() => setModals({ ...modals, postConstruction: false })}
                  className="w-full py-5 bg-slate-900 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-100 border border-slate-700 transition-all"
                >
                  Stay in Design
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewModalConfig?.isOpen && project && (
        <LeaveReviewModal
          isOpen={reviewModalConfig.isOpen}
          onClose={() => setReviewModalConfig(null)}
          projectId={project.project_id}
          revieweeId={reviewModalConfig.revieweeId}
          revieweeType={reviewModalConfig.revieweeType}
          revieweeName={reviewModalConfig.revieweeName}
          onSuccess={(review: ReviewItem) => {
            const payload: CanReviewResponse = {
              can_review: false,
              reason: 'Already reviewed',
              already_reviewed: true,
              review,
            };
            if (reviewModalConfig.revieweeType === 'architect') setArchitectCanReview(payload);
            else setContractorCanReview(payload);
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
