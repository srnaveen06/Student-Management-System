const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feeRoutes = require('./routes/feeRoutes');
const examinationRoutes = require('./routes/examinationRoutes');
const markRoutes = require('./routes/markRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const documentRoutes = require('./routes/documentRoutes');
const idCardRoutes = require('./routes/idCardRoutes');

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

// Courses & subjects
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);

// Attendance
app.use('/api/attendance', attendanceRoutes);

// Fees & payments
app.use('/api/fees', feeRoutes);

// Examinations & marks
app.use('/api/examinations', examinationRoutes);
app.use('/api/marks', markRoutes);

// Dashboard analytics
app.use('/api/dashboard', dashboardRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Activity logs
app.use('/api/activity-logs', activityLogRoutes);

// Settings
app.use('/api/settings', settingsRoutes);

// AI platform
app.use('/api/ai', aiRoutes);

// Academic Calendar
app.use('/api/calendar', calendarRoutes);

// Announcements
app.use('/api/announcements', announcementRoutes);

// Leave Management
app.use('/api/leaves', leaveRoutes);

// Student Documents (cross-student listing)
app.use('/api/documents', documentRoutes);

// Student ID Cards + QR verification
app.use('/api/id-cards', idCardRoutes);

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

  if (err.message && err.message.includes('Only CSV, text, JSON')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`\n🚀 Student Management System API`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 Students API: http://localhost:${PORT}/api/students`);
  console.log(`📚 Courses API: http://localhost:${PORT}/api/courses`);
  console.log(`📅 Attendance API: http://localhost:${PORT}/api/attendance`);
  console.log(`💰 Fees API: http://localhost:${PORT}/api/fees`);
  console.log(`📝 Exams API: http://localhost:${PORT}/api/examinations\n`);
});
