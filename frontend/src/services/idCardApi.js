import apiClient from './apiClient';

const idCardApi = {
  // List ID cards
  async getCards(params = {}) {
    const response = await apiClient.get('/id-cards', { params });
    return response.data;
  },

  // Status distribution
  async getSummary() {
    const response = await apiClient.get('/id-cards/summary');
    return response.data;
  },

  // A student's card
  async getStudentCard(studentId) {
    const response = await apiClient.get(`/id-cards/student/${studentId}`);
    return response.data;
  },

  // Public verification (no auth)
  async verify(token) {
    const response = await apiClient.get(`/id-cards/verify/${token}`);
    return response.data;
  },

  // Issue/regenerate a card
  async createCard(data) {
    const response = await apiClient.post('/id-cards', data);
    return response.data;
  },

  // Update status/validity
  async updateCard(id, data) {
    const response = await apiClient.put(`/id-cards/${id}`, data);
    return response.data;
  },

  // Delete a card
  async deleteCard(id) {
    const response = await apiClient.delete(`/id-cards/${id}`);
    return response.data;
  }
};

export default idCardApi;
