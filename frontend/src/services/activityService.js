// frontend/src/services/activityService.js

import api from './api';

export const activityService = {
  // Get all activities with pagination
  getAll: async (limit = 10, skip = 0) => {
    try {
      const response = await api.get(`/activities?limit=${limit}&skip=${skip}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },

  // Get recent activities (last 5)
  getRecent: async () => {
    try {
      const response = await api.get('/activities/recent');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  // Create new activity log (manual)
  create: async (activityData) => {
    try {
      const response = await api.post('/activities', activityData);
      return response.data;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  },

  // Clean up old activities
  cleanup: async () => {
    try {
      const response = await api.delete('/activities/cleanup');
      return response.data;
    } catch (error) {
      console.error('Error cleaning up activities:', error);
      throw error;
    }
  }
};