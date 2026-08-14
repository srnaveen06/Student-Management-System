import axios from 'axios';

// Base URL for student API — change to production URL when deploying
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — attach JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 errors (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Student API functions
const studentApi = {

  // Get all students with query params (search, filter, sort, page)
  async getAll(params = {}) {
    const response = await api.get('/students', { params });
    return response.data;
  },

  // Get a single student by ID
  async getById(id) {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  // Create a new student (with optional image)
  async create(formData) {
    const response = await api.post('/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Update a student (with optional new image)
  async update(id, formData) {
    const response = await api.put(`/students/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Delete a student
  async delete(id) {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // Get dashboard statistics
  async getStats() {
    const response = await api.get('/students/stats');
    return response.data;
  },

  // Get all unique branches for filter dropdown
  async getBranches() {
    const response = await api.get('/students/branches');
    return response.data;
  }
};

export default studentApi;
