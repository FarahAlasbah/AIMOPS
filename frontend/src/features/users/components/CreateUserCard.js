import { useState } from 'react';
import { Card, Button, FormActions, InfoMessage } from '../../../shared/components';

const defaultForm = {
  username: '',
  email: '',
  password: '',
  full_name: '',
  role_id: 2,
};

const roleOptions = [
  { value: 2, label: 'Marketing User' },
  { value: 3, label: 'Business Owner' },
];

const CreateUserCard = ({ apiError, onCancel, onCreate, isSubmitting }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    const value = field === 'role_id' ? parseInt(e.target.value) : e.target.value;

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.full_name) newErrors.full_name = 'Full name is required';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onCreate(formData);

    // reset after success
    setFormData(defaultForm);
    setErrors({});
  };

  const cancel = () => {
    setFormData(defaultForm);
    setErrors({});
    onCancel();
  };

  return (
    <Card title="Create New User">
      {apiError && <InfoMessage type="error">{apiError}</InfoMessage>}

      <form onSubmit={submit} autoComplete="on">
        <div className="form-group">
          <label htmlFor="create-username" className="form-label">
            Username <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            id="create-username"
            name="username"
            autoComplete="username"
            className={`field-input ${errors.username ? 'error' : ''}`}
            placeholder="Enter username (e.g., farah_business_owner)"
            value={formData.username}
            onChange={handleChange('username')}
            required
            disabled={isSubmitting}
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-email" className="form-label">
            Email <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="email"
            id="create-email"
            name="email"
            autoComplete="email"
            className={`field-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter email (e.g., farah@aimops.com)"
            value={formData.email}
            onChange={handleChange('email')}
            required
            disabled={isSubmitting}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-fullname" className="form-label">
            Full Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            id="create-fullname"
            name="full_name"
            autoComplete="name"
            className={`field-input ${errors.full_name ? 'error' : ''}`}
            placeholder="Enter full name (e.g., Farah Business)"
            value={formData.full_name}
            onChange={handleChange('full_name')}
            required
            disabled={isSubmitting}
          />
          {errors.full_name && <span className="field-error">{errors.full_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-password" className="form-label">
            Password <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="password"
            id="create-password"
            name="password"
            autoComplete="new-password"
            className={`field-input ${errors.password ? 'error' : ''}`}
            placeholder="Enter password (min. 6 characters)"
            value={formData.password}
            onChange={handleChange('password')}
            required
            disabled={isSubmitting}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-role" className="form-label">
            Role <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="create-role"
            name="role_id"
            autoComplete="off"
            className="field-input field-select"
            value={formData.role_id}
            onChange={handleChange('role_id')}
            required
            disabled={isSubmitting}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="role-info-box">
          <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
            <strong>Role Information:</strong>
            <br />
            • <strong>Marketing User (ID: 2)</strong> - Can create campaigns, upload data, and run forecasts
            <br />
            • <strong>Business Owner (ID: 3)</strong> - View-only access to dashboards and reports
          </p>
        </div>

        <FormActions>
          <Button variant="secondary" type="button" onClick={cancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
};

export default CreateUserCard;
