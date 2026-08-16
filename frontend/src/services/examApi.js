import apiClient from './apiClient';

const examApi = {

  // Examinations
  async getExams(params = {}) {
    const response = await apiClient.get('/examinations', { params });
    return response.data;
  },

  async getExam(id) {
    const response = await apiClient.get(`/examinations/${id}`);
    return response.data;
  },

  async createExam(data) {
    const response = await apiClient.post('/examinations', data);
    return response.data;
  },

  async updateExam(id, data) {
    const response = await apiClient.put(`/examinations/${id}`, data);
    return response.data;
  },

  async deleteExam(id) {
    const response = await apiClient.delete(`/examinations/${id}`);
    return response.data;
  },

  // Marks
  async getMarks(params = {}) {
    const response = await apiClient.get('/marks', { params });
    return response.data;
  },

  // Marks entry rows for an exam (students + existing marks)
  async getExamEntry(examId) {
    const response = await apiClient.get(`/marks/exam/${examId}/entry`);
    return response.data;
  },

  // Bulk save marks for an exam
  async saveMarks(examId, rows) {
    const response = await apiClient.post(`/marks/exam/${examId}`, { rows });
    return response.data;
  },

  // Update a single mark
  async updateMark(markId, data) {
    const response = await apiClient.put(`/marks/${markId}`, data);
    return response.data;
  },

  // Marksheet for a student
  async getMarksheet(studentId, semester) {
    const response = await apiClient.get(`/marks/marksheet/${studentId}`, { params: { semester } });
    return response.data;
  }
};

export default examApi;
