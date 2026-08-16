import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import courseApi from '../../services/courseApi';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';

const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'True/False'];

const AIQuestions = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [examName, setExamName] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('');
  const [types, setTypes] = useState(['MCQ', 'Short Answer', 'True/False']);
  const [questions, setQuestions] = useState(null);
  const [saved, setSaved] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadSubjects = async () => {
    try {
      const res = await courseApi.getSubjects({ limit: 200 });
      setSubjects(res.data?.data || res.data || []);
    } catch (error) {
      // optional
    }
  };

  const loadSaved = async () => {
    try {
      const data = await aiApi.listQuestions(50);
      setSaved(data.questions || []);
    } catch (error) {
      // optional
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadSubjects(); loadSaved(); }, []);

  const toggleType = (t) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const generate = async () => {
    setGenerating(true);
    setQuestions(null);
    try {
      const data = await aiApi.generateQuestions({
        subjectId: subjectId ? Number(subjectId) : null,
        examName,
        count: Number(count),
        difficulty,
        types,
      });
      setQuestions(data);
      toast.success(`${data.count} questions generated as drafts`);
      loadSaved();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const renderQuestion = (q, idx) => (
    <div key={`${q.id}-${idx}`} className="ai-card ai-question-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <span className="ai-chip">{q.question_type}</span>
        <span className="ai-chip ai-chip-muted">{q.difficulty} · {q.marks} mark(s)</span>
      </div>
      <div className="ai-question-text">{idx + 1}. {q.question}</div>
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="ai-option-list">
          {q.options.map(opt => (
            <div key={opt.option} className={`ai-option ${opt.option === q.answer ? 'correct' : ''}`}>
              <strong>{opt.option}.</strong> {opt.text}
            </div>
          ))}
        </div>
      )}
      {q.answer && <div className="ai-answer"><strong>Answer:</strong> {q.answer}</div>}
      {q.explanation && <div className="ai-extract-note">{q.explanation}</div>}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Question Generator</h1>
          <p>Generate topic-based questions for any subject. Questions are saved as drafts for review.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header"><h2>Generate</h2></div>
          <div className="dashboard-section-body">
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— General Subject —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} ({s.branch} · Sem {s.semester})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exam Name (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Midterm 1"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>
            <div className="ai-form-row">
              <div className="form-group">
                <label className="form-label">Number of Questions</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty (optional)</label>
                <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="">Mixed</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Question Types</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUESTION_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`ai-suggestion-chip ${types.includes(t) ? 'active' : ''}`}
                    onClick={() => toggleType(t)}
                    style={types.includes(t) ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : '✨ Generate Questions'}
            </button>
          </div>
        </div>

        <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
          <div className="dashboard-section-header"><h2>Generated Questions</h2></div>
          <div className="dashboard-section-body">
            {questions ? (
              <div className="ai-grid">
                {questions.questions.map((q, i) => renderQuestion(q, i))}
              </div>
            ) : (
              <p className="muted-center">Configure and generate questions for a subject.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '16px' }}>
        <div className="dashboard-section-header"><h2>Saved Drafts</h2></div>
        <div className="dashboard-section-body">
          {loadingList ? <InlineLoader /> : saved.length === 0 ? (
            <p className="muted-center">No saved questions yet</p>
          ) : (
            <div className="ai-grid">
              {saved.map(q => (
                <div key={q.id} className="ai-card ai-question-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span className="ai-chip">{q.question_type}</span>
                    <span className="ai-chip ai-chip-warning">{q.status}</span>
                  </div>
                  <div className="ai-question-text">{q.question}</div>
                  <div className="ai-msg-meta">
                    <span>{q.subject_name || 'General'}</span>
                    {q.exam_name && <span>· {q.exam_name}</span>}
                    <span>· {q.difficulty}</span>
                    <span>· {formatDateTime(q.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuestions;
