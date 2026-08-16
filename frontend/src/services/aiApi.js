import apiClient from './apiClient';

// AI Platform API — thin wrapper around the /api/ai/* endpoints.
const aiApi = {
  // Features / capabilities for the current role
  async getFeatures() {
    const response = await apiClient.get('/ai/features');
    return response.data;
  },

  // ---- CampusAI assistant -------------------------------------------------
  async chat(message, conversationId) {
    const response = await apiClient.post('/ai/chat', { message, conversationId });
    return response.data;
  },
  async listConversations() {
    const response = await apiClient.get('/ai/conversations');
    return response.data;
  },
  async getConversation(id) {
    const response = await apiClient.get(`/ai/conversations/${id}`);
    return response.data;
  },
  async deleteConversation(id) {
    const response = await apiClient.delete(`/ai/conversations/${id}`);
    return response.data;
  },

  // ---- Natural-language search -------------------------------------------
  async search(query) {
    const response = await apiClient.post('/ai/search', { query });
    return response.data;
  },

  // ---- Insights / analytics ----------------------------------------------
  async dashboardInsights() {
    const response = await apiClient.get('/ai/dashboard-insights');
    return response.data;
  },
  async studentRisk(id) {
    const response = await apiClient.get(`/ai/student/${id}/risk`);
    return response.data;
  },
  async attendanceForecast(id) {
    const response = await apiClient.get(`/ai/student/${id}/attendance-forecast`);
    return response.data;
  },
  async recommendations(studentId) {
    const response = await apiClient.get(`/ai/student/${studentId}/study-recommendations`);
    return response.data;
  },
  async marksAnalysis(id) {
    const response = await apiClient.get(`/ai/student/${id}/marks-analysis`);
    return response.data;
  },

  // ---- TeacherAI ----------------------------------------------------------
  async classAnalysis(params = {}) {
    const response = await apiClient.get('/ai/class-analysis', { params });
    return response.data;
  },

  // ---- Generators ---------------------------------------------------------
  async generateReport({ type, filters }) {
    const response = await apiClient.post('/ai/report', { type, filters });
    return response.data;
  },
  async listReports(limit = 20) {
    const response = await apiClient.get('/ai/reports', { params: { limit } });
    return response.data;
  },
  async generateQuestions({ subjectId, examName, count, difficulty, types }) {
    const response = await apiClient.post('/ai/question-generator', { subjectId, examName, count, difficulty, types });
    return response.data;
  },
  async listQuestions(limit = 50) {
    const response = await apiClient.get('/ai/questions', { params: { limit } });
    return response.data;
  },
  async generateMessages({ type, branch, semester, limit }) {
    const response = await apiClient.post('/ai/message-generator', { type, branch, semester, limit });
    return response.data;
  },

  // ---- Intelligence -------------------------------------------------------
  async feeRisk() {
    const response = await apiClient.get('/ai/fee-risk');
    return response.data;
  },
  async anomalies() {
    const response = await apiClient.get('/ai/anomaly-detection');
    return response.data;
  },

  // ---- Document intelligence ---------------------------------------------
  async extractDocument(formData) {
    const response = await apiClient.post('/ai/document-extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  async listExtractions(limit = 20) {
    const response = await apiClient.get('/ai/document-extractions', { params: { limit } });
    return response.data;
  },
  async applyExtraction(id) {
    const response = await apiClient.post(`/ai/document-extractions/${id}/apply`);
    return response.data;
  },

  // ---- ML pipeline --------------------------------------------------------
  async trainModel() {
    const response = await apiClient.post('/ai/ml/train');
    return response.data;
  },
  async getModel() {
    const response = await apiClient.get('/ai/ml/model');
    return response.data;
  },
  async predictWithModel(id) {
    const response = await apiClient.post(`/ai/ml/predict/${id}`);
    return response.data;
  },

  // ---- Audit + settings ---------------------------------------------------
  async activity(limit = 50) {
    const response = await apiClient.get('/ai/activity', { params: { limit } });
    return response.data;
  },
  async getSettings() {
    const response = await apiClient.get('/ai/settings');
    return response.data;
  },
  async updateSettings(patch) {
    const response = await apiClient.post('/ai/settings', patch);
    return response.data;
  },
};

export default aiApi;
