import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://trangaapi.tjcs.io',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Global timeout
});

// Auth interceptor if needed (add if not present)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Adjust if using different storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const useApi = async (url, method = 'GET', data = null) => {
  try {
    const response = await api[method.toLowerCase()](url, data);
    return response.data;
  } catch (error) {
    console.error(`API error for ${url}:`, error);
    if (error.response?.status === 401) {
      // Handle auth, e.g., redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
};

// Export apiClient as a function that returns the api instance (matches SearchContext usage)
export const apiClient = () => api;

// Enhanced getCoverAsBlob with proper blob handling
export const getCoverAsBlob = async (mangaId, size = 'Original') => {
  try {
    const response = await api.get(`/v2/Manga/${mangaId}/Cover/${size}`, { 
      responseType: 'blob',
      timeout: 45000 // Increased for slow covers
    });
    const blob = response.data;
    console.log('Raw blob from API:', { type: blob.type, size: blob.size, isBlob: blob instanceof Blob });
    if (blob && blob.type && blob.type.startsWith('image/')) {
      return blob;
    } else if (blob) {
      // Fallback: If not Blob (e.g., buffer), wrap it
      return new Blob([blob], { type: 'image/jpeg' }); // Default to jpeg
    }
    throw new Error('Invalid cover response: No data');
  } catch (error) {
    console.error(`Cover fetch error for ${mangaId}:`, error);
    throw error;
  }
};

export const getDownloadedChaptersCount = async (mangaId) => {
  try {
    const response = await fetch(`/v2/Manga/${mangaId}/Chapters/Downloaded`);
    if (!response.ok) throw new Error('Failed to fetch downloaded chapters');
    const data = await response.json();
    return data.length || 0;
  } catch (error) {
    console.error('Error fetching downloaded chapters:', error);
    return 0;
  }
};

export const getTotalChaptersCount = async (mangaId) => {
  try {
    const response = await fetch(`/v2/Manga/${mangaId}/Chapters`);
    if (!response.ok) throw new Error('Failed to fetch total chapters');
    const data = await response.json();
    return data.length || 0;
  } catch (error) {
    console.error('Error fetching total chapters:', error);
    return 0;
  }
};

export default useApi;