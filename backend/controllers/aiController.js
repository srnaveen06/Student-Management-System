// AI controller — all /api/ai endpoints. Every handler validates input,
// delegates to a service, and records an audit entry.

const aiConfig = require('../ai/config');
const providers = require('../ai/providers');
const { validateQuery, validateFilters, validateIntent, toStr, toNum } = require('../ai/validators');
const conversations = require('../ai/conversationStore');
const { logActivity } = require('../ai/audit');
const aiSettings = require('../ai/settings');
const insightsService = require('../ai/services/insightsService');
const riskService = require('../ai/services/riskService');
const forecastService = require('../ai/services/forecastService');
const recommendationService = require('../ai/services/recommendationService');
const questionService = require('../ai/services/questionService');
const reportService = require('../ai/services/reportService');
const classAnalysisService = require('../ai/services/classAnalysisService');
const marksAnalysisService = require('../ai/services/marksAnalysisService');
const messageService = require('../ai/services/messageService');
const anomalyService = require('../ai/services/anomalyService');
const documentService = require('../ai/services/documentService');
const mlService = require('../ai/services/mlService');

const ROLES = ['super_admin', 'admin', 'teacher', 'accountant'];
const TEACHER_ROLE = ['super_admin', 'admin', 'teacher'];
const ACCOUNTANT_ROLE = ['super_admin', 'admin', 'accountant'];
const ADMIN_ROLE = ['super_admin', 'admin'];

function guard(res, roles, user) {
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: 'Access denied for your role.' });
    return false;
  }
  return true;
}

async function audit(req, entry) {
  const s = await aiSettings.getSettings();
  if (s.ai_logging_enabled === false) return;
  await logActivity({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    ipAddress: req.ip,
    ...entry,
  });
}

// ---------------------------------------------------------------- Chat
async function chat(req, res, next) {
  const v = validateQuery(req.body && req.body.message);
  if (!v.ok) return res.status(400).json({ error: v.error });
  try {
    const s = await aiSettings.getSettings();
    if (s.ai_assistant_enabled === false) {
      return res.status(403).json({ error: 'The CampusAI assistant is disabled.' });
    }
    const start = Date.now();
    let conversationId = toNum(req.body.conversationId, null, 1, 1e9);
    if (!conversationId) {
      conversationId = await conversations.createConversation(req.user.id);
    }
    const existing = await conversations.getMessages(req.user.id, conversationId);
    if (existing.length === 0 && conversationId) {
      // ensure ownership: getMessages returns [] for non-owned too; verify
      const owned = await conversations.listConversations(req.user.id);
      if (!owned.some(c => c.id === conversationId)) {
        return res.status(404).json({ error: 'Conversation not found.' });
      }
    }

    const history = existing.map(m => ({ role: m.role, content: m.content }));
    await conversations.addMessage(req.user.id, conversationId, { role: 'user', content: v.query, model: 'user' });

    const result = await providers.complete(req.user, v.query, { history });
    await conversations.addMessage(req.user.id, conversationId, {
      role: 'assistant', content: result.content, intent: result.intent,
      toolCalls: result.toolCalls, dataSources: result.dataSources,
      model: result.model, status: result.status || 'success',
    });

    await audit(req, {
      feature: 'assistant',
      prompt: v.query,
      toolCalls: result.toolCalls,
      dataSources: result.dataSources,
      status: result.status === 'error' ? 'error' : 'success',
      model: result.model,
      latencyMs: Date.now() - start,
      error: result.status === 'error' ? result.content : null,
    });

    res.json({
      conversationId,
      message: {
        role: 'assistant', content: result.content, intent: result.intent,
        toolCalls: result.toolCalls, dataSources: result.dataSources,
        model: result.model, status: result.status || 'success',
      },
      suggestions: [
        'How many students are enrolled?',
        'Who has attendance below 75%?',
        'Which students have pending fees?',
        'How many Computer Science students are there?',
        'Which branch has the highest CGPA?',
      ],
    });
  } catch (err) {
    await audit(req, { feature: 'assistant', prompt: v.query, status: 'error', error: err.message });
    next(err);
  }
}

async function listConversations(req, res, next) {
  try {
    const rows = await conversations.listConversations(req.user.id);
    res.json({ conversations: rows });
  } catch (err) { next(err); }
}

async function getConversation(req, res, next) {
  try {
    const id = toNum(req.params.id, null, 1, 1e9);
    if (!id) return res.status(400).json({ error: 'Invalid conversation id.' });
    const messages = await conversations.getMessages(req.user.id, id);
    res.json({ conversationId: id, messages });
  } catch (err) { next(err); }
}

