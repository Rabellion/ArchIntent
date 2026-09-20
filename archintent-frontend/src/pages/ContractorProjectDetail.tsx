import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import axiosInstance from '../api/axios';
import { resolveImageUrl } from '../utils/storage';
import StarRating from '../components/reviews/StarRating';

type ContractorProjectResponse = {
  project: {
    contractor_project_id: number;
    project_ref: string;
    project_title: string;
    project_description?: string;
    project_type?: string;
    location?: string;
    area_sqft?: number;
    completion_date?: string;
    project_value_pkr?: number;
    duration_days?: number;
    client_feedback?: string;
    images: Array<{ image_id: number; image_url: string; caption?: string }>;
    cover_image?: { image_id: number; image_url: string };
  };
  contractor: {
    contractor_id: number;
    company_name: string;
    profile_image?: string;
    average_rating?: number;
    total_reviews?: number;
  };
};

export default function ContractorProjectDetail() {
  const { projectRef } = useParams<{ projectRef: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ContractorProjectResponse | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!projectRef) return;
      setLoading(true);
      setError('');
      try {
        const res = await axiosInstance.get(`/contractor/projects/${projectRef}`);
        setData(res.data?.data || null);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load contractor project');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectRef]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading project...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/architects')} className="text-indigo-600 hover:text-indigo-700 font-medium mb-6">
            Back to Browse
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">{error || 'Project not found'}</div>
        </div>
      </div>
    );
  }

  const project = data.project;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-700 font-medium">
            Back
          </button>
          <span className="font-mono text-sm text-gray-600">{project.project_ref}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,280px]">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="aspect-[16/8] bg-gray-200">
              {(project.cover_image?.image_url || project.images?.[0]?.image_url) && (
                <img
                  src={resolveImageUrl(project.cover_image?.image_url || project.images[0].image_url)}
                  alt={project.project_title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.project_title}</h1>
                <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{project.project_type || 'Project'}</span>
              </div>
              <p className="mb-3 text-gray-600">by {data.contractor.company_name}</p>
              <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-700">
                <span>Location: {project.location || 'N/A'}</span>
                <span>Area: {project.area_sqft ? `${project.area_sqft.toLocaleString()} sqft` : 'N/A'}</span>
                <span>Completion: {project.completion_date ? new Date(project.completion_date).toLocaleDateString() : 'N/A'}</span>
                <span>Duration: {project.duration_days ? `${project.duration_days} days` : 'N/A'}</span>
                <span>Value: {project.project_value_pkr ? `PKR ${Number(project.project_value_pkr).toLocaleString('en-PK')}` : 'N/A'}</span>
              </div>
              <p className="leading-relaxed text-gray-800">{project.project_description || 'No description provided.'}</p>
              {project.client_feedback && <p className="mt-4 text-sm italic text-gray-600">"{project.client_feedback}"</p>}
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 shadow">
            <p className="text-sm font-semibold text-gray-500">Contractor</p>
            <div className="mt-3 flex items-center gap-3">
              {data.contractor.profile_image ? (
                <img
                  src={resolveImageUrl(data.contractor.profile_image)}
                  alt={data.contractor.company_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                  {data.contractor.company_name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{data.contractor.company_name}</p>
                <p className="text-xs text-gray-500">Public profile rating</p>
              </div>
            </div>
            {Number(data.contractor.total_reviews || 0) > 0 ? (
              <div className="mt-4">
                <StarRating rating={Number(data.contractor.average_rating || 0)} size="sm" />
                <p className="mt-1 text-xs text-gray-600">({data.contractor.total_reviews} reviews)</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No reviews yet</p>
            )}
          </aside>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Project Gallery</h2>
          {!project.images?.length ? (
            <p className="text-gray-600">No images uploaded for this project.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.images.map((img) => (
                <button
                  key={img.image_id}
                  onClick={() => setLightboxImage(resolveImageUrl(img.image_url))}
                  className="aspect-square overflow-hidden rounded-lg border border-gray-200"
                >
                  <img src={resolveImageUrl(img.image_url)} alt={img.caption || project.project_title} className="w-full h-full object-cover hover:scale-105 transition" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute right-4 top-4 text-white" onClick={() => setLightboxImage(null)}>
            <X size={24} />
          </button>
          <img src={lightboxImage} alt="preview" className="max-w-[90vw] max-h-[85vh] object-contain" />
        </div>
      )}
    </div>
  );
}
