import apiClient from './apiClient';

const calendarApi = {
  // List events with filters
  async getEvents(params = {}) {
    const response = await apiClient.get('/calendar', { params });
    return response.data;
  },

  // Events in a date range (calendar view)
  async getRange(params = {}) {
    const response = await apiClient.get('/calendar/range', { params });
    return response.data;
  },

  // Upcoming events (dashboard)
  async getUpcoming(limit = 5) {
    const response = await apiClient.get('/calendar/upcoming', { params: { limit } });
    return response.data;
  },

  // Distinct event types
  async getTypes() {
    const response = await apiClient.get('/calendar/types');
    return response.data;
  },

  // Single event
  async getEvent(id) {
    const response = await apiClient.get(`/calendar/${id}`);
    return response.data;
  },

  // Create event
  async createEvent(data) {
    const response = await apiClient.post('/calendar', data);
    return response.data;
  },

  // Update event
  async updateEvent(id, data) {
    const response = await apiClient.put(`/calendar/${id}`, data);
    return response.data;
  },

  // Delete event
  async deleteEvent(id) {
    const response = await apiClient.delete(`/calendar/${id}`);
    return response.data;
  }
};

export default calendarApi;
