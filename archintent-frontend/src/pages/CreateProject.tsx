import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axios';

interface ProjectFormData {
  project_title: string;
  project_type: string;
  location: string;
  budget: string;
  brief_text: string;
}

interface FormErrors {
  project_title?: string;
  project_type?: string;
  location?: string;
  budget?: string;
  brief_text?: string;
}

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [formData, setFormData] = useState<ProjectFormData>({
    project_title: '',
    project_type: '',
    location: '',
    budget: '',
    brief_text: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    document.title = isEditMode ? 'Edit Project — ArchIntent' : 'Start Your Project — ArchIntent';
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode && editId) {
      fetchProject();
    }
  }, [editId, isEditMode]);

  const fetchProject = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${editId}`);
      const project = response.data.data;
      setFormData({
        project_title: project.project_title,
        project_type: project.project_type,
        location: project.location,
        budget: project.budget.toString(),
        brief_text: project.brief_text,
      });
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const projectTypes = [
    { value: 'residential', label: 'Residential', icon: 'home' },
    { value: 'commercial', label: 'Commercial', icon: 'corporate_fare' },
    { value: 'industrial', label: 'Industrial', icon: 'factory' },
    { value: 'landscape', label: 'Landscape', icon: 'park' },
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.project_title || formData.project_title.length < 5) newErrors.project_title = 'Title must be at least 5 characters';
    if (!formData.project_type) newErrors.project_type = 'Please select a project type';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.budget || isNaN(Number(formData.budget)) || Number(formData.budget) < 10000) newErrors.budget = 'Min budget is PKR 10,000';
    if (!formData.brief_text || formData.brief_text.length < 100) newErrors.brief_text = 'Description needs at least 100 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setApiError('');

    try {
      const payload = { ...formData, budget: Number(formData.budget) };
      let projectId: number;

      if (isEditMode && editId) {
        const response = await axiosInstance.put(`/projects/${editId}`, payload);
        projectId = response.data.data.project_id || Number(editId);
      } else {
        const response = await axiosInstance.post('/projects', payload);
        projectId = response.data.data.project_id;
      }

      setShowSuccess(true);
      setTimeout(() => navigate(`/project/${projectId}`), 1500);
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[40vh]">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Preparing your workspace...</p>
      </div>
    );
  }

  const inputBase =
    'w-full rounded-2xl border transition-all font-medium text-slate-100 placeholder:text-slate-500 bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
  const inputNormal = 'border-slate-600';
  const inputError = 'border-rose-500 ring-2 ring-rose-500/25';

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-2 sm:px-4 text-slate-100">
      {/* Back Link */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors mb-8 group"
        aria-label="Go back"
      >
        <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform" aria-hidden>
          arrow_back
        </span>
        <span className="text-xs font-bold uppercase tracking-widest">Go Back</span>
      </button>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          {isEditMode ? 'Refine Project' : 'Share Your Vision'}
        </h1>
        <p className="text-slate-400 mt-2 text-base sm:text-lg">
          {isEditMode ? 'Update your requirements to get better matches.' : 'Define your architectural intent to find the perfect professional.'}
        </p>
      </div>

      {/* Success/Error Alerts */}
      {showSuccess && (
        <div
          className="mb-8 bg-emerald-950/50 border border-emerald-700/50 text-emerald-100 p-4 rounded-2xl flex items-center gap-3"
          role="status"
        >
          <span className="material-symbols-outlined text-emerald-400 shrink-0" aria-hidden>
            check_circle
          </span>
          <span className="font-bold text-sm sm:text-base">
            {isEditMode ? 'Changes saved successfully!' : 'Project created! Matching architects...'}
          </span>
        </div>
      )}

      {apiError && (
        <div className="mb-8 bg-rose-950/40 border border-rose-700/50 text-rose-100 p-4 rounded-2xl flex items-center gap-3" role="alert">
          <span className="material-symbols-outlined text-rose-400 shrink-0" aria-hidden>
            error
          </span>
          <span className="font-medium text-sm">{apiError}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-10 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-10 shadow-xl shadow-black/20"
      >
        {/* Project Title */}
        <div className="space-y-3">
          <label htmlFor="project_title" className="text-sm font-black text-slate-300 uppercase tracking-widest block">
            Project Title
          </label>
          <input
            id="project_title"
            type="text"
            name="project_title"
            value={formData.project_title}
            onChange={handleInputChange}
            placeholder="e.g. Modern Coastal Villa in Karachi"
            className={`${inputBase} px-5 py-4 ${errors.project_title ? inputError : inputNormal}`}
          />
          {errors.project_title && <p className="text-rose-400 text-[10px] font-bold uppercase">{errors.project_title}</p>}
        </div>

        {/* Project Type Grid */}
        <div className="space-y-3">
          <span className="text-sm font-black text-slate-300 uppercase tracking-widest block">Project Category</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Project category">
            {projectTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(p => ({ ...p, project_type: type.value }))}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                  formData.project_type === type.value
                    ? 'border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                }`}
                aria-pressed={formData.project_type === type.value}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${formData.project_type === type.value ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                  aria-hidden
                >
                  {type.icon}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-tighter ${formData.project_type === type.value ? 'text-indigo-200' : 'text-slate-400'}`}
                >
                  {type.label}
                </span>
              </button>
            ))}
          </div>
          {errors.project_type && <p className="text-rose-400 text-[10px] font-bold uppercase">{errors.project_type}</p>}
        </div>

        {/* Location & Budget Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label htmlFor="location" className="text-sm font-black text-slate-300 uppercase tracking-widest block">
              Location
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden>
                location_on
              </span>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Area"
                className={`${inputBase} pl-12 pr-5 py-4 ${errors.location ? inputError : inputNormal}`}
              />
            </div>
            {errors.location && <p className="text-rose-400 text-[10px] font-bold uppercase">{errors.location}</p>}
          </div>

          <div className="space-y-3">
            <label htmlFor="budget" className="text-sm font-black text-slate-300 uppercase tracking-widest block">
              Budget (PKR)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden>
                payments
              </span>
              <input
                id="budget"
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                placeholder="Amount"
                className={`${inputBase} pl-12 pr-5 py-4 ${errors.budget ? inputError : inputNormal}`}
              />
            </div>
            {errors.budget && <p className="text-rose-400 text-[10px] font-bold uppercase">{errors.budget}</p>}
          </div>
        </div>

        {/* Project Brief */}
        <div className="space-y-3">
          <label htmlFor="brief_text" className="text-sm font-black text-slate-300 uppercase tracking-widest block">
            Project Description
          </label>
          <div className="relative">
            <textarea
              id="brief_text"
              name="brief_text"
              value={formData.brief_text}
              onChange={handleInputChange}
              placeholder="Tell us about your requirements, style preferences, and goals..."
              rows={8}
              className={`${inputBase} px-5 py-4 pb-12 resize-none ${errors.brief_text ? inputError : inputNormal}`}
              aria-describedby="brief_char_hint"
            />
            <div
              id="brief_char_hint"
              className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-700 px-2 py-1 rounded-lg text-[9px] font-black text-slate-400"
            >
              {formData.brief_text.length} / 100 MIN
            </div>
          </div>
          {errors.brief_text && <p className="text-rose-400 text-[10px] font-bold uppercase">{errors.brief_text}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-950/40 disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isEditMode ? 'Update Project' : 'Find Best Architects'}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProject;
