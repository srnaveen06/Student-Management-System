const FeeModel = require('../models/feeModel');
const { logActivity } = require('../utils/activity');

const FeeController = {

  // GET /api/fees — List fees with filters
  async getFees(req, res) {
    try {
      const { search, status, branch, semester, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
      const result = await FeeModel.findAllFees({
        search, status, branch, semester, dateFrom, dateTo,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get fees error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching fees' });
    }
  },

  // GET /api/fees/summary — Dashboard fee summary
  async getSummary(req, res) {
    try {
      const summary = await FeeModel.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get fee summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/fees/payments — Payments list (filtered by feeId/studentId)
  async getPayments(req, res) {
    try {
      const { feeId, studentId, page = 1, limit = 50 } = req.query;
      const payments = await FeeModel.getPayments({ feeId, studentId, page: parseInt(page), limit: parseInt(limit) });
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/fees/:id — Single fee with payments
  async getFee(req, res) {
    try {
      const fee = await FeeModel.findFeeById(req.params.id);
      if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
      const payments = await FeeModel.getPayments({ feeId: fee.id });
      res.json({ success: true, data: { ...fee, payments } });
    } catch (error) {
      console.error('Get fee error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/fees — Assign a fee to a student
  async assignFee(req, res) {
    try {
      const { studentId, totalFees, dueDate } = req.body;
      if (!studentId) return res.status(400).json({ success: false, message: 'Student is required' });
      if (!totalFees || Number(totalFees) <= 0) {
        return res.status(400).json({ success: false, message: 'Total fees must be greater than zero' });
      }

      const fee = await FeeModel.assignFee({ studentId, totalFees, dueDate, createdBy: req.user.id });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'fee_assigned',
        description: `${req.user.username} assigned fees of ${totalFees} to student #${studentId}`,
        relatedType: 'fee', relatedId: fee.id
      });

      res.status(201).json({ success: true, message: 'Fees assigned successfully', data: fee });
    } catch (error) {
      console.error('Assign fee error:', error);
      res.status(500).json({ success: false, message: 'Server error while assigning fees' });
    }
  },

  // POST /api/fees/payments — Record a payment
  async recordPayment(req, res) {
    try {
      const { feeId, studentId, amount, paymentDate, method, reference } = req.body;
      if (!feeId || !studentId) return res.status(400).json({ success: false, message: 'Fee and student are required' });
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      }
      if (!paymentDate) return res.status(400).json({ success: false, message: 'Payment date is required' });

      try {
        const result = await FeeModel.recordPayment({
          feeId, studentId, amount, paymentDate, method, reference, recordedBy: req.user.id
        });

        logActivity({
          userId: req.user.id, username: req.user.username,
          action: 'payment_received',
          description: `${req.user.username} recorded payment of ${amount} (${result.receiptNumber}) for fee #${feeId}`,
          relatedType: 'fee', relatedId: Number(feeId)
        });

        res.status(201).json({ success: true, message: 'Payment recorded successfully', data: result });
      } catch (err) {
        if (err.message && err.message.startsWith('Payment exceeds')) {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Fee not found') {
          return res.status(404).json({ success: false, message: 'Fee not found' });
        }
        throw err;
      }
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ success: false, message: 'Server error while recording payment' });
    }
  },

  // PUT /api/fees/payments/:id — Edit a payment
  async editPayment(req, res) {
    try {
      const { amount, paymentDate, method, reference } = req.body;
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      }
      try {
        await FeeModel.editPayment(req.params.id, { amount, paymentDate, method, reference });
      } catch (err) {
        if (err.message === 'Payment not found') {
          return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        if (err.message && err.message.startsWith('Payment exceeds')) {
          return res.status(400).json({ success: false, message: err.message });
        }
        throw err;
      }

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'payment_updated',
        description: `${req.user.username} updated payment #${req.params.id}`,
        relatedType: 'fee'
      });

      res.json({ success: true, message: 'Payment updated successfully' });
    } catch (error) {
      console.error('Edit payment error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating payment' });
    }
  },

  // DELETE /api/fees/payments/:id — Delete/cancel a payment
  async deletePayment(req, res) {
    try {
      try {
        await FeeModel.deletePayment(req.params.id);
      } catch (err) {
        if (err.message === 'Payment not found') {
          return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        throw err;
      }

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'payment_deleted',
        description: `${req.user.username} deleted payment #${req.params.id}`,
        relatedType: 'fee'
      });

      res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
      console.error('Delete payment error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting payment' });
    }
  }
};

module.exports = FeeController;
