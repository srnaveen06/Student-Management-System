import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StudentForm from '../components/StudentForm/StudentForm';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';
import { InlineLoader } from '../components/Loader/Loader';

const EditStudent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch student data by ID on mount
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await studentApi.getById(id);
        if (response.success) {
          setStudent(response.data);
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
    fetchStudent();
  }, [id, navigate, toast]);

  // Handle form submission
  const handleSubmit = async (formData) => {
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  if (loading) return <InlineLoader />;

  return (
    <div className="page-header" style={{ display: 'block' }}>
      <StudentForm
        initialData={student}
        onSubmit={handleSubmit}
        isEditing={true}
      />
      {submitting && (
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
