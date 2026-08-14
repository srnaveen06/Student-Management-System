const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============

// Enable CORS — allows frontend to make API requests to this server
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ ROUTES ============

// Authentication routes (login, verify)
app.use('/api/auth', authRoutes);

// Student CRUD routes (all protected)
app.use('/api/students', studentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Student Management System API is running' });
});

// ============ ERROR HANDLING ============

// Handle 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Handle multer errors (file upload issues)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size exceeds 5MB limit' });
  }

  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`\n🚀 Student Management System API`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 Students API: http://localhost:${PORT}/api/students\n`);
});