async function deleteConversation(req, res, next) {
  try {
    const id = toNum(req.params.id, null, 1, 1e9);
    if (!id) return res.status(400).json({ error: 'Invalid conversation id.' });
    const ok = await conversations.deleteConversation(req.user.id, id);
    res.json({ deleted: ok });
  } catch (err) { next(err); }
}

// ------------------------------------------------------- Natural search
async function search(req, res, next) {
  const v = validateQuery(req.body && req.body.query);
  if (!v.ok) return res.status(400).json({ error: v.error });
  try {
    const start = Date.now();
    const { parseQuery } = require('../ai/services/intentParser');
    const { searchStudents } = require('../ai/tools/studentTools');
    const plan = parseQuery(v.query);
    const filters = validateFilters(plan.filters);
    if (plan.intent === 'count_students') {
      const countRes = await searchStudents(null, { ...filters, page: 1, limit: 50 });
      await audit(req, { feature: 'search', prompt: v.query, dataSources: [{ tool: 'searchStudents', rows: countRes.total }], model: 'local', latencyMs: Date.now() - start });
      return res.json({ query: v.query, intent: 'count_students', filters, total: countRes.total, results: [], message: `${countRes.total} student(s) match.` });
    }
    const r = await searchStudents(null, { ...filters, page: 1, limit: Math.min(plan.limit || 10, 50) });
    await audit(req, { feature: 'search', prompt: v.query, dataSources: [{ tool: 'searchStudents', rows: r.total }], model: 'local', latencyMs: Date.now() - start });
    res.json({
      query: v.query,
      intent: plan.intent,
      filters,
      total: r.total,
      results: r.students.map(st => ({
        id: st.id, studentId: st.student_id, name: st.name, email: st.email, phone: st.phone,
        branch: st.branch, semester: st.semester, cgpa: st.cgpa, status: st.status,
      })),
      message: `Found ${r.total} student(s) for: "${v.query}"`,
    });
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Dashboard insights
async function insights(req, res, next) {
  try {
    const start = Date.now();
    const list = await insightsService.generateInsights();
    await audit(req, { feature: 'insights', status: 'success', dataSources: [{ tool: 'generateInsights', rows: list.length }], model: 'local', latencyMs: Date.now() - start });
    res.json({ insights: list });
  } catch (err) { next(err); }
}

// ------------------------------------------------------------ Risk
async function studentRisk(req, res, next) {
  const id = toNum(req.params.id, null, 1, 1e9);
  if (!id) return res.status(400).json({ error: 'Invalid student id.' });
  try {
    const s = await aiSettings.getSettings();
    if (s.ai_risk_prediction_enabled === false) {
      return res.status(403).json({ error: 'Risk prediction is disabled.' });
    }
    const start = Date.now();
    const risk = await riskService.getStudentRisk(id);
    if (risk.error) return res.status(404).json({ error: risk.error });
    await riskService.savePrediction(id, risk, 'rule_based', 'rule-v1', null);
    await audit(req, { feature: 'risk', prompt: `student:${id}`, dataSources: [{ tool: 'getStudentRisk', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    res.json(risk);
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Attendance forecast
async function attendanceForecast(req, res, next) {
  const id = toNum(req.params.id, null, 1, 1e9);
  if (!id) return res.status(400).json({ error: 'Invalid student id.' });
  try {
    const start = Date.now();
    const forecast = await forecastService.getAttendanceForecast(id);
    await audit(req, { feature: 'attendance_forecast', prompt: `student:${id}`, dataSources: [{ tool: 'getAttendanceForecast', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    if (forecast.error) return res.status(404).json({ error: forecast.error });
    res.json(forecast);
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Study recommendations
async function recommendations(req, res, next) {
  const id = toNum(req.query.studentId || req.params.id, null, 1, 1e9);
  if (!id) return res.status(400).json({ error: 'Invalid student id.' });
  try {
    const start = Date.now();
    const recs = await recommendationService.getRecommendations(id);
    await audit(req, { feature: 'study_recommendations', prompt: `student:${id}`, dataSources: [{ tool: 'getRecommendations', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    if (recs.error) return res.status(404).json({ error: recs.error });
    res.json(recs);
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Question generator
async function questionGenerator(req, res, next) {
  if (!guard(res, TEACHER_ROLE, req.user)) return;
  const body = req.body || {};
  try {
    const start = Date.now();
    const result = await questionService.generateQuestions({
      subjectId: toNum(body.subjectId, null, 1, 1e9),
      examName: toStr(body.examName, 150, ''),
      count: toNum(body.count, 5, 1, 20),
      difficulty: toStr(body.difficulty, 20, ''),
      types: Array.isArray(body.types) ? body.types : [],
      userId: req.user.id,
    });
    await audit(req, { feature: 'question_generator', prompt: JSON.stringify({ subjectId: body.subjectId, count: body.count }), dataSources: [{ tool: 'generateQuestions', rows: result.count }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

async function listQuestions(req, res, next) {
  if (!guard(res, TEACHER_ROLE, req.user)) return;
  try {
    const pool = require('../config/db');
    const n = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const [data] = await pool.query(
      `SELECT q.id, q.subject_id, su.subject_name, q.exam_name, q.question_type, q.difficulty, q.question, q.marks, q.status, q.created_at
       FROM ai_generated_questions q LEFT JOIN subjects su ON su.id = q.subject_id
       WHERE q.user_id = ? ORDER BY q.created_at DESC LIMIT ?`, [req.user.id, n]);
    res.json({ questions: data });
  } catch (err) { next(err); }
}

// ------------------------------------------------------------ Reports
async function generateReport(req, res, next) {
  const body = req.body || {};
  const type = toStr(body.type, 30, '');
  try {
    const start = Date.now();
    const report = await reportService.generateReport({
      type,
      filters: body.filters && typeof body.filters === 'object' ? body.filters : {},
      userId: req.user.id,
    });
    if (report.error) return res.status(400).json({ error: report.error });
    await audit(req, { feature: 'report', prompt: JSON.stringify({ type, filters: body.filters }), dataSources: [{ tool: 'generateReport', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    res.json({ report });
  } catch (err) { next(err); }
}

async function listReports(req, res, next) {
  try {
    const data = await reportService.listReports(req.user.id, { limit: req.query.limit });
    res.json(data);
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Class analysis
async function classAnalysis(req, res, next) {
  if (!guard(res, TEACHER_ROLE, req.user)) return;
  try {
    const start = Date.now();
    const f = req.query || {};
    const result = await classAnalysisService.getClassAnalysis({
      branch: toStr(f.branch, 50, ''),
      semester: toNum(f.semester, null, 1, 8),
      subjectId: toNum(f.subjectId, null, 1, 1e9),
      examName: toStr(f.examName, 150, ''),
    });
    await audit(req, { feature: 'class_analysis', prompt: JSON.stringify(f), dataSources: [{ tool: 'getClassAnalysis', rows: result.summary.studentsCount }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

// ------------------------------------------------------ Marks analysis
async function marksAnalysis(req, res, next) {
  const id = toNum(req.params.id || req.query.studentId, null, 1, 1e9);
  if (!id) return res.status(400).json({ error: 'Invalid student id.' });
  try {
    const start = Date.now();
    const result = await marksAnalysisService.getMarksAnalysis(id);
    await audit(req, { feature: 'marks_analysis', prompt: `student:${id}`, dataSources: [{ tool: 'getMarksAnalysis', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
}

// ------------------------------------------------------------ Fee risk
async function feeRisk(req, res, next) {
  try {
    const start = Date.now();
    const result = await forecastService.getFeeRisk();
    await audit(req, { feature: 'fee_risk', dataSources: [{ tool: 'getFeeRisk', rows: result.list.length }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

// ----------------------------------------------------------- Anomalies
async function anomalies(req, res, next) {
  try {
    const start = Date.now();
    const result = await anomalyService.detectAnomalies();
    await audit(req, { feature: 'anomaly', dataSources: [{ tool: 'detectAnomalies', rows: result.count }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

// -------------------------------------------------- Notification generator
async function generateMessages(req, res, next) {
  const body = req.body || {};
  const type = toStr(body.type, 30, '');
  try {
    const start = Date.now();
    const result = await messageService.generateBatch({
      type,
      branch: toStr(body.branch, 50, ''),
      semester: toNum(body.semester, null, 1, 8),
      limit: toNum(body.limit, 10, 1, 50),
    });
    await audit(req, { feature: 'message_generator', prompt: JSON.stringify(body), dataSources: [{ tool: 'generateBatch', rows: result.count }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

// --------------------------------------------------- Document intelligence
async function documentExtract(req, res, next) {
  try {
    const body = req.body || {};
    const studentId = toNum(body.studentId, null, 1, 1e9);
    if (!studentId) return res.status(400).json({ error: 'studentId is required.' });
    const file = req.file;
    const textContent = file && file.buffer ? file.buffer.toString('utf8').slice(0, 50000) : '';
    const start = Date.now();
    const result = await documentService.extractDocument({
      studentId,
      docType: toStr(body.docType, 30, 'other'),
      fileName: file ? file.originalname : '',
      mimeType: file ? file.mimetype : '',
      textContent,
    });
    await audit(req, { feature: 'document_extract', prompt: `student:${studentId}`, dataSources: [{ tool: 'extractDocument', rows: 1 }], model: 'local', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

async function listExtractions(req, res, next) {
  try {
    const result = await documentService.getExtractions({ limit: req.query.limit });
    res.json(result);
  } catch (err) { next(err); }
}

async function applyExtraction(req, res, next) {
  try {
    const id = toNum(req.params.id, null, 1, 1e9);
    if (!id) return res.status(400).json({ error: 'Invalid extraction id.' });
    const result = await documentService.applyExtraction({ id, userId: req.user.id });
    res.json(result);
  } catch (err) { next(err); }
}

// ----------------------------------------------------------------- ML
async function mlTrain(req, res, next) {
  if (!guard(res, ADMIN_ROLE, req.user)) return;
  try {
    const start = Date.now();
    const result = await mlService.trainModel(req.user.id);
    await audit(req, { feature: 'ml_train', dataSources: [{ tool: 'trainModel', rows: result.metrics ? result.metrics.sampleCount : 0 }], model: 'ml', latencyMs: Date.now() - start });
    res.json(result);
  } catch (err) { next(err); }
}

async function mlPredict(req, res, next) {
  if (!guard(res, ADMIN_ROLE, req.user)) return;
  const id = toNum(req.params.id, null, 1, 1e9);
  if (!id) return res.status(400).json({ error: 'Invalid student id.' });
  try {
    const start = Date.now();
    const result = await mlService.predictWithModel(id);
    await audit(req, { feature: 'ml_predict', prompt: `student:${id}`, dataSources: [{ tool: 'predictWithModel', rows: 1 }], model: 'ml', latencyMs: Date.now() - start });
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) { next(err); }
}

async function mlModelInfo(req, res, next) {
  try {
    const model = await mlService.getActiveModel();
    res.json({ model });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------- Activity log
async function activity(req, res, next) {
  if (!guard(res, ADMIN_ROLE, req.user)) return;
  try {
    const n = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const pool = require('../config/db');
    const [rows] = await pool.query(
      `SELECT id, username, role, feature, prompt, tool_calls, data_sources, status, model, latency_ms, error, created_at
       FROM ai_activity_logs ORDER BY id DESC LIMIT ?`, [n]);
    res.json({ logs: rows });
  } catch (err) { next(err); }
}

// ------------------------------------------------------------ Features
async function features(req, res, next) {
  try {
    const s = await aiSettings.getSettings();
    const role = req.user.role;
    res.json({
      aiEnabled: s.ai_enabled !== false,
      assistantEnabled: s.ai_assistant_enabled !== false,
      searchEnabled: s.ai_search_enabled !== false,
      insightsEnabled: s.ai_insights_enabled !== false,
      riskEnabled: s.ai_risk_prediction_enabled !== false,
      documentEnabled: s.ai_document_processing_enabled !== false,
      loggingEnabled: s.ai_logging_enabled !== false,
      provider: aiConfig.provider,
      role,
      permissions: {
        admin: ADMIN_ROLE.includes(role),
        teacher: TEACHER_ROLE.includes(role),
        accountant: ACCOUNTANT_ROLE.includes(role),
      },
    });
  } catch (err) { next(err); }
}

// ------------------------------------------------------------ Settings
async function getAiSettings(req, res, next) {
  if (!guard(res, ADMIN_ROLE, req.user)) return;
  try {
    const s = await aiSettings.getSettings(true);
    res.json({ settings: s });
  } catch (err) { next(err); }
}

async function updateAiSettings(req, res, next) {
  if (!guard(res, ADMIN_ROLE, req.user)) return;
  try {
    const updated = await aiSettings.updateSettings(req.body && typeof req.body === 'object' ? req.body : {});
    res.json({ settings: updated });
  } catch (err) { next(err); }
}

module.exports = {
  chat, listConversations, getConversation, deleteConversation,
  search, insights, studentRisk, attendanceForecast, recommendations,
  questionGenerator, listQuestions, generateReport, listReports,
  classAnalysis, marksAnalysis, feeRisk, anomalies, generateMessages,
  documentExtract, listExtractions, applyExtraction,
  mlTrain, mlPredict, mlModelInfo, activity, features, getAiSettings, updateAiSettings,
};
