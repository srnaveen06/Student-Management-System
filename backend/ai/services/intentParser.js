// Deterministic natural-language intent parser used by the LOCAL provider.
// Maps a free-text query to a validated intent + safe tool call(s). The OpenAI
// provider uses the same tools but decides them itself via function-calling.

const { validateFilters } = require('../validators');

const BRANCH_ALIASES = {
  civil: 'Civil',
  'computer science': 'Computer Science',
  'computer': 'Computer Science',
  'cs': 'Computer Science',
  'cse': 'Computer Science',
  electronics: 'Electronics',
  ece: 'Electronics',
  'electronics and communication': 'Electronics',
  mechanical: 'Mechanical',
  me: 'Mechanical',
  'mechanical engineering': 'Mechanical',
};

const SEM_WORDS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
};
const SEM_ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };

function findBranch(tokens) {
  // Branch phrases can span two tokens ("computer science").
  for (let i = 0; i < tokens.length; i++) {
    if (BRANCH_ALIASES[tokens[i]]) return BRANCH_ALIASES[tokens[i]];
    const two = `${tokens[i]} ${tokens[i + 1] || ''}`.trim();
    if (BRANCH_ALIASES[two]) return BRANCH_ALIASES[two];
  }
  return null;
}

function findSemester(text, tokens) {
  // "sem 5", "semester 5", "5th semester", "fifth semester", "sem iii"
  let m = text.match(/sem(?:ester)?\s*(?:no\.?\s*)?(\d{1,2})/i);
  if (m) { const n = Number(m[1]); if (n >= 1 && n <= 8) return n; }
  m = text.match(/(\d{1,2})(?:st|nd|rd|th)\s+sem(?:ester)?/i);
  if (m) { const n = Number(m[1]); if (n >= 1 && n <= 8) return n; }
  m = text.match(/sem(?:ester)?\s*(?:no\.?\s*)?(i{1,3}|iv|v|vi|vii|viii)/i);
  if (m && SEM_ROMAN[m[1].toLowerCase()]) return SEM_ROMAN[m[1].toLowerCase()];
  for (const t of tokens) {
    if (SEM_WORDS[t]) return SEM_WORDS[t];
  }
  return null;
}

function findNumber(text, contextWords) {
  // Pull a number whose preceding context suggests a threshold.
  const re = new RegExp(`(${contextWords.join('|')})\\s*(?:of\\s*)?(>=|<=|above|below|more than|less than|greater than|under|at least|over)?\\s*(\\d+(?:\\.\\d+)?|\\d+%?)`, 'i');
  const m = text.match(re);
  if (m) return Number(m[2].replace('%', ''));
  return null;
}

function findGender(tokens) {
  for (const t of tokens) {
    if (/\bfemale\b/.test(t) || /^(girls|women)$/.test(t)) return 'Female';
  }
  for (const t of tokens) {
    if (/\bmale\b/.test(t) || /^(boys|men)$/.test(t)) return 'Male';
  }
  return null;
}

function findYear(text) {
  let m = text.match(/admitted?\s+(?:in|during|at|year)\s+(\d{4})/i);
  if (m) return { year: Number(m[1]), mode: 'eq' };
  m = text.match(/joined\s+(?:this\s+)?year/i);
  if (m) return { year: 2026, mode: 'eq' };
  m = text.match(/(\d{4})\s*(?:admission|batch|intake)?/);
  if (m && /(?:20|19)\d{2}/.test(m[1])) return { year: Number(m[1]), mode: 'eq' };
  return null;
}

function buildCalls(calls) {
  return calls.map(({ name, params, summary }) => ({ name, params, summary }));
}

/**
 * Parse a user query into an executable plan.
 * Returns { intent, filters, limit, toolCalls, renderKey, note }
 */
