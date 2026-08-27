import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, KeyRound, Clock, Camera, X } from 'lucide-react';
import Modal from '../Modal/Modal';
import authApi from '../../services/authApi';
import { getCurrentUser, setCurrentUser, getAssetUrl } from '../../utils/auth';
import { useToast } from '../../context/ToastContext';

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', teacher: 'Teacher', accountant: 'Accountant' };

const ProfileModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const admin = getCurrentUser();

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ name: '', email: '', username: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: admin?.name || admin?.username || '',
        email: admin?.email || '',
        username: admin?.username || ''
      });
      setImage(null);
      setImagePreview(null);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!admin) return null;

  const userInitials = admin.name
    ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (admin.username || 'A').slice(0, 2).toUpperCase();

  const currentAvatar = imagePreview || getAssetUrl(admin?.image);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
      toast.error('Only image files are allowed (jpeg, jpg, png, gif, webp)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!form.username || !/^[a-zA-Z0-9_.-]{3,50}$/.test(form.username.trim())) {
      nextErrors.username = 'Username must be 3-50 characters using letters, numbers, "_", "." or "-"';
    }
    if (!form.name || !form.name.trim()) {
      nextErrors.name = 'Name is required';
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'A valid email is required';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      let latest = admin;

      if (image) {
        const fd = new FormData();
        fd.append('image', image);
        const imgRes = await authApi.uploadProfileImage(fd);
        if (!imgRes.success) throw new Error(imgRes.message);
        latest = { ...latest, ...imgRes.data.admin };
      }

      const res = await authApi.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim()
      });

      if (res.success) {
        latest = { ...latest, ...res.data.admin };
        setCurrentUser(latest);
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        toast.success(res.message || 'Profile updated successfully');
        onClose();
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      footer={
        <button
          type="submit"
          form="profile-form"
          className="btn btn-primary"
          disabled={loading}
          style={{ justifyContent: 'center' }}
        >
          {loading ? <><Clock size={16} /> Saving...</> : 'Save Changes'}
        </button>
      }
    >
      <div className="profile-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="profile-avatar profile-avatar-upload">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={admin.name || admin.username}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span>{userInitials}</span>
          )}
          <button
            type="button"
            className="profile-avatar-upload-btn"
            title="Change profile picture"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={16} />
          </button>
          {image && (
            <button
              type="button"
              className="profile-avatar-upload-remove"
              title="Remove selected picture"
              onClick={clearImage}
            >
              <X size={12} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <div className="profile-info">
          <h3>{admin.name || admin.username}</h3>
          <p>{ROLE_LABELS[admin.role] || 'Administrator'}</p>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label className="form-label">
            <User size={14} /> Username
          </label>
          <input
            name="username"
            className={`form-input ${errors.username ? 'error' : ''}`}
            placeholder="Enter your username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
          />
          {errors.username && <span className="form-error">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">
            <Mail size={14} /> Name
          </label>
          <input
            name="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">
            <Shield size={14} /> Email
          </label>
          <input
            name="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your email address"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">
            <KeyRound size={14} /> Role
          </label>
          <input className="form-input" value={ROLE_LABELS[admin.role] || admin.role || 'Administrator'} disabled />
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;