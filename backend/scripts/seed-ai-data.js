/*
 * Seed script — populates realistic sample data (courses, subjects, exams,
 * attendance, marks, fees, payments) for the 15 existing students so that AI
 * features operate on real application data.
 *
 * WARNING: This script WIPES the data tables it seeds (attendance, marks,
 * fees, fee_payments, examinations, subjects, courses, student_courses,
 * student_subjects). It is intended for development/demo use only.
 *
 * Run: node backend/scripts/seed-ai-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { getGrade } = require('../utils/grade');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'student_management',
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 5,
});

// Deterministic PRNG so re-seeding always yields identical data.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260815);
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

// Branch full name -> code prefix used for codes.
const BRANCH_CODE = { 'Civil': 'CV', 'Computer Science': 'CS', 'Electronics': 'EC', 'Mechanical': 'ME' };

// Subjects per (branch, semester). Each: [subject_name, subject_code, credits]
const SUBJECTS = {
  'Civil::1': [
    ['Engineering Mathematics I', 'CVMA101', 3],
    ['Engineering Drawing', 'CVEG102', 2],
    ['Civil Engineering Materials', 'CVCV103', 3],
    ['Environmental Science', 'CVEN104', 2],
  ],
  'Civil::5': [
    ['Structural Analysis I', 'CVST501', 4],
    ['Concrete Technology', 'CVCT502', 3],
    ['Hydraulics & Fluid Mechanics', 'CVHF503', 4],
    ['Transportation Engineering', 'CVTR504', 3],
  ],
  'Civil::7': [
    ['Earthquake Engineering', 'CVEQ701', 3],
    ['Construction Management', 'CVCM702', 3],
    ['Bridge Engineering', 'CVBR703', 3],
    ['Environmental Impact Assessment', 'CVEI704', 2],
  ],
  'Computer Science::1': [
    ['Programming Fundamentals', 'CSPF101', 4],
    ['Mathematics I', 'CSMA102', 4],
    ['Digital Logic Design', 'CSDL103', 3],
    ['Communication Skills', 'CSCO104', 2],
  ],
  'Computer Science::3': [
    ['Data Structures', 'CSDS201', 4],
    ['Discrete Mathematics', 'CSDM202', 3],
    ['Computer Organization', 'CSCO203', 3],
    ['Object Oriented Programming', 'CSOO204', 4],
  ],
  'Computer Science::5': [
    ['Database Management Systems', 'CSDB301', 4],
    ['Operating Systems', 'CSOS302', 4],
    ['Software Engineering', 'CSSE303', 3],
    ['Computer Networks', 'CSCN304', 3],
  ],
  'Computer Science::7': [
    ['Machine Learning', 'CSML401', 4],
    ['Cloud Computing', 'CSCC402', 3],
    ['Cryptography & Security', 'CSCR403', 3],
    ['Web Technologies', 'CSWE404', 3],
  ],
  'Electronics::1': [
    ['Basic Electronics', 'ECBE101', 4],
    ['Mathematics I', 'ECMA102', 4],
    ['Circuit Theory', 'ECCT103', 4],
    ['Physics for Engineers', 'ECPH104', 3],
  ],
  'Electronics::3': [
    ['Analog Electronics', 'ECAE201', 4],
    ['Digital Electronics', 'ECDE202', 4],
    ['Signals & Systems', 'ECSS203', 4],
    ['Electronic Instruments', 'ECEI204', 3],
  ],
  'Electronics::5': [
    ['Embedded Systems', 'ECES301', 4],
    ['Microprocessors', 'ECMP302', 4],
    ['Control Systems', 'ECCS303', 3],
    ['Communication Systems', 'ECCM304', 4],
  ],
  'Mechanical::1': [
    ['Engineering Mechanics', 'MEEM101', 4],
    ['Mathematics I', 'MEMA102', 4],
    ['Engineering Thermodynamics', 'METH103', 4],
    ['Workshop Practice', 'MEWP104', 2],
  ],
  'Mechanical::3': [
    ['Fluid Mechanics', 'MEFM201', 4],
    ['Strength of Materials', 'MESM202', 4],
    ['Thermodynamics II', 'METH203', 3],
    ['Machine Drawing', 'MEMD204', 3],
  ],
  'Mechanical::7': [
    ['Robotics & Automation', 'MERA401', 4],
    ['Finite Element Methods', 'MEFE402', 3],
    ['Industrial Management', 'MEIM403', 3],
    ['Power Plant Engineering', 'MEPP404', 3],
  ],
};

// Student risk/profile profile, keyed by students.id.
const PROFILES = {
  1:  { attendance: 0.90, perf: 'good',   fee: 'paid' },
  2:  { attendance: 0.92, perf: 'good',   fee: 'paid' },
  3:  { attendance: 0.91, perf: 'good',   fee: 'paid' },
  4:  { attendance: 0.94, perf: 'good',   fee: 'paid' },
  5:  { attendance: 0.85, perf: 'avg',    fee: 'partial' },
  6:  { attendance: 0.90, perf: 'good',   fee: 'paid' },
  7:  { attendance: 0.63, perf: 'weak',   fee: 'pending' },
  8:  { attendance: 0.61, perf: 'weak',   fee: 'pending' },
  9:  { attendance: 0.67, perf: 'avg',    fee: 'partial' },
  10: { attendance: 0.88, perf: 'good',   fee: 'paid' },
  11: { attendance: 0.79, perf: 'avg',    fee: 'partial' },
  12: { attendance: 0.76, perf: 'avg',    fee: 'partial' },
  13: { attendance: 0.95, perf: 'good',   fee: 'paid' },
  14: { attendance: 0.78, perf: 'avg',    fee: 'partial' },
  15: { attendance: 0.66, perf: 'avg',    fee: 'pending' },
};

const FEES_BY_BRANCH = { 'Civil': 90000, 'Computer Science': 125000, 'Electronics': 110000, 'Mechanical': 95000 };
const SEM_YEAR = { 1: 2026, 3: 2025, 5: 2024, 7: 2023 };

function perfRange(perf) {
  if (perf === 'good') return [72, 92];
  if (perf === 'avg') return [58, 76];
  return [40, 58];
}

// Build the list of weekdays (Mon-Sat) between two dates (inclusive).
function weekdays(start, end) {
  const days = [];
  const cur = new Date(start);
  const stop = new Date(end);
  while (cur <= stop) {
    const dow = cur.getDay();
    if (dow !== 0) days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Two deliberate statistical outliers so anomaly detection finds real signals.
async function injectOutliers(conn) {
  // (a) Divya Joshi (id 8, Mechanical) — a genuinely anomalous failing mark
  // far below the Mechanical distribution.
  await conn.query(
    `UPDATE marks m
     JOIN examinations e ON e.id = m.examination_id
     JOIN subjects su ON su.id = m.subject_id
     JOIN students s ON s.id = m.student_id
     SET m.internal_marks = 6, m.external_marks = 9, m.practical_marks = 3,
         m.assignment_marks = 2, m.total_marks = 20, m.percentage = 20,
         m.grade = 'F', m.gpa = 0
     WHERE s.id = 8 AND su.subject_name = 'Engineering Mechanics'
       AND e.exam_name = 'Mid-Semester Examination'`
  );
  // (b) Amit Chauhan (id 15, Electronics) — a sharp attendance drop in
  // September so the month-over-month drop detector fires.
  await conn.query(
    `UPDATE attendance SET status = 'Absent'
     WHERE student_id = 15 AND attendance_date >= '2026-09-01'`
  );
}

async function main() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    console.log('Clearing seeded tables...');
    await conn.query('DELETE FROM attendance');
    await conn.query('DELETE FROM marks');
    await conn.query('DELETE FROM fee_payments');
    await conn.query('DELETE FROM fees');
    await conn.query('DELETE FROM student_courses');
    await conn.query('DELETE FROM student_subjects');
    await conn.query('DELETE FROM examinations');
    await conn.query('DELETE FROM subjects');
    await conn.query('DELETE FROM courses');

    const adminId = 1; // super_admin "admin"

    const [students] = await conn.query('SELECT id, name, branch, semester FROM students ORDER BY id');
    const courseIds = {};   // combo key -> core course id
    const subjectIds = {};  // combo key -> [subject ids]

    console.log('Creating courses...');
    for (const s of students) {
      const key = `${s.branch}::${s.semester}`;
      if (courseIds[key]) continue;
      const bc = BRANCH_CODE[s.branch];
      const coreName = `${s.branch} Semester ${s.semester} Core`;
      const labName = `${s.branch} Semester ${s.semester} Laboratory`;
      const [r1] = await conn.query(
        'INSERT INTO courses (course_name, course_code, branch, semester, credits, status) VALUES (?,?,?,?,?,?)',
        [coreName, `CORE-${bc}-${s.semester}`, s.branch, s.semester, 20, 'Active']
      );
      await conn.query(
        'INSERT INTO courses (course_name, course_code, branch, semester, credits, status) VALUES (?,?,?,?,?,?)',
        [labName, `LAB-${bc}-${s.semester}`, s.branch, s.semester, 6, 'Active']
      );
      courseIds[key] = r1.insertId;
    }

    console.log('Creating subjects...');
    const examDates = {};
    for (const s of students) {
      const key = `${s.branch}::${s.semester}`;
      if (subjectIds[key]) continue;
      const defs = SUBJECTS[key];
      const list = [];
      for (const [name, code, credits] of defs) {
        const [r] = await conn.query(
          'INSERT INTO subjects (subject_name, subject_code, branch, semester, credits, teacher, course_id, status) VALUES (?,?,?,?,?,?,?,?)',
          [name, code, s.branch, s.semester, credits, `Faculty ${s.branch} Sem${s.semester}`, courseIds[key], 'Active']
        );
        list.push(r.insertId);
      }
      subjectIds[key] = list;
      // Exam windows: ~8 weeks of classes, mid + end semester exams.
      const start = new Date(Date.UTC(2026, 7, 3)); // 03 Aug 2026
      const mids = new Date(Date.UTC(2026, 8, 7));  // 07 Sep 2026 (mid)
      const end = new Date(Date.UTC(2026, 10, 13)); // 13 Nov 2026 (end)
      examDates[key] = { mid: weekdays(start, mids), end: weekdays(new Date(Date.UTC(2026, 9, 5)), end) };
    }

    console.log('Creating examinations...');
    const examIds = {}; // combo key -> { 'Mid-Semester Examination': id, 'End-Semester Examination': id }
    for (const s of students) {
      const key = `${s.branch}::${s.semester}`;
      if (examIds[key]) continue;
      const ids = {};
      const mids = examDates[key].mid;
      const ends = examDates[key].end;
      for (const [label, dates, max] of [
        ['Mid-Semester Examination', mids, 50],
        ['End-Semester Examination', ends, 100],
      ]) {
        const midIdx = 0, endIdx = 0; // placeholder to satisfy lint
        void midIdx; void endIdx;
        for (const sid of subjectIds[key]) {
          const examDate = dates[Math.min(dates.length - 1, 15)];
          const [r] = await conn.query(
            'INSERT INTO examinations (exam_name, academic_year, semester, exam_date, subject_id, max_marks, status) VALUES (?,?,?,?,?,?,?)',
            [label, '2026-2027', s.semester, examDate, sid, max, 'Completed']
          );
          if (!ids[label]) ids[label] = {};
          ids[label][sid] = r.insertId;
        }
      }
      examIds[key] = ids;
    }

    console.log('Creating attendance, marks, fees...');
    let receipt = 1;
    const studentCgpa = {};
    for (const s of students) {
      const key = `${s.branch}::${s.semester}`;
      const prof = PROFILES[s.id] || { attendance: 0.85, perf: 'avg', fee: 'partial' };
      const subjectList = subjectIds[key];
      const days = examDates[key].mid;
      const attDays = days.slice(0, 30);
      const [minP, maxP] = perfRange(prof.perf);

      // Attendance
      for (const sid of subjectList) {
        const presentCount = Math.max(0, Math.min(30, Math.round(attDays.length * prof.attendance + between(-2, 2))));
        const present = new Set();
        while (present.size < presentCount) present.add(between(0, attDays.length - 1));
        for (let i = 0; i < attDays.length; i++) {
          const status = present.has(i) ? 'Present' : 'Absent';
          await conn.query(
            'INSERT INTO attendance (student_id, subject_id, attendance_date, status, marked_by) VALUES (?,?,?,?,?)',
            [s.id, sid, attDays[i], status, adminId]
          );
        }
      }

      // Marks + GPA accumulation
      let gpaSum = 0, gpaCount = 0;
      for (const sid of subjectList) {
        for (const label of ['Mid-Semester Examination', 'End-Semester Examination']) {
          const max = label.startsWith('Mid') ? 50 : 100;
          const pct = Math.max(0, Math.min(100, between(minP, maxP)));
          const total = Math.round((pct / 100) * max);
          const internal = Math.round(total * 0.25);
          const assignment = Math.round(total * 0.1);
          const practical = Math.round(total * 0.15);
          const external = Math.max(0, total - internal - assignment - practical);
          const grade = getGrade((total / max) * 100);
          const gpa = Math.min(Number(grade.gpa), 9.99); // marks.gpa column is DECIMAL(3,2)
          gpaSum += gpa; gpaCount += 1;
          await conn.query(
            'INSERT INTO marks (student_id, examination_id, subject_id, internal_marks, external_marks, practical_marks, assignment_marks, total_marks, percentage, grade, gpa) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [s.id, examIds[key][label][sid], sid, internal, external, practical, assignment, total,
             Math.round((total / max) * 1000) / 10, grade.grade, gpa]
          );
        }
      }
      studentCgpa[s.id] = gpaCount ? Math.round((gpaSum / gpaCount) * 100) / 100 : null;

      // Fees
      const totalFees = FEES_BY_BRANCH[s.branch];
      const [fr] = await conn.query(
        'INSERT INTO fees (student_id, total_fees, due_date, status, created_by) VALUES (?,?,?,?,?)',
        [s.id, totalFees, '2026-08-10', 'Pending', adminId]
      );
      const feeId = fr.insertId;
      if (prof.fee === 'paid') {
        await conn.query(
          'INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, receipt_number, recorded_by) VALUES (?,?,?,?,?,?,?,?)',
          [feeId, s.id, totalFees, '2026-07-20', 'UPI', `UPI-${s.id}`, `RCP-2026-${String(receipt++).padStart(6, '0')}`, adminId]
        );
        await conn.query('UPDATE fees SET status = ? WHERE id = ?', ['Paid', feeId]);
      } else if (prof.fee === 'partial') {
        const paidAmount = Math.round((totalFees * (0.4 + rand() * 0.2)) / 100) * 100;
        const first = Math.round(paidAmount * 0.6);
        await conn.query(
          'INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, receipt_number, recorded_by) VALUES (?,?,?,?,?,?,?,?)',
          [feeId, s.id, first, '2026-07-25', 'Bank Transfer', `BT-${s.id}`, `RCP-2026-${String(receipt++).padStart(6, '0')}`, adminId]
        );
        await conn.query(
          'INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, receipt_number, recorded_by) VALUES (?,?,?,?,?,?,?,?)',
          [feeId, s.id, paidAmount - first, '2026-08-05', 'Cash', `CS-${s.id}`, `RCP-2026-${String(receipt++).padStart(6, '0')}`, adminId]
        );
        await conn.query('UPDATE fees SET status = ? WHERE id = ?', ['Partially Paid', feeId]);
      }

      // Enrollments
      await conn.query('INSERT INTO student_courses (student_id, course_id, assigned_by) VALUES (?,?,?)', [s.id, courseIds[key], adminId]);
      await conn.query('INSERT INTO student_courses (student_id, course_id, assigned_by) VALUES (?,?,?)', [s.id, courseIds[key] + 1, adminId]);
      for (const sid of subjectList) {
        await conn.query('INSERT INTO student_subjects (student_id, subject_id, assigned_by) VALUES (?,?,?)', [s.id, sid, adminId]);
      }
    }

    // Inject two genuine statistical outliers so anomaly detection has real
    // signals: (a) a clear failing-marks outlier, (b) a sharp attendance drop.
    await injectOutliers(conn);

    console.log('Updating students (admission_year, cgpa)...');
    for (const s of students) {
      await conn.query('UPDATE students SET admission_year = ?, cgpa = ? WHERE id = ?', [
        SEM_YEAR[s.semester] || 2026, studentCgpa[s.id], s.id,
      ]);
    }

    await conn.commit();
    console.log('Seed complete. Subjects/courses/exams/attendance/marks/fees created for', students.length, 'students.');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
