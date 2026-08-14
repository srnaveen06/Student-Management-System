const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const AuthController = {

  // POST /api/auth/login — Admin login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validate inputs
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }

      // Find admin by username
      const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const admin = rows[0];

      // Compare password with hashed password in database
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  },

  // GET /api/auth/verify — Verify JWT token
  async verify(req, res) {
    try {
      // req.user is set by authMiddleware
      res.json({ success: true, data: { user: req.user } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error during verification' });
    }
  }
};

module.exports = AuthController;
