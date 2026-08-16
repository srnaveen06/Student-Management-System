import apiClient from './apiClient';

const dashboardApi = {
  async getDashboardData() {
    const response = await apiClient.get('/dashboard');
    return response.data;
  }
};

export default dashboardApi;
