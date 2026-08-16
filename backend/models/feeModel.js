const db = require('../config/db');

// Recompute a fee row's status based on its payments. Expects an active connection for transactions.
const recomputeFeeStatus = async (conn, feeId) => {
  const [[row]] = await conn.execute(
    `SELECT f.total_fees, COALESCE(SUM(p.amount), 0) AS paid
     FROM fees f LEFT JOIN fee_payments p ON p.fee_id = f.id
     WHERE f.id = ? GROUP BY f.id`,
    [feeId]
  );
  if (!row) return;
  const remaining = Number(row.total_fees) - Number(row.paid);
  const status = remaining <= 0 ? 'Paid' : Number(row.paid) > 0 ? 'Partially Paid' : 'Pending';
  await conn.execute('UPDATE fees SET status = ? WHERE id = ?', [status, feeId]);
  return { paid: Number(row.paid), remaining, status };
};

const FeeModel = {

  // Fees list joined with student + payment totals.
  async findAllFees({ search, status, branch, semester, dateFrom, dateTo, page = 1, limit = 10 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) { where += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status) { where += ' AND f.status = ?'; params.push(status); }
    if (branch) { where += ' AND s.branch = ?'; params.push(branch); }
    if (semester) { where += ' AND s.semester = ?'; params.push(semester); }
    if (dateFrom) { where += ' AND DATE(f.created_at) >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND DATE(f.created_at) <= ?'; params.push(dateTo); }

    const [[count]] = await db.execute(
      `SELECT COUNT(*) AS total FROM fees f JOIN students s ON s.id = f.student_id ${where}`, params
    );
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 10;
    const offset = (validPage - 1) * validLimit;

    const [rows] = await db.execute(
      `SELECT f.*, s.name, s.student_id, s.branch, s.semester,
              COALESCE(SUM(p.amount), 0) AS paid,
              (f.total_fees - COALESCE(SUM(p.amount), 0)) AS remaining,
              (SELECT MAX(p2.payment_date) FROM fee_payments p2 WHERE p2.fee_id = f.id) AS last_payment
       FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN fee_payments p ON p.fee_id = f.id
       ${where}
       GROUP BY f.id, s.name, s.student_id, s.branch, s.semester
       ORDER BY f.created_at DESC
       LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );

    return { fees: rows, total: count.total, page: validPage, totalPages: Math.ceil(count.total / validLimit) };
  },

  async findFeeById(id) {
    const [rows] = await db.execute(
      `SELECT f.*, s.name, s.student_id, s.branch, s.semester, s.institute,
              COALESCE(SUM(p.amount), 0) AS paid,
              (f.total_fees - COALESCE(SUM(p.amount), 0)) AS remaining
       FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN fee_payments p ON p.fee_id = f.id
       WHERE f.id = ?
       GROUP BY f.id, s.name, s.student_id, s.branch, s.semester, s.institute`,
      [id]
    );
    return rows[0] || null;
  },

  async getPayments({ feeId, studentId, page = 1, limit = 50 }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (feeId) { where += ' AND p.fee_id = ?'; params.push(feeId); }
    if (studentId) { where += ' AND p.student_id = ?'; params.push(studentId); }
    const validPage = (Number.isInteger(page) && page > 0) ? page : 1;
    const validLimit = (Number.isInteger(limit) && limit > 0) ? Math.min(limit, 100) : 50;
    const offset = (validPage - 1) * validLimit;
    const [rows] = await db.execute(
      `SELECT p.*, f.id AS fee_id, s.name, s.student_id
       FROM fee_payments p
       LEFT JOIN fees f ON f.id = p.fee_id
       LEFT JOIN students s ON s.id = p.student_id
       ${where} ORDER BY p.payment_date DESC LIMIT ${validLimit} OFFSET ${offset}`,
      params
    );
    return rows;
  },

  // Assign a new fee to a student.
  async assignFee({ studentId, totalFees, dueDate, createdBy }) {
    const [result] = await db.execute(
      `INSERT INTO fees (student_id, total_fees, due_date, status, created_by) VALUES (?, ?, ?, 'Pending', ?)`,
      [studentId, totalFees, dueDate || null, createdBy || null]
    );
    return this.findFeeById(result.insertId);
  },

  // Record a payment (transaction: insert payment + recompute fee status).
  async recordPayment({ feeId, studentId, amount, paymentDate, method, reference, recordedBy }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [feeRows] = await conn.execute('SELECT * FROM fees WHERE id = ? FOR UPDATE', [feeId]);
      if (feeRows.length === 0) throw new Error('Fee not found');
      const fee = feeRows[0];

      const [[paidRow]] = await conn.execute(
        'SELECT COALESCE(SUM(amount), 0) AS paid FROM fee_payments WHERE fee_id = ?', [feeId]
      );
      const remaining = Number(fee.total_fees) - Number(paidRow.paid);
      if (Number(amount) > remaining) {
        throw new Error(`Payment exceeds remaining amount (${remaining.toFixed(2)})`);
      }
      if (Number(amount) <= 0) throw new Error('Payment amount must be greater than zero');

      const [result] = await conn.execute(
        `INSERT INTO fee_payments (fee_id, student_id, amount, payment_date, method, reference, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [feeId, studentId, amount, paymentDate, method || 'Cash', reference || null, recordedBy || null]
      );

      // Receipt number is derived from the actual insert id
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(result.insertId).padStart(6, '0')}`;
      await conn.execute('UPDATE fee_payments SET receipt_number = ? WHERE id = ?', [receiptNumber, result.insertId]);

      await recomputeFeeStatus(conn, feeId);
      await conn.commit();
      return { paymentId: result.insertId, receiptNumber };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Edit a payment amount/date/method (transaction: update + recompute fee status).
  async editPayment(paymentId, { amount, paymentDate, method, reference }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [payRows] = await conn.execute('SELECT * FROM fee_payments WHERE id = ? FOR UPDATE', [paymentId]);
      if (payRows.length === 0) throw new Error('Payment not found');
      const payment = payRows[0];

      // Recompute totals excluding this payment
      const [[paidRow]] = await conn.execute(
        'SELECT COALESCE(SUM(amount), 0) AS paid FROM fee_payments WHERE fee_id = ? AND id != ?',
        [payment.fee_id, paymentId]
      );
      const [[feeRow]] = await conn.execute('SELECT total_fees FROM fees WHERE id = ?', [payment.fee_id]);
      const remaining = Number(feeRow.total_fees) - Number(paidRow.paid);
      if (Number(amount) > remaining) {
        throw new Error(`Payment exceeds remaining amount (${remaining.toFixed(2)})`);
      }

      await conn.execute(
        'UPDATE fee_payments SET amount = ?, payment_date = ?, method = ?, reference = ? WHERE id = ?',
        [amount, paymentDate || payment.payment_date, method || payment.method,
          reference !== undefined ? reference : payment.reference, paymentId]
      );

      await recomputeFeeStatus(conn, payment.fee_id);
      await conn.commit();
      return { paymentId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Delete/cancel a payment (transaction: delete + recompute fee status).
  async deletePayment(paymentId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
      if (rows.length === 0) throw new Error('Payment not found');
      const payment = rows[0];
      await conn.execute('DELETE FROM fee_payments WHERE id = ?', [paymentId]);
      await recomputeFeeStatus(conn, payment.fee_id);
      await conn.commit();
      return payment;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Dashboard / report summary.
  async getSummary() {
    const [[fees]] = await db.execute('SELECT COALESCE(SUM(total_fees), 0) AS total FROM fees');
    const [[collected]] = await db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM fee_payments');
    const [[pendingFees]] = await db.execute(
      `SELECT COUNT(*) AS count FROM fees WHERE status IN ('Pending', 'Partially Paid')`
    );
    const [[pendingStudents]] = await db.execute(
      `SELECT COUNT(DISTINCT student_id) AS count FROM fees WHERE status IN ('Pending', 'Partially Paid')`
    );
    const [[recentPayments]] = await db.execute(
      `SELECT p.*, s.name, s.student_id, f.total_fees
       FROM fee_payments p
       JOIN students s ON s.id = p.student_id
       JOIN fees f ON f.id = p.fee_id
       ORDER BY p.payment_date DESC LIMIT 5`
    );

    return {
      totalFees: Number(fees.total),
      totalCollected: Number(collected.total),
      totalPending: Number(fees.total) - Number(collected.total),
      pendingFeeCount: pendingFees.count,
      pendingStudentCount: pendingStudents.count,
      recentPayments
    };
  }
};

module.exports = FeeModel;
