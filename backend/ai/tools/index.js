// Tool registry — the whitelist of safe functions the AI layer may call.
// Nothing outside this registry can be executed by the AI providers.

const studentTools = require('./studentTools');
const analyticsTools = require('./analyticsTools');

const TOOLS = [
  {
    name: 'getStudentById',
    description: 'Get a single student record (demographics) by numeric student id.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: studentTools.getStudentById,
  },
  {
    name: 'getStudentAttendance',
    description: 'Attendance percentage and per-subject records for one student.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: studentTools.getStudentAttendance,
  },
  {
    name: 'getStudentMarks',
    description: 'Marks, grades and GPA per subject/exam for one student.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: studentTools.getStudentMarks,
  },
  {
    name: 'getStudentFees',
    description: 'Fee record, payment history and outstanding amount for one student.',
    roles: studentTools.ADMITTED_OR_ACCOUNTANT,
    handler: studentTools.getStudentFees,
  },
  {
    name: 'getStudentProfile',
    description: 'Combined snapshot (demographics, attendance, marks, fees) for one student.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: async (ctx, { id }) => {
      const base = await studentTools.getStudentById(ctx, { id });
      if (base.error) return base;
      const [att, marks, fees] = await Promise.all([
        studentTools.getStudentAttendance(ctx, { studentId: id }),
        studentTools.getStudentMarks(ctx, { studentId: id }),
        studentTools.getStudentFees(ctx, { studentId: id }),
      ]);
      return { ...base, attendance: att, marks, fees };
    },
  },
  {
    name: 'searchStudents',
    description: 'Search students using the validated filter object.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: studentTools.searchStudents,
  },
  {
    name: 'getRecentStudents',
    description: 'Most recently created student records.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: studentTools.getRecentStudents,
  },
  {
    name: 'getDashboardStatistics',
    description: 'College-wide totals, branch distribution, attendance/fee summary.',
    roles: studentTools.ADMITTED,
    handler: analyticsTools.getDashboardStatistics,
  },
  {
    name: 'getBranchStatistics',
    description: 'Per-branch student, CGPA, attendance and fee statistics.',
    roles: studentTools.ADMITTED,
    handler: analyticsTools.getBranchStatistics,
  },
  {
    name: 'getSemesterStatistics',
    description: 'Per-semester student and CGPA statistics.',
    roles: studentTools.ADMITTED,
    handler: analyticsTools.getSemesterStatistics,
  },
  {
    name: 'getAttendanceAlerts',
    description: 'Students with attendance below a threshold (default 75%).',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: analyticsTools.getAttendanceAlerts,
  },
  {
    name: 'getFeeAlerts',
    description: 'Students with Pending or Partially Paid fees and outstanding amounts.',
    roles: studentTools.ADMITTED_OR_ACCOUNTANT,
    handler: analyticsTools.getFeeAlerts,
  },
  {
    name: 'getClassPerformance',
    description: 'Average marks/pass-rate per subject and exam for a branch/semester.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: analyticsTools.getClassPerformance,
  },
  {
    name: 'getExaminationResults',
    description: 'Examination results and pass rate per student.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: analyticsTools.getExaminationResults,
  },
  {
    name: 'getSubjectList',
    description: 'List subjects, optionally filtered by branch/semester.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: analyticsTools.getSubjectList,
  },
  {
    name: 'getExaminationList',
    description: 'List examinations, optionally filtered by branch/semester.',
    roles: studentTools.ADMITTED_OR_TEACHER,
    handler: analyticsTools.getExaminationList,
  },
];

const byName = TOOLS.reduce((acc, t) => { acc[t.name] = t; return acc; }, {});

function canUse(user, toolName) {
  const tool = byName[toolName];
  if (!tool) return { ok: false, tool: null, error: `Unknown tool: ${toolName}` };
  if (!tool.roles.includes(user.role)) {
    return { ok: false, tool, error: `Your role (${user.role}) cannot call "${toolName}".` };
  }
  return { ok: true, tool };
}

module.exports = { TOOLS, byName, canUse };
