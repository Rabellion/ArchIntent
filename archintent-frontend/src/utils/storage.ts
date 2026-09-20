/**
 * Storage URL helper
 * Generates proper URLs for accessing stored files
 */

export const getStorageUrl = (path: string): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const baseUrl = apiUrl.replace('/api', '');
  return `${baseUrl}/api/storage/${path}`;
};

export const resolveImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}/api/storage/${path.replace(/^\/+/, '')}`;
};

export const getPortfolioImageUrl = (portfolioId: number, imagePath: string): string => {
  return getStorageUrl(`portfolios/${portfolioId}/${imagePath}`);
};

export const getContractorPortfolioImageUrl = (portfolioId: number, imagePath: string): string => {
  return getStorageUrl(`contractor_portfolios/${portfolioId}/${imagePath}`);
};

export const getContractorProjectImageUrl = (projectId: number, imagePath: string): string => {
  return getStorageUrl(`contractor_projects/${projectId}/${imagePath}`);
};

export const getVerificationDocumentUrl = (architectId: number, docName: string): string => {
  return getStorageUrl(`verifications/${docName}`);
};

export const getContractorVerificationDocumentUrl = (docName: string): string => {
  return getStorageUrl(`verifications/contractors/${docName}`);
};
