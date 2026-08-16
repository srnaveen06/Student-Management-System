import apiClient from './apiClient';

// Student API functions
const studentApi = {

  // Get all students with query params (search, filter, sort, page)
  async getAll(params = {}) {
    const response = await apiClient.get('/students', { params });
    return response.data;
  },

  // Get a single student by ID
  async getById(id) {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },

  // Get full student profile (overview, documents, attendance, fees, marks)
  async getProfile(id) {
    const response = await apiClient.get(`/students/profile/${id}`);
    return response.data;
  },

  // Create a new student (with optional image)
  async create(formData) {
    const response = await apiClient.post('/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Update a student (with optional new image)
  async update(id, formData) {
    const response = await apiClient.put(`/students/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Delete a student
  async delete(id) {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data;
  },

  // Bulk update status (activate/deactivate)
  async bulkStatus(ids, status) {
    const response = await apiClient.post('/students/bulk/status', { ids, status });
    return response.data;
  },

  // Bulk delete
  async bulkDelete(ids) {
    const response = await apiClient.post('/students/bulk/delete', { ids });
    return response.data;
  },

  // Get dashboard statistics
  async getStats() {
    const response = await apiClient.get('/students/stats');
    return response.data;
  },

  // Get all unique branches for filter dropdown
  async getBranches() {
    const response = await apiClient.get('/students/branches');
    return response.data;
  },

  // Get all unique institutes
  async getInstitutes() {
    const response = await apiClient.get('/students/institutes');
    return response.data;
  },

  // Get aggregated data for reports
  async getReports() {
    const response = await apiClient.get('/students/reports');
    return response.data;
  },

  // CSV import (preview with dryRun, then confirm)
  async importStudents(formData, dryRun = true) {
    const response = await apiClient.post(`/students/import?dryRun=${dryRun}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Documents
  async addDocument(studentId, formData) {
    const response = await apiClient.post(`/students/${studentId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getDocuments(studentId) {
    const response = await apiClient.get(`/students/${studentId}/documents`);
    return response.data;
  },

  async deleteDocument(docId) {
    const response = await apiClient.delete(`/students/documents/${docId}`);
    return response.data;
  }
};

export default studentApi;
