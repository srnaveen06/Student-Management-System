import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentForm from '../components/StudentForm/StudentForm';
import AttendanceTab from '../components/AddStudentTabs/AttendanceTab';
import FeesTab from '../components/AddStudentTabs/FeesTab';
import CoursesSubjectsTab from '../components/AddStudentTabs/CoursesSubjectsTab';
import ExamsTab from '../components/AddStudentTabs/ExamsTab';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';

const TABS = [
  { key: 'basic', label: 'Basic Info', icon: '👤' },
  { key: 'attendance', label: 'Attendance', icon: '📅' },
  { key: 'fees', label: 'Fees', icon: '💰' },
  { key: 'courses', label: 'Courses & Subjects', icon: '📚' },
  { key: 'exams', label: 'Examinations', icon: '📝' }
];

const AddStudent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  // Branch + semester come from the Basic Info tab and drive the other tabs' dropdowns
  const [fields, setFields] = useState({ branch: '', semester: '' });

  // Optional add-on sections collected from the tabs
  const [sections, setSections] = useState({
    attendance: [],
    fees: null,
    courses: [],
    subjects: [],
    examinations: []
  });

  const updateSection = (key, data) => {
    setSections(prev => ({ ...prev, [key]: data }));
  };

  // Basic Info's FormData + the optional sections, sent as one multipart request
  const handleSubmit = async (formData) => {
    formData.append('attendance', JSON.stringify(sections.attendance));
    formData.append('fees', JSON.stringify(sections.fees));
    formData.append('courses', JSON.stringify(sections.courses));
    formData.append('subjects', JSON.stringify(sections.subjects));
    formData.append('examinations', JSON.stringify(sections.examinations));

    setLoading(true);
    try {
      const response = await studentApi.create(formData);
      if (response.success) {
        toast.success('Student added successfully!');
        navigate('/students');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add student';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    formRef.current?.submitForm();
  };

  return (
    <div className="page-header" style={{ display: 'block' }}>
      <h1 className="page-title">Add Student</h1>
      <p className="page-subtitle">
        Enter the basic details, then optionally add attendance, fees, courses/subjects and examinations.
      </p>

      <div className="add-student-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`add-student-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="add-student-tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="add-student-tab-panels">
        <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
          <StudentForm
            ref={formRef}
            onSubmit={handleSubmit}
            isEditing={false}
            showButtons={false}
            onFieldsChange={(next) => setFields({ branch: next.branch, semester: next.semester })}
            onInvalid={() => setActiveTab('basic')}
          />
        </div>
        <div style={{ display: activeTab === 'attendance' ? 'block' : 'none' }}>
          <AttendanceTab
            value={sections.attendance}
            onChange={(data) => updateSection('attendance', data)}
            branch={fields.branch}
            semester={fields.semester}
          />
        </div>
        <div style={{ display: activeTab === 'fees' ? 'block' : 'none' }}>
          <FeesTab value={sections.fees} onChange={(data) => updateSection('fees', data)} />
        </div>
        <div style={{ display: activeTab === 'courses' ? 'block' : 'none' }}>
          <CoursesSubjectsTab
            value={{ courses: sections.courses, subjects: sections.subjects }}
            onChange={(data) => {
              updateSection('courses', data.courses);
              updateSection('subjects', data.subjects);
            }}
            branch={fields.branch}
            semester={fields.semester}
          />
        </div>
        <div style={{ display: activeTab === 'exams' ? 'block' : 'none' }}>
          <ExamsTab
            value={sections.examinations}
            onChange={(data) => updateSection('examinations', data)}
            branch={fields.branch}
            semester={fields.semester}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/students')}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={loading}>
          {loading ? '⏳ Saving...' : '➕ Add Student'}
        </button>
      </div>

      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(255,255,255,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="spinner" />
        </div>
      )}
    </div>
  );
};

export default AddStudent;
