// Study recommendations are derived from the student's real marks, attendance
// and risk profile. No fabricated advice.

const studentTools = require('../tools/studentTools');
const riskService = require('./riskService');
const { ATTENDANCE_THRESHOLD } = require('./forecastService');

async function getRecommendations(studentId) {
  const [marks, attendance, risk] = await Promise.all([
    studentTools.getStudentMarks(null, { studentId }),
    studentTools.getStudentAttendance(null, { studentId }),
    riskService.getStudentRisk(studentId),
  ]);
  if (marks.error) return marks;
  if (!marks.subjects.length) return { studentId, recommendations: [], note: 'No marks recorded yet.' };

  const recommendations = [];
  const sorted = [...marks.subjects].sort((a, b) => a.averagePercentage - b.averagePercentage);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  sorted.forEach(sub => {
    const failed = sub.exams.some(e => Number(e.percentage) < 40);
    if (failed) {
      recommendations.push({
        priority: 'high',
        type: 'remedial',
        subject: sub.subjectName,
        advice: `Attend remedial support for ${sub.subjectName} — you scored below 40% in at least one exam (average ${sub.averagePercentage}%).`,
      });
    } else if (sub.averagePercentage < 60) {
      recommendations.push({
        priority: 'medium',
        type: 'improve',
        subject: sub.subjectName,
        advice: `Strengthen ${sub.subjectName} — average ${sub.averagePercentage}% is below the 60% target. Revisit past paper questions.`,
      });
    }
  });

  if (attendance.overallPercentage < ATTENDANCE_THRESHOLD) {
    recommendations.push({
      priority: 'high',
      type: 'attendance',
      subject: null,
      advice: `Attendance is ${attendance.overallPercentage}% (below ${ATTENDANCE_THRESHOLD}%). Aim for full attendance for the rest of the semester.`,
    });
  }

  recommendations.push({
    priority: 'medium',
    type: 'consistency',
    subject: null,
    advice: `Keep a consistent weekly study routine. Your strongest area is ${strongest.subjectName} (average ${strongest.averagePercentage}%).`,
  });

  if (risk.riskLevel === 'HIGH') {
    recommendations.push({
      priority: 'high',
      type: 'mentor',
      subject: null,
      advice: 'Meet your faculty mentor this week to build an improvement plan; a guardian notification may be required.',
    });
  }

  return {
    studentId,
    summary: {
      overallAverage: marks.overallAverage,
      attendance: attendance.overallPercentage,
      weakest: weakest.subjectName,
      strongest: strongest.subjectName,
      riskLevel: risk.riskLevel,
    },
    recommendations,
  };
}

module.exports = { getRecommendations };
