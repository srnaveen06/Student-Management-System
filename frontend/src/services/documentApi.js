import apiClient from './apiClient';

const documentApi = {
  // Cross-student document listing
  async getDocuments(params = {}) {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  // Doc-type distribution summary
  async getSummary() {
    const response = await apiClient.get('/documents/summary');
    return response.data;
  }
};

export default documentApi;
