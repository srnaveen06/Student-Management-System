import apiClient from './apiClient';

const announcementApi = {
  // List announcements with filters
  async getAnnouncements(params = {}) {
    const response = await apiClient.get('/announcements', { params });
    return response.data;
  },

  // Latest announcements (dashboard)
  async getLatest(limit = 5) {
    const response = await apiClient.get('/announcements/latest', { params: { limit } });
    return response.data;
  },

  // Single announcement
  async getAnnouncement(id) {
    const response = await apiClient.get(`/announcements/${id}`);
    return response.data;
  },

  // Create announcement
  async createAnnouncement(data) {
    const response = await apiClient.post('/announcements', data);
    return response.data;
  },

  // Update announcement
  async updateAnnouncement(id, data) {
    const response = await apiClient.put(`/announcements/${id}`, data);
    return response.data;
  },

  // Delete announcement
  async deleteAnnouncement(id) {
    const response = await apiClient.delete(`/announcements/${id}`);
    return response.data;
  }
};

export default announcementApi;
