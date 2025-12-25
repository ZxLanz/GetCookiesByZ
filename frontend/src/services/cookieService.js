import api from './api';

export const cookieService = {
  // Get all cookies
  getAll: async () => {
    const response = await api.get('/cookies');
    const data = response.data;
    // Handle different response formats
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.cookies)) return data.cookies;
    console.error('Unexpected response format:', data);
    return [];
  },

  // Get cookies by store
  getByStore: async (storeId) => {
    const response = await api.get(`/cookies/store/${storeId}`);
    const data = response.data;
    // Handle different response formats
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.cookies)) return data.cookies;
    console.error('Unexpected response format:', data);
    return [];
  },

  // Create single cookie
  create: async (cookieData) => {
    const response = await api.post('/cookies', cookieData);
    return response.data;
  },

  // Import cookies (bulk)
  importCookies: async (storeId, cookies) => {
    const response = await api.post('/cookies/import', {
      storeId,
      cookies
    });
    return response.data;
  },

  // Update cookie
  update: async (id, cookieData) => {
    const response = await api.put(`/cookies/${id}`, cookieData);
    return response.data;
  },

  // Delete single cookie
  delete: async (id) => {
    const response = await api.delete(`/cookies/${id}`);
    return response.data;
  },

  // Delete all cookies for a store
  deleteAll: async (storeId) => {
    const response = await api.delete(`/cookies/store/${storeId}`);
    return response.data;
  },

  // 🏥 NEW: Health check cookies
  healthCheck: async (storeId) => {
    const response = await api.post(`/cookies/health-check/${storeId}`);
    return response.data;
  },
};