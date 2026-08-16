import apiClient from './apiClient';

const notificationApi = {

  async getNotifications(params = {}) {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  async markRead(id) {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead() {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },

  async deleteNotification(id) {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};

export default notificationApi;
