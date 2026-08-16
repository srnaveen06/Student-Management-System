import apiClient from './apiClient';

const attendanceApi = {

  // Students eligible for marking attendance for a branch+semester+date
  async getStudentsForMarking(params = {}) {
    const response = await apiClient.get('/attendance/students', { params });
    return response.data;
  },

  // Save/upsert attendance for a batch
  async saveAttendance(data) {
    const response = await apiClient.post('/attendance/save', data);
    return response.data;
  },

  // Attendance overview with filters
  async getOverview(params = {}) {
    const response = await apiClient.get('/attendance', { params });
    return response.data;
  },

  // Attendance summary for a single student
  async getStudentSummary(studentId) {
    const response = await apiClient.get(`/attendance/students/${studentId}/summary`);
    return response.data;
  },

  // Students below the attendance threshold
  async getLowAttendance() {
    const response = await apiClient.get('/attendance/low');
    return response.data;
  }
};

export default attendanceApi;
