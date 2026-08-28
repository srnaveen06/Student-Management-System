/*
 * Seed script — populates realistic sample data across every module for the
 * existing students so all pages (dashboard, courses, attendance, exams,
 * fees, leaves, calendar, announcements, ID cards, documents, notifications)
 * have something to display. Safe to re-run: it replaces demo data only.
 *
 * Run: node backend/scripts/seed-sample-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { getGrade } = require('../utils/grade');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'student_management',
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 5,
  multipleStatements: false,
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
const rand = mulberry32(20260827);
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

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
  1:  { attendance: 0.90, perf: 'good',  fee: 'paid' },
  2:  { attendance: 0.92, perf: 'good',  fee: 'paid' },
  3:  { attendance: 0.91, perf: 'good',  fee: 'paid' },
  4:  { attendance: 0.94, perf: 'good',  fee: 'paid' },
  5:  { attendance: 0.85, perf: 'avg',   fee: 'partial' },
  6:  { attendance: 0.90, perf: 'good',  fee: 'paid' },
  7:  { attendance: 0.63, perf: 'weak',  fee: 'pending' },
  8:  { attendance: 0.61, perf: 'weak',  fee: 'pending' },
  9:  { attendance: 0.67, perf: 'avg',   fee: 'partial' },
  10: { attendance: 0.88, perf: 'good',  fee: 'paid' },
  11: { attendance: 0.79, perf: 'avg',   fee: 'partial' },
  12: { attendance: 0.76, perf: 'avg',   fee: 'partial' },
  13: { attendance: 0.95, perf: 'good',  fee: 'paid' },
  14: { attendance: 0.78, perf: 'avg',   fee: 'partial' },
  15: { attendance: 0.66, perf: 'avg',   fee: 'pending' },
};

const PROFILE_FIELDS = [
  { blood_group: 'B+', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'O+', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'A+', city: 'Kolkata', state: 'West Bengal', pincode: '700001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'AB+', city: 'Hyderabad', state: 'Telangana', pincode: '500001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'O-', city: 'New Delhi', state: 'Delhi', pincode: '110001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'B-', city: 'Kochi', state: 'Kerala', pincode: '682001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'A-', city: 'New Delhi', state: 'Delhi', pincode: '110016', previous_qualification: 'Class XII (Commerce)' },
  { blood_group: 'O+', city: 'Pune', state: 'Maharashtra', pincode: '411001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'B+', city: 'Kolkata', state: 'West Bengal', pincode: '700064', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'AB-', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'O+', city: 'Mumbai', state: 'Maharashtra', pincode: '400058', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'A+', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'B+', city: 'Jaipur', state: 'Rajasthan', pincode: '302017', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'O+', city: 'Kolkata', state: 'West Bengal', pincode: '700029', previous_qualification: 'Class XII (Science)' },
  { blood_group: 'A-', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', previous_qualification: 'Class XII (Science)' },
];

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

const ADDL_NAMES = ['Sharma', 'Singh', 'Kumar', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Das', 'Gupta', 'Nair'];
const FATHERS = ['Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Mohan', 'Vijay', 'Anil'];
const MOTHERS = ['Sunita', 'Anita', 'Kavita', 'Sudha', 'Rekha', 'Geeta', 'Poonam'];

async function main() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const clearOrder = [
      'ai_document_extractions', 'ai_risk_predictions', 'ai_reports',
      'student_documents', 'student_id_cards', 'leave_requests', 'announcements', 'academic_events',
      'notifications', 'activity_logs', 'attendance', 'marks', 'fee_payments', 'fees',
      'student_courses', 'student_subjects', 'examinations', 'subjects', 'courses',
    ];
    console.log('Clearing demo tables...');
    for (const t of clearOrder) {
      await conn.query('DELETE FROM ??', [t]);
    }

    const [admins] = await conn.query("SELECT id, username, name FROM admins ORDER BY id");
    const admin = admins.find(a => a.username === 'admin') || admins[0];
    const adminId = admin ? admin.id : 1;

    const [students] = await conn.query('SELECT id, name, branch, semester, student_id, email FROM students ORDER BY id');

    // ---- 1. Enrich student profile fields (name, blood group, guardians, etc.) ----
    console.log('Enriching student profiles...');
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const p = PROFILE_FIELDS[i % PROFILE_FIELDS.length];
      const firstName = s.name.split(' ')[0];
      const lastName = s.name.split(' ').slice(1).join(' ') || pick(ADDL_NAMES);
      const father = pick(FATHERS) + ' ' + lastName;
      const mother = pick(MOTHERS) + ' ' + lastName;
      const guardianPhone = `+91 9${String(6000000000 + s.id * 1337).slice(0, 9)}`;
      await conn.query(
        `UPDATE students SET
           enrollment_number = CONCAT('ENR-', YEAR(CURDATE()), '-', LPAD(id, 5, '0')),
           blood_group = ?, admission_year = ?, enrollment_date = ?,
           cgpa = NULL, previous_qualification = ?, father_name = ?, mother_name = ?,
           guardian_name = ?, guardian_phone = ?, emergency_contact = ?, relationship = ?,
           city = ?, state = ?, pincode = ?
         WHERE id = ?
        `,
        [
          p.blood_group,
          SEM_YEAR[s.semester] || 2026,
          `${SEM_YEAR[s.semester] || 2026}-07-01`,
          p.previous_qualification,
          father, mother,
          father, guardianPhone, guardianPhone, 'Father',
          p.city, p.state, p.pincode,
          s.id,
        ]
      );
    }

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
        'INSERT INTO courses (course_name, course_code, branch, semester, credits, description, status) VALUES (?,?,?,?,?,?,?)',
        [coreName, `CORE-${bc}-${s.semester}`, s.branch, s.semester, 20,
         `Core theory subjects for ${s.branch}, semester ${s.semester}.`, 'Active']
      );
      await conn.query(
        'INSERT INTO courses (course_name, course_code, branch, semester, credits, description, status) VALUES (?,?,?,?,?,?,?)',
        [labName, `LAB-${bc}-${s.semester}`, s.branch, s.semester, 6,
         `Laboratory / practical component for ${s.branch}, semester ${s.semester}.`, 'Active']
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
    const examIds = {}; // combo key -> { 'Mid-Semester Examination': {subjectId: examId}, ... }
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
        ids[label] = ids[label] || {};
        for (const sid of subjectIds[key]) {
          const examDate = dates[Math.min(dates.length - 1, 15)];
          const [r] = await conn.query(
            'INSERT INTO examinations (exam_name, academic_year, semester, exam_date, subject_id, max_marks, status) VALUES (?,?,?,?,?,?,?)',
            [label, '2026-2027', s.semester, examDate, sid, max, 'Completed']
          );
          ids[label][sid] = r.insertId;
        }
      }
      examIds[key] = ids;
    }

    console.log('Creating attendance, marks, fees, enrollments...');
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
      studentCgpa[s.id] = gpaCount ? Math.round(((gpaSum / gpaCount)) * 100) / 100 : null;

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

    // ---- 2. Academic calendar events ----
    console.log('Creating academic events...');
    const events = [
      ['Independence Day', 'Holiday', '2026-08-15', null, null, null, 'College Grounds', 'National holiday - campus closed.'],
      ['Orientation Week', 'Seminar', '2026-08-01', '2026-08-07', null, 1, 'Main Auditorium', 'Welcome and orientation for first-year students.'],
      ['Mid-Semester Examinations', 'Exam', '2026-09-14', '2026-09-20', null, null, 'All Campuses', 'Mid-semester exams for all branches.'],
      ['Technical Symposium - TechNova', 'Cultural', '2026-09-25', '2026-09-27', null, null, 'Main Auditorium', 'Annual technical and cultural symposium.'],
      ['Placement Drive - Tech Giants', 'Seminar', '2026-10-05', '2026-10-06', 'Computer Science', 7, 'Training Block', 'Campus recruitment for final year CS students.'],
      ['Workshop: AI & Machine Learning', 'Workshop', '2026-10-12', '2026-10-14', 'Computer Science', null, 'CS Block Lab 3', 'Hands-on ML workshop for CS students.'],
      ['End-Semester Examinations', 'Exam', '2026-11-23', '2026-12-05', null, null, 'All Campuses', 'End-semester examinations for all branches.'],
      ['Republic Day', 'Holiday', '2027-01-26', null, null, null, 'College Grounds', 'National holiday - campus closed.'],
      ['Annual Sports Meet', 'Sports', '2027-02-10', '2027-02-12', null, null, 'Sports Complex', 'Inter-branch athletics and games.'],
      ['Science Exhibition', 'Cultural', '2027-03-05', '2027-03-06', null, null, 'Convocation Hall', 'Student projects and science models exhibition.'],
      ['Final Term Examinations', 'Exam', '2027-04-05', '2027-04-18', null, null, 'All Campuses', 'End of academic year examinations.'],
    ];
    for (const [title, type, start, end, branch, sem, loc, desc] of events) {
      await conn.query(
        'INSERT INTO academic_events (title, event_type, start_date, end_date, branch, semester, location, description, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [title, type, start, end, branch, sem, loc, desc, 'Active', adminId]
      );
    }

    // ---- 3. Announcements ----
    console.log('Creating announcements...');
    const announcements = [
      ['Welcome to the Academic Year 2026-27', 'Welcome back to all students! The new academic session begins on Monday. Please collect your timetables from your departments.', 'General', 'All', 1],
      ['Mid-Semester Exam Schedule Released', 'The mid-semester examination schedule has been published in the Academic Calendar. Kindly prepare accordingly and contact your HOD for any clashes.', 'Exam', 'Students', 1],
      ['Fee Payment Reminder', 'Second installment of tuition fees is due by the 15th of September. Late payments attract a penalty. Pay online via the portal.', 'Fee', 'All', 0],
      ['Library Extended Hours', 'The central library will remain open from 8 AM to 8 PM during the exam period.', 'Notice', 'All', 0],
      ['Campus Placement Drive', 'Leading tech companies will visit campus next month for final year placements. Register in the placement cell.', 'Event', 'Students', 0],
      ['Urgent: Network Maintenance', 'Campus network will be down on Saturday from 2 AM to 5 AM for scheduled maintenance.', 'Urgent', 'Staff', 0],
      ['Sports Registration Open', 'Registrations for the Annual Sports Meet are now open. Sign up at the sports office before 10 February.', 'Event', 'All', 0],
    ];
    for (const [title, content, atype, audience, pinned] of announcements) {
      await conn.query(
        'INSERT INTO announcements (title, content, announcement_type, audience, is_pinned, published_by) VALUES (?,?,?,?,?,?)',
        [title, content, atype, audience, pinned, adminId]
      );
    }

    // ---- 4. Leave requests ----
    console.log('Creating leave requests...');
    const leaves = [
      [1, 'Sick', '2026-08-18', '2026-08-19', 2, 'High fever, doctor advised rest.', 'Pending', null],
      [5, 'Casual', '2026-08-25', '2026-08-25', 1, 'Family function in hometown.', 'Pending', null],
      [4, 'Emergency', '2026-08-10', '2026-08-12', 3, 'Medical emergency in family.', 'Approved', 'Approved - take care.'],
      [10, 'Study', '2026-09-01', '2026-09-03', 3, 'Preparing for competitive exam.', 'Rejected', 'Not permitted during regular classes.'],
      [2, 'Sick', '2026-08-14', '2026-08-14', 1, 'Viral fever.', 'Cancelled', null],
      [7, 'Casual', '2026-09-05', '2026-09-06', 2, 'Attending a wedding.', 'Pending', null],
      [9, 'Other', '2026-09-10', '2026-09-10', 1, 'Personal work.', 'Pending', null],
    ];
    for (const [sid, ltype, from, to, days, reason, status, remarks] of leaves) {
      await conn.query(
        `INSERT INTO leave_requests
           (student_id, leave_type, from_date, to_date, days, reason, status, remarks, requested_by, approved_by, approved_at)
         VALUES (?,?,?,?,?,?,?,?,${
           status === 'Approved' || status === 'Rejected' ? '?,?,NOW()' : 'NULL,NULL,NULL'
         })`,
        status === 'Approved' || status === 'Rejected'
          ? [sid, ltype, from, to, days, reason, status, remarks, adminId, adminId]
          : [sid, ltype, from, to, days, reason, status, remarks]
      );
    }

    // ---- 5. Student ID cards ----
    console.log('Creating student ID cards...');
    for (const s of students) {
      const cardNumber = `SID-2026-${String(s.id).padStart(4, '0')}`;
      const token = crypto.createHash('sha256')
        .update(`${s.student_id}|${s.email}|${crypto.randomUUID()}|${rand()}`)
        .digest('hex');
      await conn.query(
        `INSERT INTO student_id_cards
           (student_id, card_number, verification_token, issued_on, valid_until, status, issued_by)
         VALUES (?,?,?,?,?,?,?)`,
        [s.id, cardNumber, token, '2026-08-01', '2030-08-01', 'Active', adminId]
      );
    }

    // ---- 6. Notifications ----
    console.log('Creating notifications...');
    const notifications = [
      ['Welcome to the dashboard', 'Your student management system is fully set up with sample data.', 'success'],
      ['New academic year begins', 'The 2026-2027 academic year has started. Welcome back!', 'info'],
      ['📢 New announcement', 'Mid-Semester Exam Schedule Released', 'info'],
      ['New academic event', '"Technical Symposium - TechNova" scheduled for 2026-09-25', 'info'],
      ['✅ Leave approved', 'Sneha Reddys leave (Emergency, 2026-08-10 → 2026-08-12) was approved', 'success'],
    ];
    for (const [title, message, type] of notifications) {
      await conn.query(
        'INSERT INTO notifications (user_id, title, message, type, is_read, related_type) VALUES (NULL,?,?,?,0,NULL)',
        [title, message, type]
      );
    }

    // ---- 7. Activity logs ----
    console.log('Creating activity logs...');
    const logs = [
      ['login', 'admin logged in successfully', 'auth'],
      ['student_created', 'admin created student Aarav Sharma', 'student'],
      ['attendance_updated', 'admin marked attendance for 30 days', 'attendance'],
      ['fee_assigned', 'admin assigned fees of 125000 to students', 'fee'],
      ['announcement_created', 'admin published announcement "Welcome to the Academic Year 2026-27"', 'announcement'],
      ['event_created', 'admin created event "Mid-Semester Examinations" (2026-09-14)', 'event'],
      ['leave_approved', 'admin approved leave request #3 for Sneha Reddy', 'leave'],
      ['marks_updated', 'admin entered marks for examinations', 'examination'],
    ];
    for (const [action, description, rtype] of logs) {
      await conn.query(
        'INSERT INTO activity_logs (user_id, username, action, description, related_type) VALUES (?,?,?,?,?)',
        [adminId, admin.username, action, description, rtype]
      );
    }

    // ---- 8. Student documents ----
    console.log('Creating student documents...');
    const docTypes = [['Aadhar Card', 'Aadhar'], ['10th Marksheet', 'Certificate'], ['12th Marksheet', 'Certificate'], ['Passport Photo', 'Photo']];
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const [dt, label] = docTypes[i % docTypes.length];
      const safeName = s.name.toLowerCase().replace(/[^a-z]+/g, '-');
      await conn.query(
        'INSERT INTO student_documents (student_id, doc_type, title, file_path, uploaded_by) VALUES (?,?,?,?,?)',
        [s.id, dt, `${s.name} - ${label}`, `uploads/docs/${s.student_id}-${safeName}-${label.toLowerCase().replace(/ /g, '-')}.pdf`, adminId]
      );
    }

    // ---- 9. Update students with computed CGPA ----
    console.log('Updating students (cgpa)...');
    for (const s of students) {
      await conn.query('UPDATE students SET cgpa = ? WHERE id = ?', [studentCgpa[s.id], s.id]);
    }

    await conn.commit();

    // ---- Summary ----
    const tables = [
      'students', 'admins', 'courses', 'subjects', 'examinations', 'attendance', 'marks',
      'fees', 'fee_payments', 'student_courses', 'student_subjects', 'academic_events',
      'announcements', 'leave_requests', 'student_id_cards', 'student_documents',
      'notifications', 'activity_logs',
    ];
    console.log('\nCommitted. Final row counts:');
    for (const t of tables) {
      const [r] = await pool.query('SELECT COUNT(*) AS c FROM ??', [t]);
      console.log(`  ${t.padEnd(18)} ${r[0].c}`);
    }
    console.log('\n✨ Sample data added successfully. Open the app and log in with admin / admin123.');
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