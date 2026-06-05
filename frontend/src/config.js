// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // If running in browser, use the hostname (works for both localhost and IP)
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8080/api`;
  }
  // Fallback for server-side rendering
  return 'http://localhost:8080/api';
};

export const API_BASE_URL = getApiBaseUrl();

