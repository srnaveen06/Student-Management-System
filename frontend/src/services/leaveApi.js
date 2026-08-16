import apiClient from './apiClient';

const leaveApi = {
  // List leaves with filters
  async getLeaves(params = {}) {
    const response = await apiClient.get('/leaves', { params });
    return response.data;
  },

  // Status distribution summary
  async getSummary() {
    const response = await apiClient.get('/leaves/summary');
    return response.data;
  },

  // Recent leaves (dashboard widget)
  async getRecent(limit = 5) {
    const response = await apiClient.get('/leaves/recent', { params: { limit } });
    return response.data;
  },

  // Single leave
  async getLeave(id) {
    const response = await apiClient.get(`/leaves/${id}`);
    return response.data;
  },

  // Student's leave history
  async getStudentLeaves(studentId, params = {}) {
    const response = await apiClient.get(`/leaves/students/${studentId}`, { params });
    return response.data;
  },

  // Per-student summary
  async getStudentSummary(studentId) {
    const response = await apiClient.get(`/leaves/students/${studentId}/summary`);
    return response.data;
  },

  // Create leave request
  async createLeave(data) {
    const response = await apiClient.post('/leaves', data);
    return response.data;
  },

  // Update a pending leave
  async updateLeave(id, data) {
    const response = await apiClient.put(`/leaves/${id}`, data);
    return response.data;
  },

  // Approve / Reject / Cancel
  async setStatus(id, data) {
    const response = await apiClient.put(`/leaves/${id}/status`, data);
    return response.data;
  },

  // Delete leave
  async deleteLeave(id) {
    const response = await apiClient.delete(`/leaves/${id}`);
    return response.data;
  }
};

export default leaveApi;
