import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentForm from '../components/StudentForm/StudentForm';
import studentApi from '../services/studentApi';
import { useToast } from '../context/ToastContext';

const AddStudent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Handle form submission — send data to API
  const handleSubmit = async (formData) => {
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

  return (
    <div className="page-header" style={{ display: 'block' }}>
      <StudentForm
        onSubmit={handleSubmit}
        isEditing={false}
      />
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
