// Renders tool results into readable natural-language answers for the LOCAL
// provider. Every number shown comes from real query results — nothing is
// fabricated.

const currency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function truncate(s, n = 140) {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

function render(intent, results, query) {
  const first = (arr) => (Array.isArray(arr) ? arr : [])[0];
  switch (intent) {
    case 'count_students': {
      const r = first(results);
      const total = r ? r.total : 0;
      let filters = '';
      if (r) {
        if (r.branch) filters += ` in ${r.branch}`;
        if (r.semester) filters += ` Semester ${r.semester}`;
        if (r.feeStatus) filters += ` (fees: ${r.feeStatus})`;
      }
      return `There are **${total} student${total === 1 ? '' : 's'}**${filters} matching that search.`;
    }
    case 'search_students': {
      const r = first(results);
      if (!r || !r.students || !r.students.length) {
        return `No students match that search. Try different filters such as a branch, semester, attendance or fee status.`;
      }
      const lines = r.students.slice(0, 10).map(s =>
        `• ${s.name} — ${s.branch} Sem ${s.semester}, CGPA ${s.cgpa != null ? s.cgpa : '—'}, ${s.status}`
      );
      const more = r.total > 10 ? `\n\n…and ${r.total - 10} more.` : '';
      return `Here ${r.students.length === 1 ? 'is the student' : `are **${r.total} students**`}:\n${lines.join('\n')}${more}`;
    }
    case 'attendance_alerts': {
      const r = first(results);
      if (!r || !r.students.length) return `No students have attendance below **${r ? r.threshold : 75}%**. ✅`;
      const lines = r.students.map(s => `• ${s.name} (${s.branch}, Sem ${s.semester}) — ${s.attendance}%`).join('\n');
      return `⚠️ **${r.students.length} student${r.students.length === 1 ? '' : 's'}** have attendance below ${r.threshold}%:\n${lines}`;
    }
    case 'fee_alerts': {
      const r = first(results);
      if (!r || !r.students.length) return `No students have outstanding fees. ✅`;
      const lines = r.students.map(s => `• ${s.name} (${s.branch}, Sem ${s.semester}) — ${s.status}, ${currency(s.outstanding)} due`).join('\n');
      return `💳 **${r.students.length} student${r.students.length === 1 ? '' : 's'}** have pending or partially paid fees:\n${lines}`;
    }
    case 'branch_compare': {
      const r = first(results);
      if (!r || !r.branches || !r.branches.length) return `No branch statistics available.`;
      const sorted = [...r.branches].sort((a, b) => (b.avgCgpa || 0) - (a.avgCgpa || 0));
      const best = sorted[0];
      const lines = sorted.map(b =>
        `• ${b.branch}: ${b.total} student${b.total === 1 ? '' : 's'}, avg CGPA ${b.avgCgpa != null ? b.avgCgpa : '—'}, attendance ${b.averageAttendance}%, fees outstanding ${currency(b.outstandingFees)}`
      ).join('\n');
      return `📊 **${best.branch}** leads with the highest average CGPA (${best.avgCgpa}).\n\n${lines}`;
    }
    case 'academic_stats': {
      const r = first(results);
      if (!r || !r.subjects || !r.subjects.length) return `No academic performance data available.`;
      const lines = r.subjects.map(s =>
        `• ${s.subjectName} — ${s.examName}: avg ${s.averagePercentage}%, pass rate ${s.passRate}%`
      ).join('\n');
      return `📈 Class average is **${r.classAverage}%**.\n\n${lines}`;
    }
    case 'risk_query': {
      const r = first(results);
      if (!r || !r.students || !r.students.length) {
        return `No students match that risk search.`;
      }
      const names = r.students.slice(0, 5).map(s => s.name).join(', ');
      return `🔍 Found **${r.total}** student${r.total === 1 ? '' : 's'} matching your risk criteria: ${names}. Ask me for a detailed risk analysis for a specific student, e.g. *"risk analysis for ${truncate(r.students[0].name)}"*.`;
    }
    case 'overview':
    default: {
      const r = first(results);
      if (!r) return `I could not retrieve the overview. Please try again.`;
      return [
        `📚 **${r.totalStudents} students** enrolled, **${r.activeStudents}** active across ${r.branchDistribution.length} branches.`,
        `Average attendance **${r.averageAttendance}%**, outstanding fees ${currency(r.outstandingFees)}.`,
        `\nAsk me things like *"how many CSE students?"*, *"who has attendance below 75%?"*, or *"students with pending fees"*.`,
      ].join('\n');
    }
  }
}

module.exports = { render, truncate, currency };
