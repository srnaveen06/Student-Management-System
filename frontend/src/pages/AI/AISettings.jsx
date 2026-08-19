import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';
import { useAI } from '../../context/AIContext';
import { Save } from 'lucide-react';

const AISettings = () => {
  const { toast } = useToast();
  const { refreshFeatures } = useAI();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await aiApi.getSettings();
      setSettings(data.settings || {});
    } catch (error) {
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === false }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await aiApi.updateSettings(settings);
      toast.success('AI settings saved');
      await refreshFeatures();
    } catch (error) {
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoader />;

  const booleanKeys = [
    ['ai_enabled', 'AI Platform (global)', 'Master switch for all AI features.'],
    ['ai_assistant_enabled', 'CampusAI Assistant', 'Allow the chat assistant for all staff.'],
    ['ai_search_enabled', 'Natural-language Search', 'Enable AI search across student records.'],
    ['ai_insights_enabled', 'Dashboard Insights', 'Generate automatic insights from data.'],
    ['ai_risk_prediction_enabled', 'Risk Prediction', 'Enable student risk scoring and forecasts.'],
    ['ai_document_processing_enabled', 'Document Intelligence', 'Allow document extraction workflows.'],
    ['ai_logging_enabled', 'Audit Logging', 'Record every AI request in the activity log.'],
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Settings</h1>
          <p>Configure the AI-powered intelligence platform.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : <><Save size={16} /> Save Settings</>}
        </button>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-header"><h2>Feature Toggles</h2></div>
        <div className="dashboard-section-body">
          {booleanKeys.map(([key, label, desc]) => (
            <div key={key} className="recent-student" style={{ marginBottom: '8px' }}>
              <div className="recent-student-info">
                <h4>{label}</h4>
                <p>{desc}</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={settings[key] !== false} onChange={() => toggle(key)} />
                <span className="slider" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: '16px' }}>
        <div className="dashboard-section-header"><h2>Access Control</h2></div>
        <div className="dashboard-section-body">
          <div className="form-group">
            <label className="form-label">Allowed Roles (comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={settings.ai_roles || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, ai_roles: e.target.value }))}
            />
            <p className="form-hint">Which roles can access /api/ai endpoints.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Teacher Scope Branch</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Computer Science (blank = all branches)"
              value={settings.ai_teacher_scope_branch || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, ai_teacher_scope_branch: e.target.value }))}
            />
            <p className="form-hint">Optional branch restriction for teacher-scoped AI data.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
