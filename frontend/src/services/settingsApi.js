import apiClient from './apiClient';

const settingsApi = {

  async getSettings() {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  async updateSettings(data) {
    const response = await apiClient.put('/settings', data);
    return response.data;
  }
};

export default settingsApi;
