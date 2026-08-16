const LeaveModel = require('../models/leaveModel');
const NotificationModel = require('../models/notificationModel');
const { logActivity } = require('../utils/activity');

// Inclusive day count between two YYYY-MM-DD strings or JS Date objects.
const countDays = (fromDate, toDate) => {
  const toStr = (d) => d instanceof Date ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : String(d);
  const a = new Date(`${toStr(fromDate)}T00:00:00`);
  const b = new Date(`${toStr(toDate)}T00:00:00`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
};

const LeaveController = {

  // GET /api/leaves — list with filters
  async getLeaves(req, res) {
    try {
      const { search, status, leaveType, studentId, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
      const result = await LeaveModel.findAll({
        search, status, leaveType, studentId, dateFrom, dateTo,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get leaves error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching leaves' });
    }
  },

  // GET /api/leaves/summary — status distribution
  async getSummary(req, res) {
    try {
      const summary = await LeaveModel.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get leaves summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/leaves/students/:studentId — student's leave history
  async getStudentLeaves(req, res) {
    try {
      const result = await LeaveModel.findByStudent(req.params.studentId, {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get student leaves error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/leaves/students/:studentId/summary — per-student summary
  async getStudentSummary(req, res) {
    try {
      const summary = await LeaveModel.getStudentSummary(req.params.studentId);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get student leave summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/leaves/recent — recent requests (dashboard widget)
  async getRecent(req, res) {
    try {
      const leaves = await LeaveModel.getRecent(Number(req.query.limit) || 5);
      res.json({ success: true, data: leaves });
    } catch (error) {
      console.error('Get recent leaves error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/leaves/:id — single request
  async getLeave(req, res) {
    try {
      const leave = await LeaveModel.findById(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
      res.json({ success: true, data: leave });
    } catch (error) {
      console.error('Get leave error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/leaves — create request
  async createLeave(req, res) {
    try {
      const { studentId, leaveType, fromDate, toDate, reason } = req.body;
      if (!studentId) return res.status(400).json({ success: false, message: 'Student is required' });
      if (!fromDate || !toDate) return res.status(400).json({ success: false, message: 'From and to dates are required' });
      if (toDate < fromDate) return res.status(400).json({ success: false, message: 'To date cannot be before from date' });

      const days = countDays(fromDate, toDate);
      const leave = await LeaveModel.create({
        studentId, leaveType, fromDate, toDate, days, reason,
        attachment: req.file ? req.file.filename : null,
        requestedBy: req.user.id
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'leave_requested',
        description: `${req.user.username} filed ${days} day(s) ${leaveType || 'leave'} for student #${studentId}`,
        relatedType: 'leave', relatedId: leave.id
      });

      res.status(201).json({ success: true, message: 'Leave request submitted', data: leave });
    } catch (error) {
      console.error('Create leave error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating leave request' });
    }
  },

  // PUT /api/leaves/:id — edit a pending request
  async updateLeave(req, res) {
    try {
      const { studentId, leaveType, fromDate, toDate, reason } = req.body;
      const existing = await LeaveModel.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Leave request not found' });
      if (existing.status !== 'Pending') {
        return res.status(400).json({ success: false, message: 'Only pending requests can be edited' });
      }
      if (!fromDate || !toDate) return res.status(400).json({ success: false, message: 'From and to dates are required' });
      if (toDate < fromDate) return res.status(400).json({ success: false, message: 'To date cannot be before from date' });

      const days = countDays(fromDate, toDate);
      const affected = await LeaveModel.update(req.params.id, {
        studentId, leaveType, fromDate, toDate, days, reason,
        attachment: req.file ? req.file.filename : existing.attachment
      });
      if (!affected) return res.status(400).json({ success: false, message: 'Leave request could not be updated' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'leave_updated',
        description: `${req.user.username} updated leave request #${req.params.id}`,
        relatedType: 'leave', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Leave request updated successfully' });
    } catch (error) {
      console.error('Update leave error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating leave request' });
    }
  },

  // PUT /api/leaves/:id/status — Approve / Reject / Cancel
  async setStatus(req, res) {
    try {
      const { status, remarks } = req.body;
      const leave = await LeaveModel.findById(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
      if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      if (leave.status === 'Approved' && status === 'Rejected') {
        return res.status(400).json({ success: false, message: 'Cancel the approved leave instead of rejecting it' });
      }

      const wasApproved = leave.status === 'Approved';
      await LeaveModel.setStatus(req.params.id, { status, remarks, approvedBy: req.user.id });

      // Attendance integration: approve -> mark days as Approved Leave;
      // moving away from Approved -> clear those attendance rows.
      if (status === 'Approved') {
        await LeaveModel.markLeaveInAttendance(leave.student_id, leave.from_date, leave.to_date);
      } else if (wasApproved) {
        await LeaveModel.clearLeaveInAttendance(leave.student_id, leave.from_date, leave.to_date);
      }

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: status === 'Approved' ? 'leave_approved' : status === 'Rejected' ? 'leave_rejected' : 'leave_cancelled',
        description: `${req.user.username} ${status.toLowerCase()} leave request #${req.params.id} for ${leave.name}`,
        relatedType: 'leave', relatedId: Number(req.params.id)
      });

      await NotificationModel.createNotification({
        title: status === 'Approved' ? '✅ Leave approved' : status === 'Rejected' ? '❌ Leave rejected' : '🚫 Leave cancelled',
        message: `${leave.name}'s leave (${leave.leave_type}, ${leave.from_date} → ${leave.to_date}) was ${status.toLowerCase()}`,
        type: status === 'Approved' ? 'success' : 'warning',
        userId: null,
        relatedType: 'leave', relatedId: Number(req.params.id)
      });

      const message = status === 'Approved'
        ? 'Leave approved and attendance marked'
        : `Leave ${status.toLowerCase()}`;
      res.json({ success: true, message });
    } catch (error) {
      console.error('Set leave status error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating leave status' });
    }
  },

  // DELETE /api/leaves/:id — delete a leave request
  async deleteLeave(req, res) {
    try {
      const leave = await LeaveModel.findById(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
      if (leave.status === 'Approved') {
        await LeaveModel.clearLeaveInAttendance(leave.student_id, leave.from_date, leave.to_date);
      }
      await LeaveModel.delete(req.params.id);

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'leave_deleted',
        description: `${req.user.username} deleted leave request #${req.params.id}`,
        relatedType: 'leave', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'Leave request deleted successfully' });
    } catch (error) {
      console.error('Delete leave error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting leave request' });
    }
  }
};

module.exports = LeaveController;
