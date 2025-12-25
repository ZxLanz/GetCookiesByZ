// frontend/src/services/storeService.js

import api from './api';

export const storeService = {
  // Get all stores
  getAll: async () => {
    const response = await api.get('/stores');
    return response.data.stores;  // ✅ FIXED: backend returns 'stores' not 'data'
  },

  // Get single store
  getById: async (id) => {
    const response = await api.get(`/stores/${id}`);
    return response.data.store;  // ✅ FIXED: backend returns 'store' not 'data'
  },

  // Create store
  create: async (storeData) => {
    const response = await api.post('/stores', storeData);
    return response.data;
  },

  // Update store
  update: async (id, storeData) => {
    const response = await api.put(`/stores/${id}`, storeData);
    return response.data;
  },

  // Delete store
  delete: async (id) => {
    const response = await api.delete(`/stores/${id}`);
    return response.data;
  },

  // Check if store has saved credentials
  hasCredentials: async (storeId) => {
    const response = await api.get(`/stores/${storeId}/has-credentials`);
    return response.data;
  },

  // Generate cookies (with optional email/password)
  // If email & password not provided, will use saved credentials
  generateCookies: async (storeId, email = null, password = null) => {
    const payload = {};
    if (email) payload.email = email;
    if (password) payload.password = password;
    
    const response = await api.post(`/stores/${storeId}/generate`, payload);  // ✅ FIXED: '/generate' not '/generate-cookies'
    return response.data;
  },

  // Sync cookies (RE-GENERATE using saved credentials)
  syncCookies: async (storeId) => {
    const response = await api.post(`/stores/${storeId}/sync`);
    return response.data;
  }
};