// Input/output validation for AI endpoints.
// Every value flowing from natural language into a DB query is coerced and
// whitelisted here — the AI layer NEVER interpolates raw user text into SQL.

const aiConfig = require('./config');

const ALLOWED_BRANCHES = ['Civil', 'Computer Science', 'Electronics', 'Mechanical'];
const ALLOWED_GENDERS = ['Male', 'Female', 'Other'];
const ALLOWED_STATUSES = ['Active', 'Inactive'];
const ALLOWED_FEE_STATUSES = ['Paid', 'Partially Paid', 'Pending'];
const ALLOWED_INTENTS = [
  'count_students', 'list_students', 'search_students', 'attendance_alerts',
  'fee_alerts', 'academic_stats', 'branch_compare', 'risk_query', 'assistant',
];

const toNum = (v, fallback, min, max) => {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || Number.isNaN(n)) return fallback;
  if (min !== undefined && n < min) return fallback;
  if (max !== undefined && n > max) return fallback;
  return n;
};

const toStr = (v, maxLen, fallback) => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim().slice(0, maxLen || 200);
  return s || fallback;
};

const oneOf = (v, list, fallback) => {
  if (list.includes(v)) return v;
  return fallback;
};

// Whitelisted, coerced student filter schema. Keys map 1:1 to safe query params.
function validateFilters(raw = {}) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  const f = {
    search: toStr(r.search, 100, ''),
    branch: oneOf(r.branch, ALLOWED_BRANCHES, null),
    semester: toNum(r.semester, null, 1, 8),
    gender: oneOf(r.gender, ALLOWED_GENDERS, null),
    status: oneOf(r.status, ALLOWED_STATUSES, null),
    institute: toStr(r.institute, 255, ''),
    admissionYear: toNum(r.admissionYear, null, 1990, 2100),
    admissionYearAfter: toNum(r.admissionYearAfter, null, 1990, 2100),
    minCGPA: toNum(r.minCGPA, null, 0, 10),
    maxCGPA: toNum(r.maxCGPA, null, 0, 10),
    minAttendance: toNum(r.minAttendance, null, 0, 100),
    maxAttendance: toNum(r.maxAttendance, null, 0, 100),
    feeStatus: oneOf(r.feeStatus, ALLOWED_FEE_STATUSES, null),
    feeOutstandingMin: toNum(r.feeOutstandingMin, null, 0, 10000000),
    subjectId: toNum(r.subjectId, null, 1, 1000000),
    examName: toStr(r.examName, 150, ''),
    page: toNum(r.page, 1, 1, 1000),
    limit: toNum(r.limit, 20, 1, 50),
  };
  return f;
}

function validateIntent(raw = {}) {
  const r = (raw && typeof raw === 'object') ? raw : {};
  return {
    intent: oneOf(r.intent, ALLOWED_INTENTS, 'assistant'),
    filters: validateFilters(r.filters),
    limit: toNum(r.limit, 10, 1, 50),
  };
}

// A natural-language query must not exceed the configured prompt length.
function validateQuery(q) {
  if (typeof q !== 'string') return { ok: false, error: 'Query must be a string.' };
  const clean = q.trim().replace(/\s+/g, ' ');
  if (!clean) return { ok: false, error: 'Query is empty.' };
  if (clean.length > aiConfig.maxPromptLength) {
    return { ok: false, error: `Query exceeds the ${aiConfig.maxPromptLength} character limit.` };
  }
  return { ok: true, query: clean };
}

module.exports = {
  ALLOWED_BRANCHES,
  ALLOWED_GENDERS,
  ALLOWED_STATUSES,
  ALLOWED_FEE_STATUSES,
  ALLOWED_INTENTS,
  validateFilters,
  validateIntent,
  validateQuery,
  toNum,
  toStr,
};
