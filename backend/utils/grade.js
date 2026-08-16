// Configurable grade logic. The thresholds follow the specification:
// 90-100 A+, 80-89 A, 70-79 B+, 60-69 B, 50-59 C, 40-49 D, below 40 F
const GRADE_RULES = [
  { min: 90, grade: 'A+', gpa: 10.0 },
  { min: 80, grade: 'A',  gpa: 9.0 },
  { min: 70, grade: 'B+', gpa: 8.0 },
  { min: 60, grade: 'B',  gpa: 7.0 },
  { min: 50, grade: 'C',  gpa: 6.0 },
  { min: 40, grade: 'D',  gpa: 5.0 },
  { min: 0,  grade: 'F',  gpa: 0.0 }
];

// Given a percentage (0-100), return { grade, gpa }
const getGrade = (percentage) => {
  const value = Number(percentage);
  if (Number.isNaN(value)) return { grade: null, gpa: null };
  const rule = GRADE_RULES.find(r => value >= r.min) || GRADE_RULES[GRADE_RULES.length - 1];
  return { grade: rule.grade, gpa: rule.gpa };
};

// Clamp a numeric mark to a range
const clampMark = (value, max) => {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(num, Number(max) || 0));
};

module.exports = { getGrade, clampMark, GRADE_RULES };
