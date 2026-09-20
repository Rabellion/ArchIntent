import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { 
  Plus, Search, Grid, List, MoreVertical, Edit, Trash2, Eye, AlertCircle, 
  ChevronDown, X, Calendar, MapPin, DollarSign
} from 'lucide-react';

interface Project {
  project_id: number;
  project_title: string;
  project_type: string;
  budget: number;
  location: string;
  brief_text: string;
  project_status: string;
  created_at: string;
}

type ViewType = 'card' | 'table';
type SortType = 'newest' | 'oldest' | 'budget-high' | 'budget-low';
type StatusFilterType = 'all' | 'active' | 'completed' | 'pending-action';

const MyProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [viewType, setViewType] = useState<ViewType>(() => {
    return (localStorage.getItem('myProjectsView') as ViewType) || 'card';
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; projectId?: number; title?: string }>({ show: false });
  const [deleting, setDeleting] = useState(false);

  // Open menu tracking
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'My Projects — ArchIntent';
    fetchProjects();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [projects, searchTerm, statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    localStorage.setItem('myProjectsView', viewType);
  }, [viewType]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.project_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(p =>
        p.project_status !== 'created' && p.project_status !== 'completed'
      );
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(p => p.project_status === 'completed');
    } else if (statusFilter === 'pending-action') {
      filtered = filtered.filter(p =>
        ['matched', 'agreement_pending', 'payment_pending', 'design_delivered', 'construction_open'].includes(p.project_status)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.project_type === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'budget-high':
        filtered.sort((a, b) => b.budget - a.budget);
        break;
      case 'budget-low':
        filtered.sort((a, b) => a.budget - b.budget);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredProjects(filtered);
    setCurrentPage(1);
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({ show: true, projectId: project.project_id, title: project.project_title });
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return;

    setDeleting(true);
    try {
      await axiosInstance.delete(`/projects/${deleteModal.projectId}`);
      setProjects(projects.filter(p => p.project_id !== deleteModal.projectId));
      setDeleteModal({ show: false });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusWorkflowStep = (status: string): number => {
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

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      created: 'bg-slate-800 text-slate-300 border border-slate-600',
      matched: 'bg-blue-950/60 text-blue-300 border border-blue-800/50',
      architect_selected: 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/50',
      agreement_pending: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
      payment_pending: 'bg-orange-950/60 text-orange-300 border border-orange-800/50',
      design_in_progress: 'bg-purple-950/60 text-purple-300 border border-purple-800/50',
      design_delivered: 'bg-teal-950/60 text-teal-300 border border-teal-800/50',
      design_approved: 'bg-green-950/60 text-green-300 border border-green-800/50',
      construction_open: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50',
      contractor_selected: 'bg-lime-950/60 text-lime-300 border border-lime-800/50',
      in_construction: 'bg-amber-950/60 text-amber-300 border border-amber-800/50',
      completed: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50',
    };
    return colors[status] || 'bg-slate-800 text-slate-300 border border-slate-600';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      residential: 'bg-blue-950/50 text-blue-300 border border-blue-800/40',
      commercial: 'bg-purple-950/50 text-purple-300 border border-purple-800/40',
      industrial: 'bg-rose-950/50 text-rose-300 border border-rose-800/40',
      landscape: 'bg-green-950/50 text-green-300 border border-green-800/40',
    };
    return colors[type.toLowerCase()] || 'bg-slate-800 text-slate-300 border border-slate-600';
  };

  const getProjectActionButton = (project: Project) => {
    switch (project.project_status) {
      case 'created':
        return { label: 'Edit', to: `/dashboard/client/create-project?edit=${project.project_id}` };
      case 'matched':
        return { label: 'View Matches', to: `/project/${project.project_id}/matches` };
      case 'architect_selected':
        return { label: 'View Project', to: `/project/${project.project_id}` };
      case 'agreement_pending':
        return { label: 'Sign Agreement', to: `/project/${project.project_id}/agreement` };
      case 'payment_pending':
        return { label: 'Make Payment', to: `/project/${project.project_id}/payment` };
      case 'design_delivered':
        return { label: 'Review Design', to: `/project/${project.project_id}` };
      case 'construction_open':
        return { label: 'View Bids', to: `/project/${project.project_id}` };
      default:
        return { label: 'View', to: `/project/${project.project_id}` };
    }
  };

  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredProjects.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-indigo-500"></div>
            <p className="text-slate-400 mt-4">Loading your projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-100">My Projects</h1>
            <p className="text-slate-400 mt-1">Manage and track all your projects</p>
          </div>
          <Link
            to="/dashboard/client/create-project"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-500 transition font-semibold"
          >
            <Plus size={20} />
            New Project
          </Link>
        </div>

        {error && (
          <div className="mb-8 bg-rose-950/40 border border-rose-800/60 text-rose-200 px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchProjects}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded text-sm font-semibold transition shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* No projects state */}
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-700 rounded-xl">
            <Plus className="mx-auto mb-4 text-slate-500" size={64} />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">You haven't created any projects yet</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">Start creating your first project to find the perfect architect</p>
            <Link
              to="/dashboard/client/create-project"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-500 transition font-semibold"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/20 p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-slate-800 text-slate-100 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="pending-action">Pending Action</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={20} />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-slate-800 text-slate-100 cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="landscape">Landscape</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={20} />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-slate-800 text-slate-100 cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="budget-high">Budget: High-Low</option>
                    <option value="budget-low">Budget: Low-High</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={20} />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 border border-slate-600 rounded-lg p-2 bg-slate-800">
                  <button
                    onClick={() => setViewType('card')}
                    className={`flex-1 p-2 rounded transition ${
                      viewType === 'card'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                    title="Card View"
                  >
                    <Grid size={18} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => setViewType('table')}
                    className={`flex-1 p-2 rounded transition ${
                      viewType === 'table'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                    title="Table View"
                  >
                    <List size={18} className="mx-auto" />
                  </button>
                </div>
              </div>

              {/* Clear filters button (show if any filter is active) */}
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSortBy('newest');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* No results state */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-700 rounded-xl">
                <Search className="mx-auto mb-4 text-slate-500" size={48} />
                <h2 className="text-2xl font-bold text-slate-100 mb-2">No projects match your filters</h2>
                <p className="text-slate-400 mb-8">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSortBy('newest');
                  }}
                  className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500 transition font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* Results info */}
                <div className="text-sm text-slate-400 mb-4">
                  Showing {startIndex}-{endIndex} of {filteredProjects.length} projects
                </div>

                {/* Card View */}
                {viewType === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedProjects.map((project) => {
                      const step = getStatusWorkflowStep(project.project_status);
                      const action = getProjectActionButton(project);
                      const brief = project.brief_text || '';
                      const briefExcerpt = brief.substring(0, 80) + (brief.length > 80 ? '...' : '');

                      return (
                        <div key={project.project_id} className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/10 hover:border-slate-600 transition p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="font-bold text-slate-100 text-lg flex-1 pr-2">{project.project_title}</h3>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === project.project_id ? null : project.project_id)}
                                className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                                aria-expanded={openMenuId === project.project_id}
                                aria-label="Project actions"
                              >
                                <MoreVertical size={18} />
                              </button>

                              {/* Dropdown Menu */}
                              {openMenuId === project.project_id && (
                                <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                                  <Link
                                    to={`/project/${project.project_id}`}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    <Eye size={16} /> View Details
                                  </Link>
                                  {project.project_status === 'created' && (
                                    <Link
                                      to={`/dashboard/client/create-project?edit=${project.project_id}`}
                                      className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                                      onClick={() => setOpenMenuId(null)}
                                    >
                                      <Edit size={16} /> Edit
                                    </Link>
                                  )}
                                  {project.project_status === 'created' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeleteClick(project);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-950/40 transition"
                                    >
                                      <Trash2 size={16} /> Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Type and Status Badges */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(project.project_type)}`}>
                              {project.project_type.charAt(0).toUpperCase() + project.project_type.slice(1)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(project.project_status)}`}>
                              {project.project_status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Location and Budget */}
                          <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              {project.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign size={14} />
                              PKR {project.budget.toLocaleString('en-PK')}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-500">Workflow Progress</span>
                              <span className="text-xs font-bold text-indigo-400">Step {step} of 12</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full transition-all"
                                style={{ width: `${(step / 12) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Brief excerpt */}
                          <p className="text-sm text-slate-400 mb-4 line-clamp-2">{briefExcerpt}</p>

                          {/* Created date */}
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                            <Calendar size={14} />
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>

                          {/* Primary action button */}
                          <Link
                            to={action.to}
                            className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 transition font-semibold text-sm mb-2"
                          >
                            {action.label}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table View */}
                {viewType === 'table' && (
                  /* overflow-x-auto so all 7 columns (Location/Status/
                     Created/Actions especially) scroll into reach on
                     mobile instead of overflow-hidden clipping them. */
                  <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/10 overflow-x-auto mb-8">
                    <table className="w-full min-w-[960px]">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/80">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Budget</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {paginatedProjects.map((project) => {
                          const action = getProjectActionButton(project);

                          return (
                            <tr key={project.project_id} className="hover:bg-slate-800/50 transition">
                              <td className="px-6 py-4 text-sm font-medium text-slate-100">{project.project_title}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(project.project_type)}`}>
                                  {project.project_type.charAt(0).toUpperCase() + project.project_type.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-indigo-400">
                                PKR {project.budget.toLocaleString('en-PK')}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">{project.location}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(project.project_status)}`}>
                                  {project.project_status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">
                                {new Date(project.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 relative">
                                  <Link
                                    to={action.to}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm"
                                  >
                                    {action.label}
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => setOpenMenuId(openMenuId === project.project_id ? null : project.project_id)}
                                    className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                                    aria-label="Row actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {openMenuId === project.project_id && (
                                    <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                                      <Link
                                        to={`/project/${project.project_id}`}
                                        className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                                        onClick={() => setOpenMenuId(null)}
                                      >
                                        <Eye size={16} /> View Details
                                      </Link>
                                      {project.project_status === 'created' && (
                                        <Link
                                          to={`/dashboard/client/create-project?edit=${project.project_id}`}
                                          className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                                          onClick={() => setOpenMenuId(null)}
                                        >
                                          <Edit size={16} /> Edit
                                        </Link>
                                      )}
                                      {project.project_status === 'created' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleDeleteClick(project);
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-950/40 transition"
                                        >
                                          <Trash2 size={16} /> Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        type="button"
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-600 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Delete Project?</h2>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-200">"{deleteModal.title}"</span>? This cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ show: false })}
                  className="flex-1 px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-800 transition font-semibold disabled:opacity-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition font-semibold disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProjects;
