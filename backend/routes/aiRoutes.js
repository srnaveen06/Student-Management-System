// AI platform routes. All routes require authentication + AI role, and are
// rate-limited. Feature flags are enforced per endpoint.

const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const { requireAIRole, requireFeature } = require('../middleware/aiMiddleware');
const { aiRateLimiter } = require('../middleware/aiRateLimiter');
const aiDocumentUpload = require('../middleware/aiDocumentUpload');
const c = require('../controllers/aiController');

router.use(auth, requireAIRole, aiRateLimiter);

// CampusAI assistant
router.post('/chat', requireFeature('assistant'), c.chat);
router.get('/conversations', c.listConversations);
router.get('/conversations/:id', c.getConversation);
router.delete('/conversations/:id', c.deleteConversation);

// Natural-language search
router.post('/search', requireFeature('search'), c.search);

// Dashboard insights
router.get('/dashboard-insights', requireFeature('insights'), c.insights);

// Student analytics
router.get('/student/:id/risk', requireFeature('risk_prediction'), c.studentRisk);
router.get('/student/:id/attendance-forecast', requireFeature('risk_prediction'), c.attendanceForecast);
router.get('/study-recommendations', c.recommendations);
router.get('/student/:id/study-recommendations', c.recommendations);
router.get('/student/:id/marks-analysis', c.marksAnalysis);

// TeacherAI
router.get('/class-analysis', c.classAnalysis);

// Generators
router.post('/question-generator', c.questionGenerator);
router.get('/questions', c.listQuestions);
router.post('/report', c.generateReport);
router.get('/reports', c.listReports);
router.post('/message-generator', c.generateMessages);

// Analytics
router.get('/fee-risk', c.feeRisk);
router.get('/anomaly-detection', c.anomalies);

// Document intelligence
router.post('/document-extract', aiDocumentUpload.single('file'), c.documentExtract);
router.get('/document-extractions', c.listExtractions);
router.post('/document-extractions/:id/apply', c.applyExtraction);

// ML pipeline
router.post('/ml/train', c.mlTrain);
router.get('/ml/model', c.mlModelInfo);
router.post('/ml/predict/:id', c.mlPredict);

// Audit + settings
router.get('/activity', c.activity);
router.get('/features', c.features);
router.get('/settings', c.getAiSettings);
router.post('/settings', c.updateAiSettings);

module.exports = router;
