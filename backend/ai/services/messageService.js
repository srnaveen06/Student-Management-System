// AI notification/email message generator. Produces professional reminder or
// warning messages from real student data. Messages are drafts for staff review.

const studentTools = require('../tools/studentTools');
const { getFeeRisk } = require('./forecastService');

const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

async function generateForStudent({ studentId, type }) {
  const base = await studentTools.getStudentById(null, { id: studentId });
  if (base.error) return base;
  const s = base.student;
  const [att, marks, fees] = await Promise.all([
    studentTools.getStudentAttendance(null, { studentId }),
    studentTools.getStudentMarks(null, { studentId }),
    studentTools.getStudentFees(null, { studentId }),
  ]);

  switch (type) {
    case 'attendance_warning': {
      const pct = att.overallPercentage;
      return {
        studentId,
        type: 'attendance_warning',
        subject: `Attendance Reminder — ${s.name} (${s.student_id})`,
        message: `Dear Parent/Guardian of ${s.name}, this is to inform you that ${s.name}'s attendance is currently ${pct}%, which is below the required 75% threshold for the semester. Regular attendance is essential for academic progress. Kindly ensure ${s.name}'s regular presence in all classes going forward. — Academic Office`,
      };
    }
    case 'fee_reminder': {
      const outstanding = fees.outstanding;
      return {
        studentId,
        type: 'fee_reminder',
        subject: `Fee Payment Reminder — ${s.name}`,
        message: `Dear ${s.name}, as per our records, a fee amount of ${currency(outstanding)} remains outstanding with a due date of ${fees.fee ? fees.fee.due_date : 'the scheduled date'}. Kindly complete the payment at the earliest to avoid late fees or administrative action. — Accounts Office`,
      };
    }
    case 'low_marks': {
      const avg = marks.overallAverage;
      return {
        studentId,
        type: 'low_marks',
        subject: `Academic Progress Notice — ${s.name}`,
        message: `Dear ${s.name}, your current average in examinations is ${avg}%. We request you to meet your faculty mentor at the earliest to discuss an improvement plan. Remedial support is available. — Academic Office`,
      };
    }
    case 'congratulation':
      return {
        studentId,
        type: 'congratulation',
        subject: `Congratulations — ${s.name}`,
        message: `Dear ${s.name}, we appreciate your consistent attendance and good academic standing. Keep up the excellent work! — Academic Office`,
      };
    default:
      return { studentId, error: `Unknown message type: ${type}` };
  }
}

async function generateBatch({ type, branch, semester, limit = 20 }) {
  let recipients = [];
  if (type === 'fee_reminder') {
    const feeRisk = await getFeeRisk();
    recipients = feeRisk.list
      .filter(f => f.outstanding > 0 && (!branch || f.student.branch === branch) && (!semester || f.student.semester === semester))
      .slice(0, limit)
      .map(f => f.student.id);
  } else {
    const res = await studentTools.searchStudents(null, { branch: branch || null, semester: semester || null, limit: 50, status: 'Active' });
    recipients = res.students.map(s => s.id).slice(0, limit);
  }
  const messages = [];
  for (const id of recipients) {
    const m = await generateForStudent({ studentId: id, type });
    if (!m.error) messages.push(m);
  }
  return { type, count: messages.length, messages };
}

module.exports = { generateForStudent, generateBatch };
