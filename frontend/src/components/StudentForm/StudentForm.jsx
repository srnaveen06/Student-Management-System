import React, { useState, forwardRef, useImperativeHandle } from 'react';

const StudentForm = forwardRef(({ initialData, onSubmit, isEditing, showButtons = true, onFieldsChange, onInvalid }, ref) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Form state — holds all field values
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    gender: initialData?.gender || '',
    branch: initialData?.branch || '',
    institute: initialData?.institute || '',
    semester: initialData?.semester || '',
    dob: initialData?.dob ? initialData.dob.split('T')[0] : '',
    address: initialData?.address || '',
    status: initialData?.status || 'Active',
    image: null
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Image preview URL
  const [imagePreview, setImagePreview] = useState(
    initialData?.image ? `${API_URL}/uploads/${initialData.image}` : null
  );

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };
    setFormData(next);
    if (onFieldsChange) onFieldsChange(next);
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file upload and generate preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Only image files are allowed' }));
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'File size must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      // Create preview URL
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  // Validate all fields before submit
  const validate = () => {
    const newErrors = {};

    if (!formData.student_id.trim()) newErrors.student_id = 'Student ID is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (formData.phone.length < 10 || formData.phone.length > 15) {
      newErrors.phone = 'Phone must be 10-15 digits';
    }
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    if (!formData.institute.trim()) newErrors.institute = 'Institute is required';
    if (!formData.semester) newErrors.semester = 'Semester is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build FormData + call onSubmit (exposed via ref so a parent can submit)
  const submitForm = () => {
    if (!validate()) {
      if (onInvalid) onInvalid();
      return;
    }

    // Build FormData object for file upload
    const submitData = new FormData();
    submitData.append('student_id', formData.student_id);
    submitData.append('name', formData.name);
    submitData.append('email', formData.email);
    submitData.append('phone', formData.phone);
    submitData.append('gender', formData.gender);
    submitData.append('branch', formData.branch);
    submitData.append('institute', formData.institute);
    submitData.append('semester', formData.semester);
    submitData.append('dob', formData.dob);
    submitData.append('address', formData.address);
    submitData.append('status', formData.status);
    if (formData.image) {
      submitData.append('image', formData.image);
    }

    onSubmit(submitData);
  };

  useImperativeHandle(ref, () => ({ submitForm }));

  // Handle form submission (form <form> submit event)
  const handleSubmit = (e) => {
    e.preventDefault();
    submitForm();
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h2 className="form-title">
        {isEditing ? 'Edit Student' : 'Add New Student'}
      </h2>

      <div className="form-grid">
        {/* Student ID */}
        <div className="form-group">
          <label className="form-label">
            Student ID <span className="required">*</span>
          </label>
          <input
            type="text"
            name="student_id"
            className={`form-input ${errors.student_id ? 'error' : ''}`}
            placeholder="e.g. STU-2024-001"
            value={formData.student_id}
            onChange={handleChange}
          />
          {errors.student_id && <span className="form-error">{errors.student_id}</span>}
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">
            Full Name <span className="required">*</span>
          </label>
          <input
            type="text"
            name="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="Enter full name"
            value={formData.name}
            onChange={handleChange}
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">
            Email <span className="required">*</span>
          </label>
          <input
            type="email"
            name="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label className="form-label">
            Phone <span className="required">*</span>
          </label>
          <input
            type="text"
            name="phone"
            className={`form-input ${errors.phone ? 'error' : ''}`}
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={handleChange}
          />
          {errors.phone && <span className="form-error">{errors.phone}</span>}
        </div>

        {/* Gender */}
        <div className="form-group">
          <label className="form-label">
            Gender <span className="required">*</span>
          </label>
          <select
            name="gender"
            className={`form-select ${errors.gender ? 'error' : ''}`}
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <span className="form-error">{errors.gender}</span>}
        </div>

        {/* Branch */}
        <div className="form-group">
          <label className="form-label">
            Branch <span className="required">*</span>
          </label>
          <select
            name="branch"
            className={`form-select ${errors.branch ? 'error' : ''}`}
            value={formData.branch}
            onChange={handleChange}
          >
            <option value="">Select Branch</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Civil">Civil</option>
            <option value="Electrical">Electrical</option>
            <option value="Information Technology">Information Technology</option>
          </select>
          {errors.branch && <span className="form-error">{errors.branch}</span>}
        </div>

        {/* Institute */}
        <div className="form-group">
          <label className="form-label">
            Institute <span className="required">*</span>
          </label>
          <input
            type="text"
            name="institute"
            className={`form-input ${errors.institute ? 'error' : ''}`}
            placeholder="Enter institute name"
            value={formData.institute}
            onChange={handleChange}
          />
          {errors.institute && <span className="form-error">{errors.institute}</span>}
        </div>

        {/* Semester */}
        <div className="form-group">
          <label className="form-label">
            Semester <span className="required">*</span>
          </label>
          <select
            name="semester"
            className={`form-select ${errors.semester ? 'error' : ''}`}
            value={formData.semester}
            onChange={handleChange}
          >
            <option value="">Select Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>
          {errors.semester && <span className="form-error">{errors.semester}</span>}
        </div>

        {/* Date of Birth */}
        <div className="form-group">
          <label className="form-label">
            Date of Birth <span className="required">*</span>
          </label>
          <input
            type="date"
            name="dob"
            className={`form-input ${errors.dob ? 'error' : ''}`}
            value={formData.dob}
            onChange={handleChange}
          />
          {errors.dob && <span className="form-error">{errors.dob}</span>}
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            name="status"
            className="form-select"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Address */}
        <div className="form-group full-width">
          <label className="form-label">
            Address <span className="required">*</span>
          </label>
          <textarea
            name="address"
            className={`form-textarea ${errors.address ? 'error' : ''}`}
            placeholder="Enter full address"
            rows="3"
            value={formData.address}
            onChange={handleChange}
          />
          {errors.address && <span className="form-error">{errors.address}</span>}
        </div>

        {/* Profile Image Upload */}
        <div className="form-group full-width">
          <label className="form-label">Profile Photo</label>
          <div className="image-upload">
            <div className="image-preview">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <div className="image-preview-placeholder">
                  <span className="icon">📷</span>
                  <span>No photo</span>
                </div>
              )}
            </div>
            <div className="image-upload-btn">
              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                📁 Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Max size: 5MB. Formats: JPG, PNG, GIF
              </span>
              {errors.image && <span className="form-error">{errors.image}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      {showButtons && (
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? '💾 Update Student' : '➕ Add Student'}
          </button>
        </div>
      )}
    </form>
  );
});

export default StudentForm;
