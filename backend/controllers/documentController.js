const DocumentModel = require('../models/documentModel');

const DocumentController = {

  // GET /api/documents — cross-student document listing with filters
  async getDocuments(req, res) {
    try {
      const { search, docType, page = 1, limit = 10 } = req.query;
      const result = await DocumentModel.findAll({
        search, docType,
        page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching documents' });
    }
  },

  // GET /api/documents/summary — doc-type distribution
  async getSummary(req, res) {
    try {
      const summary = await DocumentModel.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get documents summary error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = DocumentController;
