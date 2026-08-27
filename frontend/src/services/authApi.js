import apiClient from './apiClient';

const authApi = {

  // POST /api/auth/login — Login with username and password
  async login(username, password) {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  // POST /api/auth/register — Public account creation
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // GET /api/auth/check-availability — Check username/email availability
  async checkAvailability(params = {}) {
    const response = await apiClient.get('/auth/check-availability', { params });
    return response.data;
  },

  // GET /api/auth/verify — Verify token is valid
  async verify(token) {
    const response = await apiClient.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // PUT /api/auth/password — Change admin password
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.put('/auth/password', { currentPassword, newPassword });
    return response.data;
  },

  // PUT /api/auth/profile — Update own profile (name / username / email)
  async updateProfile(data) {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  // POST /api/auth/profile/image — Upload profile picture (multipart)
  async uploadProfileImage(formData) {
    const response = await apiClient.post('/auth/profile/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // GET /api/auth/users — List users (super_admin only)
  async getUsers() {
    const response = await apiClient.get('/auth/users');
    return response.data;
  },

  // POST /api/auth/users — Create user (super_admin only)
  async createUser(userData) {
    const response = await apiClient.post('/auth/users', userData);
    return response.data;
  },

  // PUT /api/auth/users/:id/role — Change user role (super_admin only)
  async changeRole(id, role) {
    const response = await apiClient.put(`/auth/users/${id}/role`, { role });
    return response.data;
  },

  // DELETE /api/auth/users/:id — Delete user (super_admin only)
  async deleteUser(id) {
    const response = await apiClient.delete(`/auth/users/${id}`);
    return response.data;
  }
};

export default authApi;
