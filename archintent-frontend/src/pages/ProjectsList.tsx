import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';

interface Project {
  project_id: number;
  project_title: string;
  project_type: string;
  budget: number;
  project_status: string;
  created_at: string;
}

const ProjectsList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<'table' | 'card'>('card');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    const styles: { [key: string]: string } = {
      created: 'bg-slate-100 text-slate-600 border-slate-200',
      matched: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      architect_selected: 'bg-violet-50 text-violet-700 border-violet-100',
      agreement_pending: 'bg-amber-50 text-amber-700 border-amber-100',
      payment_pending: 'bg-orange-50 text-orange-700 border-orange-100',
      design_in_progress: 'bg-purple-50 text-purple-700 border-purple-100',
      design_delivered: 'bg-teal-50 text-teal-700 border-teal-100',
      design_approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      construction_open: 'bg-sky-50 text-sky-700 border-sky-100',
      contractor_selected: 'bg-lime-50 text-lime-700 border-lime-100',
      in_construction: 'bg-amber-50 text-amber-700 border-amber-100',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
    return styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
            <div className="h-4 bg-slate-100 rounded w-32"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1 font-medium">Explore and manage {projects.length} ongoing architectural projects.</p>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setViewType('card')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              viewType === 'card' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            Grid
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              viewType === 'table' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">list</span>
            Table
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-rose-600">error</span>
          </div>
          <p className="text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 border-dashed p-20 text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-indigo-600 text-5xl font-fill">architecture</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">No projects found</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">Get started by creating your first architectural masterpiece.</p>
          <Link
            to="/dashboard/client/create-project"
            className="mt-8 inline-flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
          >
            Create First Project
            <span className="material-symbols-outlined">add</span>
          </Link>
        </div>
      ) : viewType === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.project_id}
              to={`/project/${project.project_id}`}
              className="group bg-white rounded-[2rem] border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-600 transition-colors">
                    {project.project_type.toLowerCase().includes('residential') ? 'home' : 
                     project.project_type.toLowerCase().includes('commercial') ? 'corporate_fare' : 'architecture'}
                  </span>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadgeStyles(project.project_status)}`}>
                  {project.project_status.replace(/_/g, ' ')}
                </span>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {project.project_title}
              </h3>
              <p className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">{project.project_type}</p>

              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Budget</p>
                  <p className="text-lg font-black text-indigo-600">
                    <span className="text-xs font-bold mr-1">PKR</span>
                    {project.budget.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(project.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map((project) => (
                <tr key={project.project_id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">
                          {project.project_type.toLowerCase().includes('residential') ? 'home' : 'architecture'}
                        </span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{project.project_title}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{project.project_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-900">
                      <span className="text-[10px] text-slate-400 mr-1">PKR</span>
                      {project.budget.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadgeStyles(project.project_status)}`}>
                      {project.project_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link
                      to={`/project/${project.project_id}`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;

