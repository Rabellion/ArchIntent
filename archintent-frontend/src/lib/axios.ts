import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  // Do not set Content-Type here — axios sets application/json for plain objects;
  // a default json Content-Type breaks multipart FormData (Laravel never sees files/fields).
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof (h as { delete?: (k: string) => void }).delete === 'function') {
      ;(h as { delete: (k: string) => void }).delete('Content-Type')
      ;(h as { delete: (k: string) => void }).delete('content-type')
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type']
      delete (config.headers as Record<string, unknown>)['content-type']
    }
  }

  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const socketId = (window as any).Echo?.socketId?.();
  if (socketId) {
    config.headers['X-Socket-Id'] = socketId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      console.error('Forbidden:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;
