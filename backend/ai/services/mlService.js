// Baseline ML pipeline. Trains a small logistic-regression model on
// rule-derived risk labels using feature engineering over real data, stores
// versioned metrics, and can predict risk. If no model is active the caller
// falls back to rule-based scoring. This is a transparent baseline — the
// rule-based path remains the primary risk source.

const pool = require('../../config/db');
const riskService = require('./riskService');

const MODEL_NAME = 'student_risk_baseline';
const VERSION = 'v1';

function sigmoid(z) {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

function featureVector({ attendance, avgMarks, feeRatio, semester, inactive }) {
  return [1, attendance / 100, avgMarks / 100, feeRatio, (semester || 1) / 8, inactive ? 1 : 0];
}

async function collectSamples() {
  const risks = await riskService.batchRisk();
  return risks.filter(r => !r.error).map(r => ({
    studentId: r.student.id,
    attendance: r.data.attendancePct,
    avgMarks: r.data.averagePct,
    feeRatio: r.data.totalFees ? r.data.outstanding / r.data.totalFees : 0,
    semester: r.student.semester,
    inactive: r.student.status === 'Inactive',
    label: r.riskScore >= 70 ? 1 : 0,
    ruleRiskScore: r.riskScore,
  }));
}

function trainLogistic(samples, { epochs = 2000, lr = 0.05 } = {}) {
  const n = samples.length;
  const w = [0, 0, 0, 0, 0, 0];
  for (let epoch = 0; epoch < epochs; epoch++) {
    const grads = [0, 0, 0, 0, 0, 0];
    for (const s of samples) {
      const x = featureVector(s);
      const pred = sigmoid(x.reduce((a, xi, i) => a + w[i] * xi, 0));
      const err = pred - s.label;
      for (let i = 0; i < x.length; i++) grads[i] += err * x[i];
    }
    for (let i = 0; i < w.length; i++) w[i] -= (lr / n) * grads[i];
  }
  return w;
}

function accuracy(samples, w) {
  if (!samples.length) return 0;
  let correct = 0;
  for (const s of samples) {
    const x = featureVector(s);
    const pred = sigmoid(x.reduce((a, xi, i) => a + w[i] * xi, 0)) >= 0.5 ? 1 : 0;
    if (pred === s.label) correct += 1;
  }
  return Math.round((correct / samples.length) * 1000) / 10;
}

async function getActiveModel() {
  const [rows] = await pool.query(
    `SELECT id, name, version, algorithm, metrics FROM ai_model_versions WHERE name = ? AND status = 'active' ORDER BY trained_at DESC LIMIT 1`,
    [MODEL_NAME]
  );
  return rows[0] || null;
}

async function trainModel(userId) {
  const samples = await collectSamples();
  if (samples.length < 6) {
    return { error: `Insufficient data to train a baseline (need ≥ 6 students, found ${samples.length}).` };
  }
  // 80/20 split (shuffled deterministically by studentId).
  const shuffled = [...samples].sort((a, b) => a.studentId - b.studentId);
  const splitAt = Math.floor(shuffled.length * 0.8);
  const train = shuffled.slice(0, splitAt);
  const test = shuffled.slice(splitAt);

  const w = trainLogistic(train);
  const trainAcc = accuracy(train, w);
  const testAcc = accuracy(test, w);
  const predictedLabels = samples.map(s => sigmoid(featureVector(s).reduce((a, xi, i) => a + w[i] * xi, 0)) >= 0.5 ? 1 : 0);

  const metrics = {
    coefficients: w,
    trainAccuracy: trainAcc,
    validationAccuracy: testAcc,
    sampleCount: samples.length,
    trainCount: train.length,
    testCount: test.length,
    highRisk: samples.filter(s => s.label === 1).length,
    predictedHighRisk: predictedLabels.filter(x => x === 1).length,
    features: ['bias', 'attendance', 'avgMarks', 'feeRatio', 'semester', 'inactive'],
    note: 'Baseline logistic regression trained on rule-derived risk labels.',
  };

  // Retire any active baseline and compute the next version.
  await pool.query(`UPDATE ai_model_versions SET status = 'retired' WHERE name = ? AND status = 'active'`, [MODEL_NAME]);
  const [prev] = await pool.query('SELECT version FROM ai_model_versions WHERE name = ? ORDER BY trained_at DESC LIMIT 1', [MODEL_NAME]);
  let version = VERSION;
  if (prev.length) {
    const m = String(prev[0].version).match(/^v(\d+)$/);
    version = m ? `v${Number(m[1]) + 1}` : `${prev[0].version}-${Date.now()}`;
  }
  const [r] = await pool.query(
    `INSERT INTO ai_model_versions (name, version, algorithm, status, metrics, sample_count, trained_by)
     VALUES (?,?,?, 'active', ?, ?, ?)`,
    [MODEL_NAME, version, 'logistic_regression_baseline', JSON.stringify(metrics), samples.length, userId]
  );
  return { id: r.insertId, name: MODEL_NAME, version, algorithm: 'logistic_regression_baseline', status: 'active', metrics };
}

async function predictWithModel(studentId) {
  const model = await getActiveModel();
  const ruleRisk = await riskService.getStudentRisk(studentId);
  if (ruleRisk.error) return ruleRisk;
  if (!model) {
    // Rule-based fallback (persist as rule_based).
    await riskService.savePrediction(studentId, ruleRisk, 'rule_based', 'rule-v1', null);
    return { modelUsed: null, prediction: ruleRisk, source: 'rule_based' };
  }
  const metrics = typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model.metrics;
  const x = featureVector({
    attendance: ruleRisk.data.attendancePct,
    avgMarks: ruleRisk.data.averagePct,
    feeRatio: ruleRisk.data.totalFees ? ruleRisk.data.outstanding / ruleRisk.data.totalFees : 0,
    semester: ruleRisk.student.semester,
    inactive: ruleRisk.student.status === 'Inactive',
  });
  const prob = sigmoid(x.reduce((a, xi, i) => a + metrics.coefficients[i] * xi, 0));
  const predicted = { ...ruleRisk, riskScore: Math.round(prob * 100), riskLevel: prob >= 0.5 ? 'HIGH' : ruleRisk.riskLevel };
  await riskService.savePrediction(studentId, predicted, 'ml', model.version, Math.round(Math.abs(prob - 0.5) * 2 * 100) / 100);
  return {
    modelUsed: { name: model.name, version: model.version, algorithm: model.algorithm },
    prediction: predicted,
    source: 'ml',
    probability: Math.round(prob * 1000) / 10,
  };
}

module.exports = { trainModel, predictWithModel, getActiveModel, MODEL_NAME };
