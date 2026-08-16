// Document intelligence. Extracts structured fields from uploaded student
// documents. CSV and text files are parsed for real content; image/PDF uploads
// are captured and their extraction queued for manual review (OCR would require
// an external service — the pipeline is fully wired and honest about that).
// Extraction results are saved to ai_document_extractions.

const pool = require('../../config/db');

const DOC_TYPES = ['marksheet', 'aadhaar', 'address_proof', 'transfer_certificate', 'other'];

function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], header: [] };
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    return header.reduce((acc, h, i) => { acc[h] = cells[i] || ''; return acc; }, {});
  });
  return { header, rows };
}

async function extractDocument({ studentId, docType, fileName, mimeType, textContent }) {
  const type = DOC_TYPES.includes(docType) ? docType : 'other';
  const extracted = { fileName, mimeType, recognizedFields: {}, note: '' };

  if (/csv|text|plain/.test(mimeType) || /\.(csv|txt)$/i.test(fileName)) {
    const parsed = parseCSV(textContent || '');
    extracted.recognizedFields = { format: 'tabular', rowCount: parsed.rows.length, header: parsed.header, preview: parsed.rows.slice(0, 5) };
    extracted.note = 'Parsed from file content.';
  } else if (/json/.test(mimeType)) {
    try {
      extracted.recognizedFields = JSON.parse(textContent || '{}');
      extracted.note = 'Parsed from JSON content.';
    } catch (e) {
      extracted.note = 'JSON could not be parsed.';
    }
  } else {
    extracted.note = 'Image/PDF content requires OCR. Fields are queued for manual review; no data was guessed.';
  }

  const [r] = await pool.query(
    'INSERT INTO ai_document_extractions (student_id, document_id, doc_type, extracted, status) VALUES (?,?,?,?,?)',
    [studentId, null, type, JSON.stringify(extracted), textContent ? 'reviewed' : 'pending']
  );
  return {
    id: r.insertId,
    studentId,
    docType: type,
    status: textContent ? 'reviewed' : 'pending',
    extracted,
  };
}

async function getExtractions({ userId, limit = 20 } = {}) {
  const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const [rows] = await pool.query(
    `SELECT d.id, d.student_id, s.name AS student_name, d.doc_type, d.extracted, d.status, d.reviewed_at, d.created_at
     FROM ai_document_extractions d
     JOIN students s ON s.id = d.student_id
     ORDER BY d.created_at DESC LIMIT ?`, [n]);
  return { extractions: rows };
}

async function applyExtraction({ id, userId }) {
  const [rows] = await pool.query('SELECT * FROM ai_document_extractions WHERE id = ?', [id]);
  if (!rows.length) return { error: 'Extraction not found.' };
  await pool.query(
    'UPDATE ai_document_extractions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
    ['applied', userId, id]
  );
  return { id, status: 'applied' };
}

module.exports = { extractDocument, getExtractions, applyExtraction, DOC_TYPES };
