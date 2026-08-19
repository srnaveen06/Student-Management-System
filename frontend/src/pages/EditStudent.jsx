import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StudentForm from '../components/StudentForm/StudentForm';
import AttendanceTab from '../components/AddStudentTabs/AttendanceTab';
import FeesTab from '../components/AddStudentTabs/FeesTab';
import CoursesSubjectsTab from '../components/AddStudentTabs/CoursesSubjectsTab';
import ExamsTab from '../components/AddStudentTabs/ExamsTab';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { InlineLoader } from '../components/Loader/Loader';
import { User, CalendarDays, CreditCard, FileText, Clock, Save } from 'lucide-react';

const TABS = [
  { key: 'basic', label: 'Basic Info', icon: <User size={16} /> },
  { key: 'attendance', label: 'Attendance', icon: <CalendarDays size={16} /> },
  { key: 'fees', label: 'Fees', icon: <CreditCard size={16} /> },
  { key: 'courses', label: 'Courses & Subjects', icon: <FileText size={16} /> },
  { key: 'exams', label: 'Examinations', icon: <Clock size={16} /> }
];

const EditStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const formRef = useRef(null);

  const [fields, setFields] = useState({ branch: '', semester: '' });

  const [sections, setSections] = useState({
    attendance: [],
    fees: null,
    courses: [],
    subjects: [],
    examinations: []
  });

  // Fetch the full profile (basic info + existing sections) on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await studentApi.getProfile(id);
        if (response.success) {
          const data = response.data;
          setStudent(data);
          setFields({ branch: data.branch || '', semester: data.semester || '' });
          setSections({
            attendance: data.attendance?.records || [],
            fees: data.fees?.items?.[0]
              ? {
                  total_fees: data.fees.items[0].total_fees,
                  due_date: data.fees.items[0].due_date,
                  initial_payment: 0
                }
              : null,
            courses: (data.courses || []).map(c => ({ course_id: c.id })),
            subjects: (data.subjects || []).map(s => ({ subject_id: s.id })),
            examinations: (data.marks || []).map(m => ({
              exam_id: m.examination_id,
              internal_marks: m.internal_marks,
              external_marks: m.external_marks,
              practical_marks: m.practical_marks,
              assignment_marks: m.assignment_marks
            }))
          });
        } else {
          toast.error('Student not found');
          navigate('/students');
        }
      } catch (error) {
        toast.error('Failed to load student data');
        navigate('/students');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, navigate, toast]);

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

    setSaving(true);
    try {
      const response = await studentApi.update(id, formData);
      if (response.success) {
        toast.success('Student updated successfully!');
        navigate('/students');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update student';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    formRef.current?.submitForm();
  };

  if (loading) return <InlineLoader />;

  return (
    <div className="page-header" style={{ display: 'block' }}>
      <h1 className="page-title">Edit Student</h1>
      <p className="page-subtitle">
        Update the basic details, then optionally edit attendance, fees, courses/subjects and examinations.
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
            initialData={student}
            onSubmit={handleSubmit}
            isEditing={true}
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
            editMode={true}
          />
        </div>
        <div style={{ display: activeTab === 'fees' ? 'block' : 'none' }}>
          <FeesTab
            value={sections.fees}
            onChange={(data) => updateSection('fees', data)}
            editMode={true}
          />
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
        <button type="button" className="btn btn-primary" onClick={handleSaveClick} disabled={saving}>
          {saving ? <><Clock size={16} /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {saving && (
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

export default EditStudent;
