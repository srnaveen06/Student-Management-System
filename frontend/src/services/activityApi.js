import apiClient from './apiClient';

const activityApi = {

  async getLogs(params = {}) {
    const response = await apiClient.get('/activity-logs', { params });
    return response.data;
  },

  async getActions() {
    const response = await apiClient.get('/activity-logs/actions');
    return response.data;
  }
};

export default activityApi;
