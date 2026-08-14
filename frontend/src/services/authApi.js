import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

const authApi = {

  // POST /api/auth/login — Login with username and password
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  // GET /api/auth/verify — Verify token is valid
  async verify(token) {
    const response = await api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default authApi;
