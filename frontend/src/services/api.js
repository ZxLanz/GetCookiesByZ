import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors & unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // ✅ FIX: Don't redirect if error is from login/register endpoints
    // These endpoints are EXPECTED to return 401 for wrong credentials
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    
    // Only redirect to login page if:
    // 1. Response is 401 (Unauthorized)
    // 2. NOT from login/register endpoint (means token expired/invalid)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    
    // Re-throw error so it can be handled by the caller
    return Promise.reject(error);
  }
);

export default api;