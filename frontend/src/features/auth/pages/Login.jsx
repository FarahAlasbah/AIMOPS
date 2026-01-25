// frontend/src/features/auth/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  BarChart3, 
  Megaphone, 
  MessageSquare, 
  TrendingUp,
  LayoutDashboard 
} from 'lucide-react'; // Make sure you have lucide-react installed
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Login data:', formData);
      navigate('/admin/overview');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        
        {/* Left Side - Branding */}
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <LayoutDashboard size={28} />
              </div>
              <h1 className="brand-name">AIMOPS</h1>
            </div>
            
            <p className="brand-tagline">
              Orchestrate your marketing operations with AI-driven precision and intelligent insights.
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <span className="feature-text">Demand Forecasting</span>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <Megaphone size={20} />
                </div>
                <span className="feature-text">Campaign Management</span>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <MessageSquare size={20} />
                </div>
                <span className="feature-text">Feedback Analysis</span>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <span className="feature-text">Smart Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Please enter your details to sign in</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {/* Email Field */}
              <div className="form-field">
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`field-input ${errors.email ? 'error' : ''}`}
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Password Field */}
              <div className="form-field">
                <label htmlFor="password" className="field-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className={`field-input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/* Options */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="forgot-password-link">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-button">
                Sign In
              </button>

              <div className="signup-area">
                <p className="signup-text">
                  Don't have an account? 
                  <button type="button" className="signup-link" onClick={() => navigate('/signup')}>Sign up</button>
                </p>
              </div>
            </form>

            <div className="login-footer">
              <p>&copy; 2025 AIMOPS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;