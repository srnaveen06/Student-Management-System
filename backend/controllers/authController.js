const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/activity');
require('dotenv').config();

// Token payload includes role so the frontend can adapt the UI immediately.
const signToken = (admin) =>
  jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

const sanitizeAdmin = (admin) => ({
  id: admin.id,
  username: admin.username,
  role: admin.role,
  name: admin.name,
  email: admin.email,
  image: admin.image
});

const AuthController = {

  // POST /api/auth/login — Admin login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }

      const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const admin = rows[0];
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      await db.execute('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

      const token = signToken(admin);

      logActivity({
        userId: admin.id,
        username: admin.username,
        action: 'login',
        description: `${admin.username} logged in`,
        relatedType: 'admin',
        relatedId: admin.id
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: { token, admin: sanitizeAdmin(admin) }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  },

  // POST /api/auth/register — Public self-registration (protected-free account creation)
  async register(req, res) {
    try {
      const { name, username, email, password } = req.body;

      const newName = name !== undefined && name !== null ? String(name).trim() : '';
      const newUsername = username !== undefined && username !== null ? String(username).trim() : '';
      const newEmail = email !== undefined && email !== null ? String(email).trim() : '';

      if (!newName || newName.length < 2) {
        return res.status(400).json({ success: false, message: 'Please enter your full name' });
      }
      if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newUsername)) {
        return res.status(400).json({ success: false, message: 'Username must be 3-50 characters using letters, numbers, "_", "." or "-"' });
      }
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      }
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      }

      const [du] = await db.execute('SELECT id FROM admins WHERE LOWER(username) = LOWER(?)', [newUsername]);
      if (du.length > 0) {
        return res.status(400).json({ success: false, message: 'Username is already in use' });
      }

      const [de] = await db.execute('SELECT id FROM admins WHERE LOWER(email) = LOWER(?)', [newEmail]);
      if (de.length > 0) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = 'admin';
      const [result] = await db.execute(
        'INSERT INTO admins (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
        [newUsername, hashedPassword, role, newName, newEmail]
      );

      logActivity({
        userId: result.insertId,
        username: newUsername,
        action: 'account_created',
        description: `${newUsername} created a StudentOS account`,
        relatedType: 'admin',
        relatedId: result.insertId
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { id: result.insertId, username: newUsername, name: newName, email: newEmail, role }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Server error during registration' });
    }
  },

  // GET /api/auth/check-availability — Check username/email availability (public)
  async checkAvailability(req, res) {
    try {
      const { username, email } = req.query;
      const data = { usernameAvailable: true, emailAvailable: true };

      if (username) {
        const [u] = await db.execute('SELECT id FROM admins WHERE LOWER(username) = LOWER(?)', [String(username).trim()]);
        data.usernameAvailable = u.length === 0;
      }
      if (email) {
        const [e] = await db.execute('SELECT id FROM admins WHERE LOWER(email) = LOWER(?)', [String(email).trim()]);
        data.emailAvailable = e.length === 0;
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/auth/verify — Verify JWT token
  async verify(req, res) {
    try {
      res.json({ success: true, data: { user: req.user } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error during verification' });
    }
  },

  // PUT /api/auth/profile — Update own profile (name / username / email)
  async updateProfile(req, res) {
    try {
      const { name, username, email } = req.body;

      const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.user.id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const admin = rows[0];

      if (username !== undefined) {
        const newUsername = String(username).trim();
        if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newUsername)) {
          return res.status(400).json({ success: false, message: 'Username must be 3-50 characters using letters, numbers, "_", "." or "-"' });
        }
        if (newUsername.toLowerCase() !== admin.username.toLowerCase()) {
          const [dup] = await db.execute(
            'SELECT id FROM admins WHERE LOWER(username) = LOWER(?) AND id <> ?',
            [newUsername, admin.id]
          );
          if (dup.length > 0) {
            return res.status(400).json({ success: false, message: 'Username is already in use' });
          }
        }
      }

      if (email !== undefined) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
          return res.status(400).json({ success: false, message: 'A valid email is required' });
        }
        const [dup] = await db.execute(
          'SELECT id FROM admins WHERE email = ? AND id <> ?',
          [String(email).trim(), admin.id]
        );
        if (dup.length > 0) {
          return res.status(400).json({ success: false, message: 'Email is already in use' });
        }
      }

      const newUsername = username !== undefined && username !== null ? String(username).trim() : admin.username;
      const newName = name !== undefined && name !== null ? String(name).trim() : admin.name;
      const newEmail = email !== undefined ? String(email).trim() : admin.email;

      await db.execute('UPDATE admins SET username = ?, name = ?, email = ? WHERE id = ?', [
        newUsername, newName || null, newEmail || null, admin.id
      ]);

      logActivity({
        userId: admin.id,
        username: newUsername,
        action: 'profile_updated',
        description: `${newUsername} updated their profile`
      });

      const [updated] = await db.execute('SELECT * FROM admins WHERE id = ?', [admin.id]);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          admin: sanitizeAdmin(updated[0]),
          token: signToken(updated[0])
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating profile' });
    }
  },

  // PUT /api/auth/profile/image — Upload own profile picture
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please select an image file' });
      }

      await db.execute('UPDATE admins SET image = ? WHERE id = ?', [req.file.filename, req.user.id]);

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'profile_updated',
        description: `${req.user.username} updated their profile picture`
      });

      const [updated] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.user.id]);

      res.json({
        success: true,
        message: 'Profile picture updated',
        data: { admin: sanitizeAdmin(updated[0]) }
      });
    } catch (error) {
      console.error('Upload profile image error:', error);
      res.status(500).json({ success: false, message: 'Server error while uploading image' });
    }
  },

  // PUT /api/auth/password — Change own password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
      }

      const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.user.id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const admin = rows[0];
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, admin.id]);

      logActivity({
        userId: admin.id,
        username: admin.username,
        action: 'password_changed',
        description: `${admin.username} changed their password`
      });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Server error while changing password' });
    }
  },

  // GET /api/auth/users — List all users (super_admin only)
  async getUsers(req, res) {
    try {
      const [rows] = await db.execute(
        'SELECT id, username, role, name, email, image, last_login, created_at FROM admins ORDER BY id ASC'
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching users' });
    }
  },

  // POST /api/auth/users — Create a user (super_admin only)
  async createUser(req, res) {
    try {
      const { username, password, role, name, email } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Username, password and role are required' });
      }
      const validRoles = ['super_admin', 'admin', 'teacher', 'accountant'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }

      const [existing] = await db.execute('SELECT id FROM admins WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const [result] = await db.execute(
        'INSERT INTO admins (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
        [username, hashed, role, name || null, email || null]
      );

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_created',
        description: `${req.user.username} created user ${username} (${role})`,
        relatedType: 'admin',
        relatedId: result.insertId
      });

      res.status(201).json({ success: true, message: 'User created successfully', data: { id: result.insertId } });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating user' });
    }
  },

  // PUT /api/auth/users/:id/role — Change user role (super_admin only)
  async changeRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ success: false, message: 'Role is required' });
      }
      const validRoles = ['super_admin', 'admin', 'teacher', 'accountant'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      const [existing] = await db.execute('SELECT id, username FROM admins WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role' });
      }

      await db.execute('UPDATE admins SET role = ? WHERE id = ?', [role, id]);

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'role_changed',
        description: `${req.user.username} changed ${existing[0].username}'s role to ${role}`,
        relatedType: 'admin',
        relatedId: Number(id)
      });

      res.json({ success: true, message: 'Role updated successfully' });
    } catch (error) {
      console.error('Change role error:', error);
      res.status(500).json({ success: false, message: 'Server error while changing role' });
    }
  },

  // DELETE /api/auth/users/:id — Delete a user (super_admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      }

      const [existing] = await db.execute('SELECT username FROM admins WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await db.execute('DELETE FROM admins WHERE id = ?', [id]);

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_deleted',
        description: `${req.user.username} deleted user ${existing[0].username}`,
        relatedType: 'admin',
        relatedId: Number(id)
      });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting user' });
    }
  }
};

module.exports = AuthController;
