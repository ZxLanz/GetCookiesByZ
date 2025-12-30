// frontend/src/services/storeService.js

import api from './api';

export const storeService = {
  // Get all stores
  getAll: async () => {
    const response = await api.get('/stores');
    return response.data.stores;
  },

  // Get single store
  getById: async (id) => {
    const response = await api.get(`/stores/${id}`);
    return response.data.store;
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

  // ✅ FIXED: Generate cookies for a store
  // Uses /cookies/generate endpoint with storeName or storeId
  generateCookies: async (storeId, storeName, email, password) => {
    const payload = {
      email,
      password
    };

    // Backend accepts either storeId OR storeName
    if (storeId) {
      payload.storeId = storeId;
    } else if (storeName) {
      payload.storeName = storeName;
    }

    console.log('🚀 Generating cookies with payload:', { ...payload, password: '***' });

    const response = await api.post('/cookies/generate', payload);
    return response.data;
  },

  // Sync cookies (RE-GENERATE using saved credentials)
  syncCookies: async (storeId) => {
    const response = await api.post(`/stores/${storeId}/sync`);
    return response.data;
  }
};