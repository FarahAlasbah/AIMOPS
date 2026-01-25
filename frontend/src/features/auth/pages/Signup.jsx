// frontend/src/features/auth/pages/Signup.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '', // 'business_owner', 'admin', 'marketing'
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Defined Roles
  const roles = [
    { value: 'business_owner', label: 'Business Owner' },
    { value: 'admin', label: 'System Admin' },
    { value: 'marketing', label: 'Marketing Team Member' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.role) newErrors.role = 'Please select a role';

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log('Registering User:', formData);
      
      // Simulate API call and Register logic here
      // ...

      // Routing Logic based on Role
      switch (formData.role) {
        case 'business_owner':
          navigate('/owner/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'marketing':
          navigate('/marketing/dashboard');
          break;
        default:
          navigate('/dashboard'); // Fallback
      }
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        
        {/* Left Side - Branding */}
        <div className="signup-brand">
          <div className="brand-content">
            <h1 className="brand-title">Join the Future of Operations</h1>
            <p className="brand-desc">
              Create an account to access AI-powered insights, streamline your campaigns, 
              and make data-driven decisions that scale your business.
            </p>
            <div style={{ display: 'flex', gap: '12px', color: 'rgba(255,255,255,0.8)' }}>
              <CheckCircle2 size={20} />
              <span>Enterprise Security</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>
              <CheckCircle2 size={20} />
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="signup-form-side">
          <div className="signup-header">
            <h2>Create Account</h2>
            <p>Enter your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            
            {/* Name Row */}
            <div className="form-row">
              <div className="form-field">
                <label className="field-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className={`field-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>
              
              <div className="form-field">
                <label className="field-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className={`field-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            {/* Email */}
            <div className="form-field">
              <label className="field-label">Email Address</label>
              <input
                type="email"
                name="email"
                className={`field-input ${errors.email ? 'error' : ''}`}
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Role Selection */}
            <div className="form-field">
              <label className="field-label">I am a...</label>
              <select
                name="role"
                className={`field-select ${errors.role ? 'error' : ''}`}
                value={formData.role}
                onChange={handleChange}
              >
                <option value="" disabled>Select your role</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <span className="field-error">{errors.role}</span>}
            </div>

            {/* Password Row */}
            <div className="form-row">
              <div className="form-field">
                <label className="field-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`field-input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-field">
                <label className="field-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className={`field-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <button type="submit" className="signup-button">
              Create Account
            </button>
          </form>

          <div className="login-redirect">
            <p className="login-redirect-text">
              Already have an account? 
              <button onClick={() => navigate('/login')} className="login-link">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;