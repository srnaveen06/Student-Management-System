const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Middleware to protect routes — verifies JWT token from request headers,
// then loads the current user from the database so role/permission changes
// take effect immediately (and disabled users lose access).
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load fresh user data to get the current role and username
    const [rows] = await db.execute(
      'SELECT id, username, role, name, email, image FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      image: user.image
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
