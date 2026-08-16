const db = require('../config/db');

const DashboardModel = {

  // Combined dashboard data for the main dashboard page.
  async getDashboardData() {
    const [[totalStudents]] = await db.execute('SELECT COUNT(*) AS c FROM students');
    const [[activeStudents]] = await db.execute("SELECT COUNT(*) AS c FROM students WHERE status = 'Active'");
    const [[totalCourses]] = await db.execute('SELECT COUNT(*) AS c FROM courses');
    const [[totalSubjects]] = await db.execute('SELECT COUNT(*) AS c FROM subjects');

    const [[fee]] = await db.execute(
      `SELECT COALESCE(SUM(f.total_fees),0) AS total_fees,
              COALESCE(SUM(p.paid),0) AS paid_fees
       FROM fees f
       LEFT JOIN (SELECT fee_id, SUM(amount) AS paid FROM fee_payments GROUP BY fee_id) p ON p.fee_id = f.id`
    );

    const [[attendance]] = await db.execute(
      `SELECT COALESCE(SUM(CASE WHEN a.status IN ('Present', 'Approved Leave') THEN 1 ELSE 0 END),0) AS present,
              COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END),0) AS absent,
              COALESCE(COUNT(*),0) AS total
       FROM attendance a`
    );

    const [monthlyRegistrations] = await db.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              DATE_FORMAT(created_at, '%b %Y') AS label,
              COUNT(*) AS count
       FROM students
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
       ORDER BY month ASC`
    );

    const [genderDist] = await db.execute(
      `SELECT gender, COUNT(*) AS count FROM students GROUP BY gender`
    );

    const [branchDist] = await db.execute(
      `SELECT branch, COUNT(*) AS count FROM students GROUP BY branch ORDER BY count DESC LIMIT 8`
    );

    const [statusDist] = await db.execute(
      `SELECT status, COUNT(*) AS count FROM students GROUP BY status`
    );

    const [feeStatusDist] = await db.execute(
      `SELECT f.status AS status, COUNT(*) AS count
       FROM fees f GROUP BY f.status`
    );

    const [feeTrend] = await db.execute(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              DATE_FORMAT(payment_date, '%b %Y') AS label,
              COALESCE(SUM(amount),0) AS total
       FROM fee_payments
       WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%b %Y')
       ORDER BY month ASC`
    );

    const [attendanceTrend] = await db.execute(
      `SELECT DATE_FORMAT(attendance_date, '%Y-%m') AS month,
              DATE_FORMAT(attendance_date, '%b %Y') AS label,
              COALESCE(SUM(CASE WHEN status IN ('Present', 'Approved Leave') THEN 1 ELSE 0 END),0) AS present,
              COALESCE(COUNT(*),0) AS total
       FROM attendance
       WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(attendance_date, '%Y-%m'), DATE_FORMAT(attendance_date, '%b %Y')
       ORDER BY month ASC`
    );

    const [recentStudents] = await db.execute(
      `SELECT s.id, s.student_id, s.name, s.branch, s.semester, s.image, s.created_at
       FROM students s ORDER BY s.created_at DESC LIMIT 6`
    );

    const [upcomingExams] = await db.execute(
      `SELECT e.id, e.exam_name, e.exam_date, e.semester, sub.subject_name
       FROM examinations e JOIN subjects sub ON sub.id = e.subject_id
       WHERE e.exam_date IS NOT NULL AND e.exam_date >= CURDATE()
       ORDER BY e.exam_date ASC LIMIT 5`
    );

    const [recentPayments] = await db.execute(
      `SELECT p.id, p.receipt_number, p.amount, p.method, p.payment_date,
              s.id AS student_pk, s.name AS student_name, s.student_id
       FROM fee_payments p
       JOIN fees f ON f.id = p.fee_id
       JOIN students s ON s.id = f.student_id
       ORDER BY p.payment_date DESC, p.id DESC LIMIT 5`
    );

    const [lowAttendance] = await db.execute(
      `SELECT s.id, s.student_id, s.name, s.branch, s.semester,
              ROUND(SUM(CASE WHEN a.status IN ('Present', 'Approved Leave') THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS percentage
       FROM students s
       JOIN attendance a ON a.student_id = s.id
       GROUP BY s.id
       HAVING percentage < 75
       ORDER BY percentage ASC LIMIT 5`
    );

    const [recentActivities] = await db.execute(
      `SELECT al.id, al.action, al.description, al.created_at, al.username
       FROM activity_logs al ORDER BY al.created_at DESC LIMIT 6`
    );

    const [[unreadNotifications]] = await db.execute(
      "SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0 AND (user_id IS NULL OR user_id = 0)"
    );

    // ERP feature lists (college_erp_migration.sql)
    const [upcomingEvents] = await db.execute(
      `SELECT id, title, event_type, start_date, end_date, location, status
       FROM academic_events
       WHERE status = 'Active' AND end_date >= CURDATE()
       ORDER BY start_date ASC LIMIT 5`
    );

    const [latestAnnouncements] = await db.execute(
      `SELECT a.id, a.title, a.content, a.announcement_type, a.is_pinned, a.created_at, u.name AS published_by_name
       FROM announcements a
       LEFT JOIN admins u ON u.id = a.published_by
       ORDER BY a.is_pinned DESC, a.created_at DESC LIMIT 5`
    );

    const [pendingLeaves] = await db.execute(
      `SELECT l.id, l.leave_type, l.from_date, l.to_date, l.days, l.status, l.created_at,
              s.id AS student_pk, s.name AS student_name, s.student_id, s.branch, s.semester
       FROM leave_requests l JOIN students s ON s.id = l.student_id
       WHERE l.status = 'Pending'
       ORDER BY l.created_at ASC LIMIT 5`
    );

    const [[pendingLeavesCount]] = await db.execute(
      "SELECT COUNT(*) AS c FROM leave_requests WHERE status = 'Pending'"
    );

    const attendanceRate = attendance.total > 0 ? ((attendance.present / attendance.total) * 100).toFixed(1) : 0;
    const pendingFees = Number(fee.total_fees) - Number(fee.paid_fees);

    return {
      counts: {
        totalStudents: totalStudents.c,
        activeStudents: activeStudents.c,
        totalCourses: totalCourses.c,
        totalSubjects: totalSubjects.c,
        pendingLeaves: pendingLeavesCount.c
      },
      fees: {
        totalFees: Number(fee.total_fees),
        collectedFees: Number(fee.paid_fees),
        pendingFees: Math.max(pendingFees, 0)
      },
      attendance: {
        present: attendance.present,
        absent: attendance.absent,
        total: attendance.total,
        rate: attendanceRate
      },
      charts: {
        monthlyRegistrations,
        genderDist,
        branchDist,
        statusDist,
        feeStatusDist,
        feeTrend,
        attendanceTrend
      },
      lists: {
        recentStudents,
        upcomingExams,
        recentPayments,
        lowAttendance,
        recentActivities,
        unreadNotifications: unreadNotifications.c,
        upcomingEvents,
        latestAnnouncements,
        pendingLeaves
      }
    };
  }
};

module.exports = DashboardModel;
