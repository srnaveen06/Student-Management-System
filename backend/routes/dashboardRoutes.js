const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

router.get('/', authMiddleware, requireRole('super_admin', 'admin', 'accountant', 'teacher'), DashboardController.getDashboard);

module.exports = router;
