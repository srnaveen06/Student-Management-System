// Marks analysis per student: per-subject performance, trend across exams,
// weakest/strongest subjects, and GPA breakdown.

const studentTools = require('../tools/studentTools');

async function getMarksAnalysis(studentId) {
  const marks = await studentTools.getStudentMarks(null, { studentId });
  if (marks.error) return marks;
  if (!marks.subjects.length) return { studentId, note: 'No marks recorded for this student.' };

  const perSubject = marks.subjects.map(s => ({
    subject: s.subjectName,
    code: s.subjectCode,
    averagePercentage: s.averagePercentage,
    averageGpa: s.averageGpa,
    trend: s.exams.length > 1
      ? (Number(s.exams[s.exams.length - 1].percentage) - Number(s.exams[0].percentage))
      : 0,
    exams: s.exams.map(e => ({ exam: e.examName, percentage: e.percentage, grade: e.grade })),
  }));

  const sorted = [...perSubject].sort((a, b) => a.averagePercentage - b.averagePercentage);
  const passCount = marks.subjects.reduce((acc, s) => acc + s.exams.filter(e => Number(e.percentage) >= 40).length, 0);
  const totalCount = marks.subjects.reduce((acc, s) => acc + s.exams.length, 0);
  const improving = perSubject.filter(s => s.trend > 2).length;
  const declining = perSubject.filter(s => s.trend < -2).length;

  return {
    studentId,
    overallAverage: marks.overallAverage,
    gpaAverage: marks.subjects.length
      ? Math.round((marks.subjects.reduce((a, s) => a + s.averageGpa, 0) / marks.subjects.length) * 100) / 100
      : null,
    passRate: totalCount ? Math.round((passCount / totalCount) * 1000) / 10 : 0,
    weakest: sorted[0] ? { subject: sorted[0].subject, averagePercentage: sorted[0].averagePercentage } : null,
    strongest: sorted[sorted.length - 1] ? { subject: sorted[sorted.length - 1].subject, averagePercentage: sorted[sorted.length - 1].averagePercentage } : null,
    improvingCount: improving,
    decliningCount: declining,
    perSubject,
  };
}

module.exports = { getMarksAnalysis };
