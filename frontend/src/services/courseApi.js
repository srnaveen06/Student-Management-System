import apiClient from './apiClient';

const courseApi = {

  // Courses
  async getCourses(params = {}) {
    const response = await apiClient.get('/courses', { params });
    return response.data;
  },

  async getCourse(id) {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },

  async createCourse(data) {
    const response = await apiClient.post('/courses', data);
    return response.data;
  },

  async updateCourse(id, data) {
    const response = await apiClient.put(`/courses/${id}`, data);
    return response.data;
  },

  async deleteCourse(id) {
    const response = await apiClient.delete(`/courses/${id}`);
    return response.data;
  },

  // Subjects
  async getSubjects(params = {}) {
    const response = await apiClient.get('/subjects', { params });
    return response.data;
  },

  async createSubject(data) {
    const response = await apiClient.post('/subjects', data);
    return response.data;
  },

  async updateSubject(id, data) {
    const response = await apiClient.put(`/subjects/${id}`, data);
    return response.data;
  },

  async deleteSubject(id) {
    const response = await apiClient.delete(`/subjects/${id}`);
    return response.data;
  },

  // Subject options for dropdowns (branch + semester + optional subjectId)
  async getSubjectOptions(params = {}) {
    const response = await apiClient.get('/subjects/options', { params });
    return response.data;
  }
};

export default courseApi;
