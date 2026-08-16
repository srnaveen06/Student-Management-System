// TeacherAI — class analytics for teachers (or admins). Summarizes a branch/
// semester class: performance, top students, at-risk students, attendance.

const analyticsTools = require('../tools/analyticsTools');
const riskService = require('./riskService');

async function getClassAnalysis({ branch, semester, subjectId, examName } = {}) {
  const performance = await analyticsTools.getClassPerformance(null, { branch, semester, subjectId, examName });
  const examResults = await analyticsTools.getExaminationResults(null, { branch, semester });
  const alerts = await analyticsTools.getAttendanceAlerts(null, { threshold: 75, branch, semester });
  const subjects = await analyticsTools.getSubjectList(null, { branch, semester });

  const studentIds = examResults.results.map(r => r.student_id);
  const risks = await Promise.all(studentIds.map(id => riskService.getStudentRisk(id).catch(() => null)));

  // One row per (student, exam); collapse to distinct students, a student
  // passed only if they passed every exam.
  const byId = {};
  examResults.results.forEach((r, i) => {
    const passedAll = Number(r.failed) === 0;
    if (!byId[r.student_id]) {
      byId[r.student_id] = {
        studentId: r.student_id, name: r.name, branch: r.branch, semester: r.semester,
        pctSum: 0, examCount: 0, passedAll: true, riskLevel: risks[i] ? risks[i].riskLevel : null,
      };
    }
    const s = byId[r.student_id];
    s.pctSum += Number(r.avgPct);
    s.examCount += 1;
    s.passedAll = s.passedAll && passedAll;
  });
  const students = Object.values(byId).map(s => ({
    studentId: s.studentId, name: s.name, branch: s.branch, semester: s.semester,
    averagePercentage: s.examCount ? Math.round((s.pctSum / s.examCount) * 10) / 10 : 0,
    passedAll: s.passedAll, riskLevel: s.riskLevel,
  }));

  const top = [...students].sort((a, b) => b.averagePercentage - a.averagePercentage).slice(0, 5);
  const atRisk = [...students].sort((a, b) => a.averagePercentage - b.averagePercentage).filter(s => s.riskLevel === 'HIGH' || s.averagePercentage < 50);

  const attendanceBelow = alerts.students.length;
  const failedAny = students.filter(s => !s.passedAll).length;

  return {
    scope: { branch: branch || 'All branches', semester: semester || 'All semesters', subjectId, examName: examName || null },
    summary: {
      subjectsCount: subjects.subjects.length,
      classAverage: performance.classAverage,
      passRate: examResults.passRate,
      studentsCount: students.length,
      attendanceBelowThreshold: attendanceBelow,
      failedAnySubject: failedAny,
      highRisk: atRisk.filter(s => s.riskLevel === 'HIGH').length,
    },
    subjects: performance.subjects,
    topStudents: top,
    atRiskStudents: atRisk.slice(0, 10),
    students,
  };
}

module.exports = { getClassAnalysis };
