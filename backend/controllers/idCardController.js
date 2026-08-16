const IDCardModel = require('../models/idCardModel');
const { logActivity } = require('../utils/activity');

const IDCardController = {

  // GET /api/id-cards — list cards with filters
  async getCards(req, res) {
    try {
      const { search, status, page = 1, limit = 10 } = req.query;
      const result = await IDCardModel.findAll({
        search, status, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get ID cards error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching ID cards' });
    }
  },

  // GET /api/id-cards/summary
  async getSummary(req, res) {
    try {
      const summary = await IDCardModel.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get ID cards summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/id-cards/student/:studentId
  async getStudentCard(req, res) {
    try {
      const card = await IDCardModel.findByStudent(req.params.studentId);
      if (!card) return res.status(404).json({ success: false, message: 'No ID card issued for this student' });
      res.json({ success: true, data: card });
    } catch (error) {
      console.error('Get student ID card error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/id-cards/verify/:token — public verification (no auth)
  async verify(req, res) {
    try {
      const card = await IDCardModel.findByToken(req.params.token);
      if (!card) return res.status(404).json({ success: false, message: 'Invalid verification link' });
      res.json({ success: true, data: card });
    } catch (error) {
      console.error('Verify ID card error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/id-cards — generate/regenerate a card for a student
  async createCard(req, res) {
    try {
      const { studentId, issuedOn, validUntil } = req.body;
      if (!studentId) return res.status(400).json({ success: false, message: 'Student is required' });
      const card = await IDCardModel.upsert({
        studentId, issuedOn, validUntil, issuedBy: req.user.id
      });
      if (!card) return res.status(404).json({ success: false, message: 'Student not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'id_card_issued',
        description: `${req.user.username} issued ID card ${card.card_number} for ${card.name}`,
        relatedType: 'id_card', relatedId: card.id
      });

      res.status(201).json({ success: true, message: 'ID card issued', data: card });
    } catch (error) {
      console.error('Create ID card error:', error);
      res.status(500).json({ success: false, message: 'Server error while issuing ID card' });
    }
  },

  // PUT /api/id-cards/:id — update status/validity
  async updateCard(req, res) {
    try {
      const { status, issuedOn, validUntil } = req.body;
      const affected = await IDCardModel.update(req.params.id, { status, issuedOn, validUntil });
      if (!affected) return res.status(404).json({ success: false, message: 'ID card not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: status === 'Revoked' ? 'id_card_revoked' : 'id_card_updated',
        description: `${req.user.username} set ID card #${req.params.id} to ${status || 'Active'}`,
        relatedType: 'id_card', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'ID card updated' });
    } catch (error) {
      console.error('Update ID card error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating ID card' });
    }
  },

  // DELETE /api/id-cards/:id
  async deleteCard(req, res) {
    try {
      const card = await IDCardModel.delete(req.params.id);
      if (!card) return res.status(404).json({ success: false, message: 'ID card not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'id_card_deleted',
        description: `${req.user.username} deleted ID card ${card.card_number}`,
        relatedType: 'id_card', relatedId: Number(req.params.id)
      });

      res.json({ success: true, message: 'ID card deleted' });
    } catch (error) {
      console.error('Delete ID card error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting ID card' });
    }
  }
};

module.exports = IDCardController;
