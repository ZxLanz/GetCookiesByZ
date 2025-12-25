import api from './api';

export const settingsService = {
  // Get user settings
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data.data || response.data;
  },

  // Update user settings
  updateSettings: async (settings) => {
    const response = await api.put('/settings', settings);
    return response.data.data || response.data;
  },

  // Manual trigger sync
  syncNow: async () => {
    const response = await api.post('/settings/sync-now');
    return response.data;
  }
};