function parseQuery(rawQuery) {
  const text = String(rawQuery || '').toLowerCase().replace(/[^\w\s%₹.()/-]/g, ' ').replace(/\s+/g, ' ');
  const tokens = text.split(' ').filter(Boolean);
  const filters = validateFilters({});
  const q = text;

  const branch = findBranch(tokens);
  if (branch) filters.branch = branch;
  const semester = findSemester(q, tokens);
  if (semester) filters.semester = semester;
  const gender = findGender(tokens);
  if (gender) filters.gender = gender;

  const isCount = /(how many|count of|count|number of|total students|how much)/.test(q);
  const hasList = /(show|list|find|which|who|whose|all|any|every)/.test(q);
  const hasRisk = /(risk|at risk|failing|struggling|in danger|dropout|academic risk)/.test(q);
  const hasAtt = /(attendance|absent|present)/.test(q);
  const hasFee = /(fee|fees|payment|dues|outstanding|dues|pay)/.test(q);
  const hasMarks = /(marks|exam|result|grade|cgpa|gpa|score|performance|failed)/.test(q);
  const hasCompare = /(highest|best|top|compare|comparison|above|below|average)/.test(q);
  const hasAlerts = /(alert|warn|warning|monitor|low)/.test(q);
  const hasBelow = /(below|less than|under|at most|maximum|≤|<)/.test(q);
  const hasAbove = /(above|more than|over|at least|minimum|≥|>|greater)/.test(q);

  // Attendance threshold
  if (hasAtt) {
    const m = q.match(/(\d+(?:\.\d+)?)%?/);
    if (hasBelow) filters.maxAttendance = m ? Number(m[1]) : 75;
    else if (hasAbove) filters.minAttendance = m ? Number(m[1]) : 75;
  }
  // CGPA / marks threshold
  if (hasMarks) {
    const m = q.match(/(\d+(?:\.\d+)?)\s*(?:cgpa|gpa|percent|%|marks)?/);
    const num = m ? Number(m[1]) : null;
    if (hasAbove && num !== null) { if (q.includes('cgpa') || q.includes('gpa')) filters.minCGPA = num; else filters.minAttendance = num; }
    else if (hasBelow && num !== null) { if (q.includes('cgpa') || q.includes('gpa')) filters.maxCGPA = num; else filters.maxAttendance = num; }
  }
  // Fee status
  if (hasFee) {
    if (/pending|unpaid|not paid|due|overdue/.test(q)) filters.feeStatus = 'Pending';
    else if (/partially/.test(q)) filters.feeStatus = 'Partially Paid';
    else if (/fully|paid|cleared/.test(q)) filters.feeStatus = 'Paid';
  }
  // Status
  if (/inactive|not active/.test(q)) filters.status = 'Inactive';
  else if (/active/.test(q)) filters.status = 'Active';
  // Year
  const year = findYear(q);
  if (year && year.mode === 'eq') filters.admissionYear = year.year;

  let intent = 'assistant';
  let toolCalls = [];
  let renderKey = 'fallback';
  let limit = 10;

  if (hasRisk) {
    intent = 'risk_query';
    toolCalls = buildCalls([{ name: 'searchStudents', params: { ...filters, limit: 50 }, summary: 'Find students matching the query.' }]);
    renderKey = 'risk';
  } else if (isCount) {
    intent = 'count_students';
    toolCalls = buildCalls([{ name: 'searchStudents', params: { ...filters, limit: 1 }, summary: 'Count students matching filters.' }]);
    renderKey = 'count';
  } else if (hasAtt && hasAlerts) {
    intent = 'attendance_alerts';
    const threshold = filters.maxAttendance || 75;
    toolCalls = buildCalls([{
      name: 'getAttendanceAlerts',
      params: { threshold, branch: filters.branch || undefined, semester: filters.semester || undefined },
      summary: `Students with attendance below ${threshold}%.`,
    }]);
    renderKey = 'attendance_alerts';
  } else if (hasFee && hasAlerts) {
    intent = 'fee_alerts';
    toolCalls = buildCalls([{
      name: 'getFeeAlerts',
      params: { branch: filters.branch || undefined, semester: filters.semester || undefined },
      summary: 'Students with pending or partially paid fees.',
    }]);
    renderKey = 'fee_alerts';
  } else if (hasCompare && hasMarks) {
    intent = 'branch_compare';
    toolCalls = buildCalls([{ name: 'getBranchStatistics', params: {}, summary: 'Branch-level CGPA/attendance/fee statistics.' }]);
    renderKey = 'branch_compare';
  } else if (hasMarks && !hasList) {
    intent = 'academic_stats';
    toolCalls = buildCalls([{ name: 'getClassPerformance', params: { branch: filters.branch || undefined, semester: filters.semester || undefined }, summary: 'Average performance per subject.' }]);
    renderKey = 'academic_stats';
  } else if (hasList || hasAtt || hasFee) {
    intent = 'search_students';
    toolCalls = buildCalls([{ name: 'searchStudents', params: { ...filters, limit: 50 }, summary: 'Find matching students.' }]);
    renderKey = 'list';
  } else if (branch || semester || gender || filters.feeStatus || filters.status || filters.admissionYear) {
    // A bare filter query (e.g. "female Electronics students") is a search.
    intent = 'search_students';
    toolCalls = buildCalls([{ name: 'searchStudents', params: { ...filters, limit: 50 }, summary: 'Find matching students.' }]);
    renderKey = 'list';
  } else {
    intent = 'assistant';
    toolCalls = buildCalls([{ name: 'getDashboardStatistics', params: {}, summary: 'College overview statistics.' }]);
    renderKey = 'overview';
  }

  return { intent, filters, limit, toolCalls, renderKey, note: null };
}

module.exports = { parseQuery };
