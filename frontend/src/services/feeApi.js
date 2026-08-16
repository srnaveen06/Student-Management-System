import apiClient from './apiClient';

const feeApi = {

  // List fees with filters
  async getFees(params = {}) {
    const response = await apiClient.get('/fees', { params });
    return response.data;
  },

  // Single fee with payments
  async getFee(id) {
    const response = await apiClient.get(`/fees/${id}`);
    return response.data;
  },

  // Assign a fee to a student
  async assignFee(data) {
    const response = await apiClient.post('/fees', data);
    return response.data;
  },

  // Fee summary for dashboard
  async getSummary() {
    const response = await apiClient.get('/fees/summary');
    return response.data;
  },

  // Payments list
  async getPayments(params = {}) {
    const response = await apiClient.get('/fees/payments', { params });
    return response.data;
  },

  // Record a payment
  async recordPayment(data) {
    const response = await apiClient.post('/fees/payments', data);
    return response.data;
  },

  // Edit a payment
  async editPayment(id, data) {
    const response = await apiClient.put(`/fees/payments/${id}`, data);
    return response.data;
  },

  // Delete a payment
  async deletePayment(id) {
    const response = await apiClient.delete(`/fees/payments/${id}`);
    return response.data;
  }
};

export default feeApi;
